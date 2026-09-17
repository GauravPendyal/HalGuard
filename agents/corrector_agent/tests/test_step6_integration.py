"""Step 6 — Corrector execution integration tests.

These tests drive the FULL pipeline through the canonical boundary
(``CorrectorAgent(...).correct(request)``) with a deterministic generator double
injected in place of the fine-tuned 1.5B model. The real model is never required.

Everything upstream of the model is REAL: ``to_internal_request`` (Step 1),
``ground_request`` (Steps 2-3), ``build_prompts`` + ``parse_candidate`` (Step 4),
``validate_candidate`` + ``resolve_generation`` (Step 5) and the new
``reconstruct`` (Step 6). Only the text generator is a double, so these tests
exercise the genuine wiring, not a re-implementation of it.

Scenario coverage (the 17 required scenarios):
    1  valid request                         -> test_valid_request_produces_completed_correction
    2  Step 5 cannot be bypassed             -> test_step5_cannot_be_bypassed_ungrounded_output_not_spliced
    3  echo failure -> retry                  -> test_recorded_echo_is_caught_and_not_spliced,
                                                 test_recorded_echo_then_good_correction_accepts_on_retry
    4  retry success                          -> test_retryable_failure_then_good_correction_accepts_on_retry
    5  retry exhaustion -> unresolved         -> test_retry_exhaustion_preserves_original
    6  abstention -> unresolved               -> test_abstention_is_unresolved_never_completed
    7  unauthorized target                    -> test_model_output_for_wrong_sentence_is_rejected,
                                                 test_unauthorized_sentence_is_never_targeted
    8  missing evidence                       -> test_missing_evidence_yields_no_target_and_preserves_original
    9  base-model fallback impossible         -> test_base_model_fallback_is_impossible_by_default,
                                                 test_base_model_optin_still_unavailable_without_ml_stack
    10 unresolved preserves original          -> test_terminal_rejection_preserves_original
    11 only authorized sentence changes       -> test_only_the_authorized_sentence_changes
    12 accurate attempt count                 -> test_attempt_count_is_accurate_across_paths
    13 accurate changed_claims                -> test_changed_claims_reflect_actual_corrections
    14 canonical CorrectionResult validation  -> test_completed_result_validates_against_canonical_schema
    15 existing Step 1-5 regression           -> test_step1_to_step5_components_remain_intact
    16 model unavailable                      -> test_model_unavailable_preserves_original
    17 reconstruction integrity failure       -> test_reconstruction_failure_falls_back_to_original,
                                                 test_reconstruct_module_fails_closed_on_corrupted_span,
                                                 test_reconstruct_module_rejects_accepted_target_with_no_span
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT_DIR = str(Path(__file__).resolve().parents[3])
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import pytest

from orchestration.schemas import CorrectionResult, ExecutionStatus, ValidationStatus

from agents.corrector_agent.corrector import (
    CorrectorAgent,
    Reconstruction,
    reconstruct,
    resolve_generation,
    validate_candidate,
)
import agents.corrector_agent.corrector as corrector_pkg
from agents.corrector_agent.corrector.config import CorrectorConfig
from agents.corrector_agent.corrector.contracts import (
    CorrectionTarget,
    GenerationOutcome,
    GroundedPlan,
    GroundedTarget,
    ModelKind,
    ModelStatus,
    TargetDecision,
    TargetResolution,
    ValidationOutcome,
)
from agents.corrector_agent.corrector.model_client import Generator
from agents.corrector_agent.corrector.sentence_utils import extract_sentence_spans


# ---------------------------------------------------------------------------
# The recorded correct rewrite (verbatim from test_validation.py — the string
# proven to pass every gate for the recorded missing-person case).
# ---------------------------------------------------------------------------
RECORDED_GOOD_REWRITE = (
    "You can make a missing person report as soon as you think a person is missing."
)

# Three candidates that each fail with a DISTINCT retryable code and are mutually
# non-identical — verbatim from test_retry.py, so a 3-attempt run exhausts to
# UNRESOLVED without tripping the repeat-offence or repeated-candidate short cuts.
NON_MINIMAL = "Guido van Rossum."
STRUCTURAL = "Python was created by Guido van Rossum in 1991. Indeed."
NUMBER_BAD = "Python was created by Guido van Rossum in 1991 or 500."


# ---------------------------------------------------------------------------
# Generator doubles (satisfy the Generator seam: generate(system, prompt) -> str)
# ---------------------------------------------------------------------------

_SID_META = re.compile(r"authorized_target_sentence_id:\s*([^\s`]+)")
_SID_JSON = re.compile(r'"sentence_id"\s*:\s*"([^"]+)"')


def _target_sid(system_text: str, prompt_text: str) -> str:
    """Recover the authorized target sentence id from the Step 4 prompt.

    The mandate embeds ``authorized_target_sentence_id: <id>`` (and the JSON
    output contract), so a double can route by target without hand-wiring ids.
    """
    blob = f"{system_text}\n{prompt_text}"
    match = _SID_META.search(blob) or _SID_JSON.search(blob)
    return match.group(1) if match else ""


class ScriptedGenerator(Generator):
    """Returns scripted ``corrected_sentence`` JSON, one entry per attempt.

    Routes by the target sentence id in the prompt, so a single instance serves a
    multi-target plan and successive retry attempts for the same target. When a
    target has no script, it abstains — a double never fabricates a passing
    correction it was not told to produce. When a queue is exhausted the last
    entry repeats (which trips the repeated-candidate stop, as a real greedy model
    would).
    """

    kind = ModelKind.INJECTED_TEST_GENERATOR.value

    def __init__(self, scripts=None, default=None):
        self._scripts = {sid: list(v) for sid, v in (scripts or {}).items()}
        self._default = list(default) if default is not None else None
        self.calls = []  # sentence ids, in call order — for assertions
        self._counts = {}

    def generate(self, system_text: str, prompt_text: str) -> str:
        sid = _target_sid(system_text, prompt_text)
        self.calls.append(sid)
        seen = self._counts.get(sid, 0)
        self._counts[sid] = seen + 1

        queue = self._scripts.get(sid, self._default)
        if not queue:
            corrected = "Current evidence is insufficient to support this claim."
        elif seen < len(queue):
            corrected = queue[seen]
        else:
            corrected = queue[-1]
        return json.dumps({"sentence_id": sid, "corrected_sentence": corrected})


class WrongSentenceGenerator(Generator):
    """Always answers for an unauthorized sentence id, so the parser must drop it."""

    kind = ModelKind.INJECTED_TEST_GENERATOR.value

    def __init__(self):
        self.calls = []

    def generate(self, system_text: str, prompt_text: str) -> str:
        self.calls.append(_target_sid(system_text, prompt_text))
        return json.dumps(
            {"sentence_id": "S999", "corrected_sentence": "Unauthorized rewrite."}
        )


# ---------------------------------------------------------------------------
# Local helpers
# ---------------------------------------------------------------------------

def _assert_schema_valid(result: CorrectionResult) -> None:
    assert isinstance(result, CorrectionResult)
    assert result == CorrectionResult.model_validate(result.model_dump())


def _python_request(step5, evidence=True):
    """A single-target request over STEP5_RESPONSE authorizing only S2 (Python)."""
    ev = [step5.evidence("ev-1", step5.evidence_text)] if evidence else []
    claim = step5.claim("c1", step5.claim_text, ev)
    return step5.request(
        correct=[claim], original=step5.response, query="Who created Python?"
    )


def _recorded_request(step5):
    """The recorded missing-person case as a full request."""
    ev = step5.evidence("ev-1", step5.recorded_evidence)
    claim = step5.claim("c1", step5.recorded_original, [ev])
    return step5.request(
        correct=[claim], original=step5.recorded_original, query=step5.recorded_query
    )


# ===========================================================================
# 1 — valid request
# ===========================================================================

def test_valid_request_produces_completed_correction(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    _assert_schema_valid(result)
    assert result.status == "completed"
    assert result.validation_status == "valid"
    # Deterministic splice: only S2 changed; computed independently of reconstruction.
    assert result.corrected_text == step5.response.replace(step5.claim_text, step5.good)
    assert result.original_text == step5.response
    assert result.attempt_count == 1


# ===========================================================================
# 2 — Step 5 cannot be bypassed
# ===========================================================================

def test_step5_cannot_be_bypassed_ungrounded_output_not_spliced(step5):
    """The model produces text, but ungrounded output is never accepted, so it is
    never spliced. Only ``model output -> Step 5 accept -> reconstruction`` reaches
    the result."""
    request = _python_request(step5)
    bogus = "Python was invented by aliens on Mars in the year 3000."
    gen = ScriptedGenerator(default=[bogus])
    result = CorrectorAgent(generator=gen).correct(request)

    assert bogus not in result.corrected_text
    assert result.corrected_text == step5.response  # original preserved
    assert result.status == "terminated_unresolved"


# ===========================================================================
# 3 — echo failure -> retry
# ===========================================================================

def test_recorded_echo_is_caught_and_not_spliced(step5):
    """The real recorded echo (original + a full stop) is never accepted, so the
    original is preserved and the echo never reaches the result."""
    request = _recorded_request(step5)
    gen = ScriptedGenerator(default=[step5.recorded_output])  # echo, then repeats
    result = CorrectorAgent(generator=gen).correct(request)

    assert result.status == "terminated_unresolved"
    assert result.corrected_text == step5.recorded_original
    assert result.attempt_count >= 2  # the echo triggered at least one retry


def test_recorded_echo_then_good_correction_accepts_on_retry(step5):
    """The recorded echo is rejected (retryable), and the grounded rewrite on the
    next attempt is accepted."""
    request = _recorded_request(step5)
    gen = ScriptedGenerator(default=[step5.recorded_output, RECORDED_GOOD_REWRITE])
    result = CorrectorAgent(generator=gen).correct(request)

    _assert_schema_valid(result)
    assert result.status == "completed"
    assert result.attempt_count == 2
    assert result.corrected_text == RECORDED_GOOD_REWRITE  # whole single-sentence response


# ===========================================================================
# 4 — retry success (canonical retryable failure -> good)
# ===========================================================================

def test_retryable_failure_then_good_correction_accepts_on_retry(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[NON_MINIMAL, step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    assert result.status == "completed"
    assert result.attempt_count == 2
    assert result.corrected_text == step5.response.replace(step5.claim_text, step5.good)


# ===========================================================================
# 5 — retry exhaustion -> unresolved
# ===========================================================================

def test_retry_exhaustion_preserves_original(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[NON_MINIMAL, STRUCTURAL, NUMBER_BAD])
    result = CorrectorAgent(generator=gen).correct(request)

    assert result.status == "terminated_unresolved"
    assert result.corrected_text == step5.response
    assert result.attempt_count == 3  # full budget spent, then preserved


# ===========================================================================
# 6 — abstention -> unresolved (never completed / valid)
# ===========================================================================

def test_abstention_is_unresolved_never_completed(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.abstention])
    result = CorrectorAgent(generator=gen).correct(request)

    assert result.status == "terminated_unresolved"
    assert result.validation_status == "warning"
    assert result.status != "completed"
    assert result.validation_status != "valid"
    assert result.corrected_text == step5.response
    assert result.attempt_count == 1
    assert result.changed_claims[0]["action"] == "abstained"
    assert result.changed_claims[0]["corrected"] == ""  # never a fabricated correction


# ===========================================================================
# 7 — unauthorized target
# ===========================================================================

def test_model_output_for_wrong_sentence_is_rejected(step5):
    """Model output whose sentence id is not the authorized target is dropped by
    the parser and never spliced — the original is preserved."""
    request = _python_request(step5)
    gen = WrongSentenceGenerator()
    result = CorrectorAgent(generator=gen).correct(request)

    assert gen.calls  # the model WAS invoked for the authorized target
    assert "Unauthorized rewrite." not in result.corrected_text
    assert result.corrected_text == step5.response
    assert result.status == "terminated_unresolved"


def test_unauthorized_sentence_is_never_targeted(step5):
    """A false but unauthorized sentence (S3, 'Paris is in Spain.') is never even
    prompted for, and survives verbatim while the authorized S2 is corrected."""
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    _internal, plan = step5.ground(request)
    target_sids = {gt.target.sentence_id for gt in plan.grounded_targets}
    assert len(target_sids) == 1  # only S2 authorized + grounded
    assert set(gen.calls).issubset(target_sids)  # model asked ONLY about authorized targets
    assert "Paris is in Spain." in result.corrected_text  # unauthorized false sentence preserved


# ===========================================================================
# 8 — missing evidence
# ===========================================================================

def test_missing_evidence_yields_no_target_and_preserves_original(step5):
    """An authorized claim with no supporting evidence is not grounded, so nothing
    is generated and the original is preserved — no fabrication."""
    request = _python_request(step5, evidence=False)
    gen = ScriptedGenerator(default=[step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    assert not gen.calls  # never grounded -> model never invoked
    assert result.status == "terminated_unresolved"
    assert result.corrected_text == step5.response


# ===========================================================================
# 9 — base-model fallback impossible
# ===========================================================================

def test_base_model_fallback_is_impossible_by_default(step5):
    """No generator injected and no fine-tuned model on disk (fallback off by
    default): the model is unavailable and the base model is NOT substituted."""
    request = _python_request(step5)
    result = CorrectorAgent().correct(request)  # real ModelClient, no generator

    _assert_schema_valid(result)
    assert result.status == "degraded"
    assert result.validation_status == "unvalidated"
    assert result.validation_status != "valid"
    assert result.corrected_text == step5.response
    assert result.changed_claims[0]["action"] == "model_unavailable"


def test_base_model_optin_still_unavailable_without_ml_stack(step5, monkeypatch):
    """Even if an operator opts into the base model, it cannot be conjured without
    the ML stack, so the result is still unavailable — never a fabricated
    correction."""
    request = _python_request(step5)
    cfg = CorrectorConfig(allow_base_model_fallback=True)
    monkeypatch.setattr(
        "agents.corrector_agent.corrector.model_client.missing_dependencies",
        lambda: ["torch", "transformers"],
    )
    result = CorrectorAgent(cfg).correct(request)

    assert result.corrected_text == step5.response
    assert result.status == "degraded"
    assert result.validation_status == "unvalidated"


# ===========================================================================
# 10 — unresolved preserves original (terminal rejection)
# ===========================================================================

def test_terminal_rejection_preserves_original(step5):
    request = _python_request(step5)
    gen = WrongSentenceGenerator()  # terminal authorization/target failure
    result = CorrectorAgent(generator=gen).correct(request)

    assert result.status == "terminated_unresolved"
    assert result.corrected_text == step5.response
    assert result.original_text == step5.response


# ===========================================================================
# 11 — only the authorized sentence changes
# ===========================================================================

def test_only_the_authorized_sentence_changes(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    expected = step5.response.replace(step5.claim_text, step5.good)
    assert result.corrected_text == expected
    # Neighbours preserved byte-for-byte; only S2 (the Python claim) changed.
    assert result.corrected_text.startswith("The sky is blue. ")
    assert result.corrected_text.endswith(" Paris is in Spain.")
    assert "Elon Musk" not in result.corrected_text
    assert "Guido van Rossum" in result.corrected_text


# ===========================================================================
# 12 — accurate attempt count
# ===========================================================================

def test_attempt_count_is_accurate_across_paths(step5):
    first = CorrectorAgent(generator=ScriptedGenerator(default=[step5.good])).correct(
        _python_request(step5)
    )
    retried = CorrectorAgent(
        generator=ScriptedGenerator(default=[NON_MINIMAL, step5.good])
    ).correct(_python_request(step5))
    exhausted = CorrectorAgent(
        generator=ScriptedGenerator(default=[NON_MINIMAL, STRUCTURAL, NUMBER_BAD])
    ).correct(_python_request(step5))

    assert first.attempt_count == 1
    assert retried.attempt_count == 2
    assert exhausted.attempt_count == 3


# ===========================================================================
# 13 — accurate changed_claims
# ===========================================================================

def test_changed_claims_reflect_actual_corrections(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    assert len(result.changed_claims) == 1
    cc = result.changed_claims[0]
    assert cc["claim_id"] == "c1"
    assert cc["action"] == "corrected"
    assert cc["original"] == step5.claim_text
    assert cc["corrected"] == step5.good
    # Evidence ids come from the render manifest, not model output.
    assert cc["evidence_ids_used"] == ["ev-1"]
    assert cc["attempts"] == 1


# ===========================================================================
# 14 — canonical CorrectionResult validation
# ===========================================================================

def test_completed_result_validates_against_canonical_schema(step5):
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.good])
    result = CorrectorAgent(generator=gen).correct(request)

    _assert_schema_valid(result)
    assert result.status in {s.value for s in ExecutionStatus}
    assert result.validation_status in {v.value for v in ValidationStatus}
    # changed_claims must serialize to plain dicts for the canonical contract.
    assert all(isinstance(entry, dict) for entry in result.changed_claims)


# ===========================================================================
# 15 — existing Step 1-5 regression (components reused, not duplicated)
# ===========================================================================

def test_step1_to_step5_components_remain_intact(step5, step5_case):
    # Step 5 validation still catches the recorded-echo class outside correct().
    echo = step5.candidate(step5_case.bundle, step5.recorded_output)
    verdict = validate_candidate(candidate=echo, context=step5_case.context)
    assert verdict.passed is False

    # Step 5 still accepts a good first candidate via the reused entry point.
    good = step5.candidate(step5_case.bundle, step5.good)
    outcome = resolve_generation(
        plan=step5_case.plan,
        outcome=GenerationOutcome(
            prompts=[step5_case.bundle],
            candidates=[good],
            model_status=ModelStatus(available=True),
        ),
        query_text=step5_case.internal.user_query,
    )
    assert outcome.has_accepted
    assert outcome.accepted[0].accepted_text == step5.good
    assert outcome.accepted[0].evidence_ids_used == ["ev-1"]


# ===========================================================================
# 16 — model unavailable
# ===========================================================================

def test_model_unavailable_preserves_original(step5):
    """An explicitly missing model path is unavailable in any environment."""
    request = _python_request(step5)
    cfg = CorrectorConfig(model_path="/nonexistent/hallucguard/corrector/model")
    result = CorrectorAgent(cfg).correct(request)

    _assert_schema_valid(result)
    assert result.status == "degraded"
    assert result.validation_status == "unvalidated"
    assert result.corrected_text == step5.response
    assert result.changed_claims[0]["action"] == "model_unavailable"


# ===========================================================================
# 17 — reconstruction integrity failure
# ===========================================================================

def test_reconstruction_failure_falls_back_to_original(step5, monkeypatch):
    """When reconstruction reports an integrity failure, the pipeline preserves the
    original verbatim (fallback/invalid) rather than emitting the accepted text
    that failed to splice safely."""
    request = _python_request(step5)
    gen = ScriptedGenerator(default=[step5.good])
    monkeypatch.setattr(
        corrector_pkg,
        "reconstruct",
        lambda *a, **k: Reconstruction(ok=False, failure_reason="forced_for_test"),
    )
    result = CorrectorAgent(generator=gen).correct(request)

    _assert_schema_valid(result)
    assert result.status == "fallback"
    assert result.validation_status == "invalid"
    assert result.corrected_text == step5.response  # original preserved verbatim
    assert result.original_text == step5.response


def test_reconstruct_module_fails_closed_on_corrupted_span(step5):
    """The reconstruction module refuses to splice when a span no longer matches
    the response bytes, returning a sentinel instead of a partial response."""
    case = step5.case()
    good = step5.candidate(case.bundle, step5.good)
    outcome = resolve_generation(
        plan=case.plan,
        outcome=GenerationOutcome(
            prompts=[case.bundle],
            candidates=[good],
            model_status=ModelStatus(available=True),
        ),
        query_text=case.internal.user_query,
    )
    assert outcome.has_accepted

    # Intact plan -> reconstruction succeeds and changes only the accepted span.
    ok = reconstruct(case.internal.original_response, case.plan, outcome)
    assert ok.ok is True
    assert ok.text == step5.response.replace(step5.claim_text, step5.good)

    # Corrupt the accepted target's recorded span text so the byte-accuracy
    # invariant (text[start:end] == span.text) no longer holds.
    accepted_sid = outcome.accepted[0].sentence_id
    corrupted = case.plan.model_copy(deep=True)
    for span in corrupted.spans:
        if span.sentence_id == accepted_sid:
            span.text = span.text + " TAMPERED"
    bad = reconstruct(case.internal.original_response, corrupted, outcome)
    assert bad.ok is False
    assert bad.text == ""
    assert bad.failure_reason.startswith("span_integrity_failed")


def test_reconstruct_module_rejects_accepted_target_with_no_span():
    """An accepted resolution for a sentence that is not an authorized grounded
    target is refused — reconstruction never rewrites an unauthorized sentence."""
    original = "Alpha. Beta."
    spans = extract_sentence_spans(original)  # S1='Alpha.', S2='Beta.'
    s1 = next(s for s in spans if s.sentence_id == "S1")
    target = CorrectionTarget(
        sentence_id="S1",
        claim_ids=["c1"],
        claim_texts=["Alpha."],
        original_text=s1.text,
        start_offset=s1.start_offset,
        end_offset=s1.end_offset,
    )
    plan = GroundedPlan(
        spans=spans,
        grounded_targets=[GroundedTarget(target=target)],
        integrity_verified=True,
    )
    # Accepted resolution for S2 — which is NOT a grounded target.
    rogue = TargetResolution(
        sentence_id="S2",
        claim_ids=["cX"],
        original_text="Beta.",
        accepted_text="Gamma.",
        decision=TargetDecision.ACCEPTED.value,
        attempt_count=1,
    )
    outcome = ValidationOutcome(
        model_status=ModelStatus(available=True), resolutions=[rogue]
    )
    result = reconstruct(original, plan, outcome)
    assert result.ok is False
    assert result.failure_reason.startswith("accepted_target_not_grounded")
