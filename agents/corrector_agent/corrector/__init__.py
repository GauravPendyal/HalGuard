"""HalluciGuard Corrector Agent — Phase 2 production implementation package.

Public entry points:
    CorrectorAgent(config).correct(request) -> CorrectionResult
    run_correction(request, config=None)    -> CorrectionResult

Canonical boundary (from ``orchestration/schemas.py``):
    CorrectionRequest  ->  Corrector  ->  CorrectionResult

STEP 6 STATUS — Corrector execution integration:
    ``correct`` now runs the real internal pipeline end to end:

        CorrectionRequest
          -> to_internal_request        (Step 1 canonical boundary)
          -> ground_request             (Steps 2-3 targeting + evidence binding)
          -> generate_corrections       (Step 4 model generation, ONE ModelClient)
          -> resolve_generation         (Step 5 validation + bounded retry)
          -> reconstruct                (Step 6 deterministic offset splice)
          -> existing CorrectionResult builders (adapter.py)

    A SINGLE :class:`ModelClient` instance is shared by generation and retry, so
    the model is never reloaded for a retry. The no-silent-fallback rule from
    Step 4 is preserved: an unavailable model yields a degraded/unvalidated result
    with the original response unchanged — never a fabricated correction and never
    the base model. Reconstruction is fail-closed: any integrity breach preserves
    the original verbatim. No corrected text ever reaches the result unless it came
    from an ACCEPTED Step 5 resolution.

    The internal models below remain internal; ``orchestration/schemas.py`` stays
    the sole inter-agent contract.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Union

from orchestration.schemas import CorrectionRequest, CorrectionResult

from .adapter import (
    CorrectionInputError,
    build_completed_result,
    build_failed_result,
    build_model_unavailable_result,
    build_partial_result,
    build_reconstruction_fallback_result,
    build_unresolved_result,
    to_internal_request,
)
from .config import CorrectorConfig
from .contracts import (
    ChangedClaim,
    GenerationOutcome,
    GroundedPlan,
    InternalCorrectionRequest,
    ValidationOutcome,
)
from .evidence import ground_request
from .model_client import Generator, ModelClient, generate_corrections
from .reconstruction import Reconstruction, reconstruct

# Step 5 entry points, re-exported for discoverability.
from .validation import (
    EntailmentScorer,
    NullEntailmentScorer,
    validate_candidate,
)
from .retry import resolve_generation, resolve_target

__all__ = [
    "CorrectorAgent",
    "run_correction",
    "CorrectorConfig",
    # Step 4/5/6 seams, re-exported so callers and tests share one source.
    "Generator",
    "ModelClient",
    "generate_corrections",
    "validate_candidate",
    "resolve_generation",
    "resolve_target",
    "reconstruct",
    "Reconstruction",
    "EntailmentScorer",
    "NullEntailmentScorer",
]

RequestLike = Union[CorrectionRequest, Dict[str, Any]]


def _safe_extract_original(request: RequestLike) -> str:
    """Best-effort recovery of the original response for fail-safe results."""
    if isinstance(request, CorrectionRequest):
        return request.original_response
    if isinstance(request, dict):
        value = request.get("original_response", "")
        return value if isinstance(value, str) else str(value)
    return ""


def _accepted_changed_claims(outcome: ValidationOutcome) -> List[ChangedClaim]:
    """One ``changed_claims`` entry per authorized claim actually corrected.

    Values are copied verbatim from the ACCEPTED resolution — the corrected text,
    the evidence ids taken from the render manifest, and the real attempt count.
    Nothing here is fabricated; a claim appears only if its target was accepted.
    """
    changed: List[ChangedClaim] = []
    for resolution in outcome.accepted:
        claim_ids = list(resolution.claim_ids) or [""]
        for claim_id in claim_ids:
            changed.append(
                ChangedClaim(
                    claim_id=claim_id,
                    action="corrected",
                    original=resolution.original_text,
                    corrected=resolution.accepted_text,
                    evidence_ids_used=list(resolution.evidence_ids_used),
                    attempts=resolution.attempt_count,
                    reasons=[],
                )
            )
    return changed


def _unresolved_changed_claims(outcome: ValidationOutcome) -> List[ChangedClaim]:
    """Honest diagnostics for targets that were NOT corrected.

    ``corrected`` is always empty — the original sentence is preserved and no
    Corrector-authored text exists. ``reasons`` carries the real Step 5 failure
    codes (or none, for an abstention). This is diagnostic, never a fabricated
    correction.
    """
    diagnostics: List[ChangedClaim] = []
    for resolution in outcome.unresolved_targets:
        diagnostics.append(
            ChangedClaim(
                claim_id=(resolution.claim_ids[0] if resolution.claim_ids else ""),
                action="abstained" if resolution.abstained else "unresolved",
                original=resolution.original_text,
                corrected="",
                evidence_ids_used=list(resolution.evidence_ids_used),
                attempts=resolution.attempt_count,
                reasons=list(dict.fromkeys(resolution.final_failure_codes)),
            )
        )
    return diagnostics


class CorrectorAgent:
    """Corrector entry point. Accepts a canonical ``CorrectionRequest`` (or a
    dict that validates against it) and returns a canonical ``CorrectionResult``.

    A ``generator`` and/or ``scorer`` may be injected for testing and integration
    without loading the fine-tuned model from disk. In production both are None:
    the agent constructs a real :class:`ModelClient`, which enforces the
    no-silent-fallback rule.
    """

    def __init__(
        self,
        config: Optional[CorrectorConfig] = None,
        *,
        generator: Optional[Generator] = None,
        scorer: Optional[EntailmentScorer] = None,
    ) -> None:
        self.config = config or CorrectorConfig()
        self._generator = generator
        self._scorer = scorer

    def correct(self, request: RequestLike) -> CorrectionResult:
        """Execute the correction pipeline and return a canonical CorrectionResult."""
        # 1) Canonical input boundary. Never raise across the boundary.
        try:
            internal = to_internal_request(request)
        except CorrectionInputError as exc:
            original = _safe_extract_original(request)
            return build_failed_result(
                original, f"invalid_correction_request: {exc}"
            )

        original = internal.original_response
        try:
            return self._run_pipeline(internal, original)
        except Exception as exc:  # noqa: BLE001 - the boundary must never raise
            # Defense in depth: every component below is designed to fail closed
            # and not raise, but the canonical contract guarantees no exception
            # crosses the boundary. Any surprise preserves the original.
            return build_failed_result(
                original, f"correction_pipeline_error: {type(exc).__name__}: {exc}"
            )

    # -- internal pipeline ---------------------------------------------------

    def _run_pipeline(
        self, internal: InternalCorrectionRequest, original: str
    ) -> CorrectionResult:
        # 2) Steps 2-3: locate authorized claims and bind only their supporting
        #    evidence. No grounded target -> nothing to safely correct.
        plan: GroundedPlan = ground_request(internal, self.config)
        if not plan.has_targets:
            res = build_unresolved_result(original)
            _instrument_pipeline(internal, plan, None, None, None, res, self._generator, self.config)
            return res

        # 3) Step 4: build prompts and generate, using ONE ModelClient instance.
        client = ModelClient(self.config, generator=self._generator)
        generation = generate_corrections(
            internal, plan, config=self.config, client=client
        )

        # 4) Step 5: validate + bounded retry. The SAME client is the retry
        #    source, so the model is never reloaded. resolve_generation ignores
        #    the source when the model is unavailable, so passing it is safe.
        outcome: ValidationOutcome = resolve_generation(
            plan=plan,
            outcome=generation,
            source=client,
            config=self.config,
            scorer=self._scorer,
            query_text=internal.user_query,
        )

        # 5) No-silent-fallback: an unavailable model is degraded/unvalidated with
        #    the original preserved — never the base model, never a correction.
        if not outcome.model_status.available:
            res = build_model_unavailable_result(
                original, reason=outcome.model_status.reason or "model_unavailable"
            )
            _instrument_pipeline(internal, plan, generation, outcome, None, res, self._generator, self.config)
            return res

        # 6) Nothing safely accepted (all rejected / unresolved / abstained) ->
        #    original preserved as terminated_unresolved. Abstention lands here:
        #    it is never completed or valid.
        if not outcome.has_accepted:
            res = build_unresolved_result(
                original,
                changed_claims=_unresolved_changed_claims(outcome) or None,
                attempt_count=outcome.attempt_count,
            )
            _instrument_pipeline(internal, plan, generation, outcome, None, res, self._generator, self.config)
            return res

        # 7) Step 6: deterministic offset splice of ONLY accepted sentences.
        #    Any integrity breach preserves the original verbatim (fail closed).
        rebuilt: Reconstruction = reconstruct(original, plan, outcome)
        if not rebuilt.ok:
            res = build_reconstruction_fallback_result(original)
            _instrument_pipeline(internal, plan, generation, outcome, rebuilt, res, self._generator, self.config)
            return res

        # 8) Map to the canonical result. Fully resolved (every grounded target
        #    accepted and no authorized claim skipped) is completed/valid;
        #    anything less is degraded/warning with the accepted subset applied.
        changed = _accepted_changed_claims(outcome)
        fully_resolved = (
            len(outcome.accepted) == len(plan.grounded_targets)
            and not plan.skipped_claims
        )
        if fully_resolved:
            res = build_completed_result(
                original, rebuilt.text, changed, attempt_count=outcome.attempt_count
            )
        else:
            res = build_partial_result(
                original, rebuilt.text, changed, attempt_count=outcome.attempt_count
            )
        _instrument_pipeline(internal, plan, generation, outcome, rebuilt, res, self._generator, self.config)
        return res


def _instrument_pipeline(
    internal: InternalCorrectionRequest,
    plan: Optional[GroundedPlan],
    generation: Optional[GenerationOutcome],
    outcome: Optional[ValidationOutcome],
    rebuilt: Optional[Reconstruction],
    result: CorrectionResult,
    generator: Optional[Generator],
    config: CorrectorConfig,
) -> None:
    """Live instrumentation and audit logger for Corrector execution path."""
    if os.environ.get("HG_CORRECTOR_INSTRUMENT", "1").strip().lower() not in ("1", "true", "yes", "on"):
        return

    try:
        logger = logging.getLogger("halluciguard.corrector")
        lines = [
            "\n" + "=" * 80,
            "[AGENT] CORRECTOR AGENT — RUNTIME TRACE & INSTRUMENTATION",
            "=" * 80,
            "1. EXACT CORRECTOR INPUT PAYLOAD (Secrets Redacted):",
            f"   • User Query: {internal.user_query}",
            f"   • Original Response: \"{internal.original_response}\"",
            f"   • Claims to Correct ({len(internal.claims_to_correct)}):",
        ]
        for c in internal.claims_to_correct:
            ev_summary = [f"[{e.evidence_id}: {e.snippet[:60]}...]" for e in c.evidence]
            c_txt = getattr(c, "claim_text", getattr(c, "text", ""))
            lines.append(f"     - [{c.claim_id}] \"{c_txt}\" (Evidence: {ev_summary})")
        lines.append(f"   • Claims to Preserve ({len(internal.claims_to_preserve)}):")
        for c in internal.claims_to_preserve:
            c_txt = getattr(c, "claim_text", getattr(c, "text", ""))
            lines.append(f"     - [{c.claim_id}] \"{c_txt}\"")
        lines.append(f"   • Trusted Evidence ({len(internal.trusted_evidence)} items):")
        for e in internal.trusted_evidence:
            lines.append(f"     - [{e.evidence_id}] ({e.source}): \"{e.snippet[:80]}...\"")
        lines.append(f"   • Contradictory Evidence ({len(internal.contradictory_evidence)} items):")
        for e in internal.contradictory_evidence:
            lines.append(f"     - [{e.evidence_id}] ({e.source}): \"{e.snippet[:80]}...\"")
        lines.append(f"   • Correction Instructions: {internal.correction_instructions}")

        lines.append("\n2. CORRECTION PLAN GENERATED:")
        if plan:
            lines.append(f"   • Spans Detected ({len(plan.spans)}): {[s.sentence_id for s in plan.spans]}")
            lines.append(f"   • Grounded Targets ({len(plan.grounded_targets)}):")
            for gt in plan.grounded_targets:
                lines.append(f"     - Target [{gt.sentence_id}]: \"{gt.target.original_text}\"")
                lines.append(f"       Supporting Evidence IDs: {[e.evidence_id for e in gt.supporting]}")
            lines.append(f"   • Skipped Claims ({len(plan.skipped_claims)}):")
            for sc in plan.skipped_claims:
                lines.append(f"     - Claim [{sc.claim_id}] skipped: reason={sc.reason} ({sc.detail})")
        else:
            lines.append("   • No plan generated.")

        lines.append("\n3. PROMPT SENT TO MODEL:")
        if generation and generation.prompts:
            for p in generation.prompts:
                lines.append(f"   --- Prompt for Target [{p.sentence_id}] ---")
                lines.append(f"   [System Text]:\n{p.system_text}")
                lines.append(f"   [Prompt Text]:\n{p.prompt_text}")
        else:
            lines.append("   • No prompt generated.")

        lines.append("\n4. MODEL PROVIDER / MODEL NAME:")
        if generator:
            p_name = getattr(generator, "provider_name", getattr(generator, "kind", type(generator).__name__))
            m_name = getattr(generator, "model", "custom")
            lines.append(f"   • Provider: {p_name}")
            lines.append(f"   • Model:    {m_name}")
        elif generation and generation.model_status:
            lines.append(f"   • Provider: local_pytorch ({generation.model_status.kind})")
            lines.append(f"   • Model:    {config.base_model_name}")
        else:
            lines.append("   • Provider: unknown / not loaded")

        lines.append("\n5. HTTP/API STATUS:")
        if generator and hasattr(generator, "last_status") and generator.last_status:
            lines.append(f"   • HTTP/API Status: {generator.last_status}")
        elif generator:
            lines.append("   • HTTP/API Status: N/A (External Generator)")
        else:
            lines.append("   • HTTP/API Status: N/A (Local PyTorch In-Memory Inference)")

        lines.append("\n6. RAW MODEL RESPONSE BEFORE PARSING:")
        if generation and generation.candidates:
            for idx, cand in enumerate(generation.candidates, 1):
                raw = cand.raw_output if cand.raw_output else f"<Empty/Error: {cand.rejection_reason}>"
                lines.append(f"   --- Candidate #{idx} Raw ---:\n{raw}")
        else:
            lines.append("   • No candidate outputs generated.")

        lines.append("\n7. PARSED CORRECTION:")
        if generation and generation.candidates:
            for idx, cand in enumerate(generation.candidates, 1):
                lines.append(f"   --- Candidate #{idx} Parsed ---:")
                lines.append(f"   • Status:           {cand.status}")
                lines.append(f"   • Corrected Text:   \"{cand.corrected_text}\"")
                lines.append(f"   • Rejection Reason: {cand.rejection_reason or 'None'}")
                lines.append(f"   • Evidence Used:    {cand.evidence_ids_used}")
        else:
            lines.append("   • None.")

        lines.append("\n8. VALIDATOR RESULT & REASON:")
        if outcome and (outcome.accepted or outcome.unresolved_targets):
            for tr in (*outcome.accepted, *outcome.unresolved_targets):
                lines.append(f"   --- Target [{tr.sentence_id}] Decision: {tr.decision} ---")
                lines.append(f"   • Attempts: {tr.attempt_count}")
                for a in tr.attempts:
                    lines.append(f"     - Attempt #{a.attempt_number}: passed={a.validation.passed}, failures={a.validation.failure_codes}, align_score={a.validation.evidence_alignment_score:.3f}")
        else:
            lines.append("   • No validation targets evaluated.")

        lines.append("\n9. FALLBACK-TO-ORIGINAL ACTIVATION:")
        is_fallback = (result.corrected_text == result.original_text)
        lines.append(f"   • Fallback to Original Activated: {is_fallback}")
        if is_fallback:
            lines.append(f"   • Fallback Reason: status={result.status}, validation_status={result.validation_status}")
        else:
            lines.append(f"   • Correction Applied: status={result.status}, validation_status={result.validation_status}")

        lines.append("\n10. FINAL RECONSTRUCTED ANSWER:")
        lines.append(f"   \"{result.corrected_text}\"")
        lines.append("=" * 80 + "\n")

        output_str = "\n".join(lines)
        logger.info(output_str)
        print(output_str)
    except Exception as err:
        logging.getLogger("halluciguard.corrector").debug(f"Instrumentation suppressed error: {err}")


def run_correction(
    request: RequestLike, config: Optional[CorrectorConfig] = None
) -> CorrectionResult:
    """Module-level convenience wrapper around ``CorrectorAgent.correct``."""
    return CorrectorAgent(config).correct(request)
