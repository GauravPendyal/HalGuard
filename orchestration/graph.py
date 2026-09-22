from __future__ import annotations

import asyncio
import os
import sys
import uuid
from dataclasses import asdict, is_dataclass
from typing import Any, Callable, Dict, List, Optional

from pathlib import Path
from dotenv import find_dotenv, load_dotenv

# Ensure .env from repository root is loaded into environment variables
_REPO_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _REPO_ROOT / ".env"
if _ENV_FILE.exists():
    load_dotenv(_ENV_FILE)
else:
    load_dotenv(find_dotenv(usecwd=True))

from langgraph.graph import END, START, StateGraph

from services.base_llm_service import BaseLLMService
from .state import (
    HalluciGuardState,
    add_bus_message,
    add_error,
    add_trace,
    elapsed_ms,
    start_timer,
    utc_now,
)


def _dump(value: Any) -> Any:
    """
    Recursively serialize Pydantic models and dataclasses to plain dictionaries.

    Args:
        value: The value to serialize (Pydantic model, dataclass, dict, list, or primitive).

    Returns:
        A serialized dictionary, list, or primitive value suitable for JSON encoding.
    """
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if is_dataclass(value):
        return asdict(value)
    if isinstance(value, dict):
        return {k: _dump(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_dump(v) for v in value]
    return value


def _failure_update(
    state: HalluciGuardState, node: str, exc: BaseException, *, retryable: bool = False
) -> dict[str, Any]:
    """
    Generate a standardized state update dictionary for agent node failures.

    Args:
        state: The current pipeline state.
        node: The name of the agent node that failed.
        exc: The exception that caused the failure.
        retryable: Whether the failure is retryable (True) or terminal (False).

    Returns:
        A dictionary with error tracking, bus messages, and routing information for the failed node.
    """
    bus = add_bus_message(
        state,
        source_agent=node,
        target_agent="supervisor",
        message_type="ERROR_EVENT",
        payload={"error_type": type(exc).__name__, "message": str(exc)},
        status="failed",
    )
    return {
        "errors": add_error(state, node, exc, retryable=retryable),
        "error": f"{node} failed: {type(exc).__name__}: {exc}",
        "route": "error",
        "terminal_status": "human_review" if retryable else "fallback",
        "verification_status": "agent_failed",
        "inter_agent_bus": bus,
        "updated_at": utc_now(),
        "trace": add_trace(
            state, node, "failed", error_type=type(exc).__name__, retryable=retryable
        ),
    }


async def _generate_node(state: HalluciGuardState) -> dict[str, Any]:
    """Base LLM node: Generate initial draft using OpenRouter if not pre-supplied."""
    node_start = start_timer()
    user_query = state.get("user_query", "")
    existing_response = state.get("llm_response", "")

    # If response was already provided by caller, use it
    if existing_response and existing_response.strip():
        bus = add_bus_message(
            state,
            source_agent="caller",
            target_agent="supervisor",
            message_type="DRAFT_RESPONSE",
            payload={"draft": existing_response, "source": "pre_supplied"},
        )
        return {
            "draft_response": existing_response,
            "draft_answer": existing_response,
            "llm_response": existing_response,
            "base_llm": {
                "provider": "pre_supplied",
                "model": "caller_input",
                "latency_ms": 0,
            },
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "base_llm",
                "completed",
                latency_ms=0,
                provider="pre_supplied",
            ),
        }

    try:
        service = BaseLLMService()
        result = await service.generate(
            user_query=user_query,
            conversation_history=state.get("conversation_history", []),
            generation_mode=state.get("generation_mode", "normal"),
        )
        gen_result = _dump(result)
        if gen_result.get("status") not in {"success", "completed"}:
            exc = RuntimeError(str(gen_result.get("error") or "Base LLM generation failed"))
            update = _failure_update(state, "base_llm", exc)
            update["base_llm"] = gen_result
            update["final_response"] = "Base LLM generation failed. Please try again."
            return update

        draft = gen_result.get("draft_response", "")
        latency = gen_result.get("latency_ms", elapsed_ms(node_start))

        bus = add_bus_message(
            state,
            source_agent="base_llm",
            target_agent="supervisor",
            message_type="DRAFT_RESPONSE",
            payload={
                "draft": draft,
                "model": gen_result.get("model"),
                "provider": gen_result.get("provider"),
                "temperature": gen_result.get("temperature"),
            },
        )

        return {
            "draft_response": draft,
            "draft_answer": draft,
            "llm_response": draft,
            "final_response": draft,
            "base_llm": gen_result,
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "base_llm",
                "completed",
                latency_ms=latency,
                model=gen_result.get("model"),
                provider="openrouter",
            ),
        }
    except Exception as exc:
        update = _failure_update(state, "base_llm", exc)
        update["base_llm"] = {
            "provider": "openrouter",
            "status": "failed",
            "error": str(exc),
        }
        update["final_response"] = "Base LLM generation failed. Please try again."
        return update


def _generate_route(state: HalluciGuardState) -> str:
    """
    Determine the next node after generation based on state conditions.

    Args:
        state: The current pipeline state.

    Returns:
        The name of the next node: "human_escalation" if generation failed or "detector" otherwise.
    """
    if state.get("route") == "error" or not state.get("llm_response"):
        return "human_escalation"
    return "detector"


def _extract_claims_from_draft(draft_text: str) -> list[dict[str, Any]]:
    """
    Extract structured atomic factual claims from draft response text.
    Uses ClaimDecomposer if available, falling back to sentence segmentation.
    Each claim contains claim_id, text, span, and claim_type.
    """
    if not draft_text or not draft_text.strip():
        return []

    try:
        from agents.corrector_agent.corrector.sentence_utils import extract_sentence_spans
        sents = [s.text for s in extract_sentence_spans(draft_text)]
    except Exception:
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", draft_text.strip()) if s.strip()]
    if not sents:
        sents = [draft_text.strip()]

    raw_claims: list[str] = []
    try:
        from agents.verifier_agent.claims.claim_decomposer import ClaimDecomposer
        decomposed = ClaimDecomposer().decompose(draft_text)
        if decomposed:
            cursor = 0
            for d in decomposed:
                idx = draft_text.find(d, cursor)
                if idx == -1:
                    idx = draft_text.find(d)
                if idx != -1:
                    end_pos = idx + len(d)
                    cursor = end_pos
                    match_punct = re.match(r"^[.!?]+[\'\"’”\)\]]*", draft_text[end_pos:])
                    if match_punct:
                        raw_claims.append(draft_text[idx : end_pos + match_punct.end()])
                        cursor = end_pos + match_punct.end()
                    else:
                        raw_claims.append(draft_text[idx:end_pos])
                else:
                    raw_claims.append(d)
    except Exception:
        pass

    if not raw_claims:
        raw_claims = sents

    extracted: list[dict[str, Any]] = []
    cursor = 0
    for idx, claim_str in enumerate(raw_claims):
        cid = f"claim_{idx + 1}"
        start_idx = draft_text.find(claim_str, cursor)
        if start_idx == -1:
            start_idx = draft_text.find(claim_str)
        if start_idx != -1:
            end_idx = start_idx + len(claim_str)
            span = [start_idx, end_idx]
            cursor = end_idx
        else:
            span = None
        extracted.append(
            {
                "claim_id": cid,
                "text": claim_str,
                "span": span,
                "claim_type": "factual",
            }
        )
    return extracted


async def _detector_node(state: HalluciGuardState) -> dict[str, Any]:
    from agents.detector_agent.detector import DetectorAgent

    node_start = start_timer()
    try:
        llm_resp = state.get("draft_answer") or state.get("llm_response") or state.get("draft_response", "")
        if not llm_resp:
            raise ValueError("No LLM response available for detection.")

        def _run_detect():
            return DetectorAgent().detect(state["user_query"], llm_resp)

        detector = _dump(await asyncio.to_thread(_run_detect))
        next_action = str(detector.get("next_action", ""))
        risk_level = str(detector.get("risk_level", "LOW")).upper()
        
        # Verification is the safe default. The detector fast path is an explicit
        # operator opt-in only; degraded/fallback detector output must never skip evidence.
        allow_fast_path = os.environ.get("ALLOW_DETECTOR_FAST_PATH", "false").lower() in ("true", "1")
        always_verify = os.environ.get("ALWAYS_VERIFY", "true").lower() in ("true", "1")
        is_stress = state.get("generation_mode") == "stress_test"
        detector_degraded = str(detector.get("status", "")).lower() in {"failed", "degraded", "fallback", "unavailable"}
        should_verify = (
            always_verify
            or not allow_fast_path
            or is_stress
            or detector_degraded
            or risk_level in {"MEDIUM", "HIGH"}
            or next_action.lower().endswith("verify")
        )
        route = "verify" if should_verify else "accept"

        # Extract factual claims directly from the generated draft answer
        extracted_claims = _extract_claims_from_draft(llm_resp)
        claim_texts = [c["text"] for c in extracted_claims] if extracted_claims else [llm_resp]

        # Inter-agent bus messaging
        if route == "accept":
            bus = add_bus_message(
                state,
                source_agent="detector",
                target_agent="supervisor",
                message_type="DETECTOR_ACCEPT",
                payload={
                    "hallucination_probability": detector.get("hallucination_probability"),
                    "risk_level": detector.get("risk_level", "LOW"),
                    "extracted_claims": extracted_claims,
                },
            )
        else:
            bus = add_bus_message(
                state,
                source_agent="detector",
                target_agent="supervisor",
                message_type="SUSPICIOUS_CLAIMS",
                payload={
                    "suspicious_claims": claim_texts,
                    "extracted_claims": extracted_claims,
                    "hallucination_probability": detector.get("hallucination_probability"),
                    "risk_level": detector.get("risk_level", "HIGH"),
                },
            )

        return {
            "detector": detector,
            "detector_result": detector,
            "draft_answer": llm_resp,
            "extracted_claims": extracted_claims,
            "claims": [
                {"claim_id": c["claim_id"], "text": c["text"], "verdict": "unverified"}
                for c in extracted_claims
            ],
            "route": route,
            "hallucination_probability": float(
                detector.get("hallucination_probability", 0.0)
            ),
            "confidence": float(detector.get("confidence_score", 0.0)),
            "verification_status": (
                "detector_safe_fast_path"
                if route == "accept"
                else "verification_required"
            ),
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "detector",
                "completed",
                latency_ms=elapsed_ms(node_start),
                route=route,
                risk_level=detector.get("risk_level", "LOW"),
                claims_extracted=len(extracted_claims),
            ),
        }
    except Exception as exc:
        return _failure_update(state, "detector", exc)


def _detector_route(state: HalluciGuardState) -> str:
    """
    Determine the next node after detection based on risk assessment.

    Args:
        state: The current pipeline state.

    Returns:
        The name of the next node: "human_escalation" on error, "verifier" if verification is needed,
        or "accept" if the response is low-risk.
    """
    if state.get("route") == "error":
        return "human_escalation"
    return "verifier" if state.get("route") == "verify" else "accept"


def _verifier_imports():
    """
    Dynamically import verifier agent classes by injecting the verifier directory into sys.path.

    Returns:
        A tuple of (VerificationPipeline, SuspiciousClaim, VerifierInputV2) classes from the verifier agent.
    """
    verifier_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "agents", "verifier_agent")
    )
    if verifier_dir not in sys.path:
        sys.path.insert(0, verifier_dir)
    from api.pipeline import VerificationPipeline
    from schemas.models import SuspiciousClaim, VerifierInputV2

    return VerificationPipeline, SuspiciousClaim, VerifierInputV2


def _build_canonical_verifier_result(
    verifier: dict[str, Any], query_id: str, domain: str
):
    """
    Transform raw verifier output into the canonical VerifierResult contract schema.

    Args:
        verifier: Raw dictionary output from the verifier agent pipeline.
        query_id: The unique query identifier for this verification request.
        domain: The verification domain (e.g., general, biomedical, finance).

    Returns:
        A canonical VerifierResult instance with normalized claim reports and evidence.
    """
    from orchestration.schemas import (
        VerifierResult as CanonicalVerifierResult,
        ClaimReport as CanonicalClaimReport,
        Evidence as CanonicalEvidence,
        VerdictLabel as CanonicalVerdictLabel,
        EntailmentLabel as CanonicalEntailmentLabel,
        ExecutionStatus,
    )

    canonical_reports: list[CanonicalClaimReport] = []
    raw_reports = verifier.get("claim_evidence") or verifier.get("claim_reports", [])
    for report in raw_reports:
        if isinstance(report, CanonicalClaimReport):
            canonical_reports.append(report)
            continue
        c_id = report.get("claim_id", "c1")
        c_text = report.get("claim_text") or report.get("claim", "")
        verdict_raw = str(report.get("verdict", "")).lower()

        if "contradict" in verdict_raw or "hallucinat" in verdict_raw:
            c_verdict = CanonicalVerdictLabel.CONTRADICTED
        elif "conflict" in verdict_raw:
            c_verdict = CanonicalVerdictLabel.CONFLICTED
        elif verdict_raw in ("verified", "supported", "verdictlabel.verified") or (verdict_raw.startswith("verif") and "unverif" not in verdict_raw):
            c_verdict = CanonicalVerdictLabel.VERIFIED
        else:
            c_verdict = CanonicalVerdictLabel.UNVERIFIED

        canonical_ev_list: list[CanonicalEvidence] = []
        for ev in report.get("evidence", []):
            if isinstance(ev, CanonicalEvidence):
                canonical_ev_list.append(ev)
                continue
            entail_raw = str(ev.get("entailment_label", "neutral")).lower()
            if "contra" in entail_raw:
                entail_lbl = CanonicalEntailmentLabel.CONTRADICTION
            elif "entail" in entail_raw or "support" in entail_raw:
                entail_lbl = CanonicalEntailmentLabel.ENTAILMENT
            else:
                entail_lbl = CanonicalEntailmentLabel.NEUTRAL

            canonical_ev_list.append(
                CanonicalEvidence(
                    evidence_id=str(ev.get("evidence_id") or uuid.uuid4())[:8],
                    title=ev.get("title", ""),
                    source=ev.get("source", "Unknown"),
                    url=ev.get("url"),
                    snippet=ev.get("snippet", ""),
                    entailment_label=entail_lbl,
                    entailment_score=float(ev.get("entailment_score", 0.8)),
                    credibility_score=float(ev.get("credibility_score", 0.8)),
                )
            )

        canonical_reports.append(
            CanonicalClaimReport(
                claim_id=c_id,
                claim_text=c_text,
                verdict=c_verdict,
                support_score=float(report.get("support_score", 0.9 if c_verdict == CanonicalVerdictLabel.VERIFIED else 0.1)),
                contradiction_score=float(report.get("contradiction_score", 0.9 if c_verdict == CanonicalVerdictLabel.CONTRADICTED else 0.1)),
                confidence_score=float(report.get("confidence_score", report.get("trust_score", 0.8))),
                evidence=canonical_ev_list,
            )
        )

    overall_conf = float(verifier.get("overall_evidence_confidence", verifier.get("overall_confidence", 0.8)))
    return CanonicalVerifierResult(
        query_id=verifier.get("query_id", query_id),
        domain=verifier.get("domain", domain),
        claim_reports=canonical_reports,
        evidence=[ev for r in canonical_reports for ev in r.evidence],
        overall_confidence=overall_conf,
        status=ExecutionStatus.COMPLETED,
    )


async def _verifier_node(state: HalluciGuardState) -> dict[str, Any]:
    VerificationPipeline, SuspiciousClaim, VerifierInputV2 = _verifier_imports()
    node_start = start_timer()
    try:
        # Verifier MUST verify factual claims from the generated draft answer, NOT state.user_query
        extracted = state.get("extracted_claims")
        if not extracted:
            draft_txt = state.get("draft_answer") or state.get("llm_response") or state.get("draft_response", "")
            if draft_txt:
                extracted = _extract_claims_from_draft(draft_txt)

        suspicious_claims: list[Any] = []
        if extracted:
            for idx, c in enumerate(extracted):
                cid = str(c.get("claim_id") or f"c{idx+1}")
                ctxt = str(c.get("text", "")).strip()
                if ctxt:
                    suspicious_claims.append(SuspiciousClaim(claim_id=cid, text=ctxt))

        if not suspicious_claims:
            draft_txt = state.get("draft_answer") or state.get("llm_response") or state.get("draft_response", "")
            if draft_txt and draft_txt.strip():
                suspicious_claims.append(SuspiciousClaim(claim_id="c1", text=draft_txt.strip()))

        payload = VerifierInputV2(
            query_id=state.get("request_id")
            or state.get("execution_id")
            or str(uuid.uuid4()),
            domain=state.get("domain", "general"),
            suspicious_claims=suspicious_claims,
        )
        try:
            verifier_timeout = float(os.environ.get("VERIFIER_TIMEOUT_SECONDS", "300.0"))
            verifier_res = await asyncio.wait_for(VerificationPipeline().verify(payload), timeout=verifier_timeout)
            verifier = _dump(verifier_res)
        except (asyncio.TimeoutError, Exception) as sub_err:
            raise RuntimeError(
                f"Verifier failed: {type(sub_err).__name__}: {sub_err}"
            ) from sub_err
        judge_pairs: list[dict[str, Any]] = []
        evidence_all: list[dict[str, Any]] = []
        nli_results: list[dict[str, Any]] = []
        claims: list[dict[str, Any]] = []
        
        has_contradiction = False
        has_verified = False
        has_conflicted = False

        for report in verifier.get("claim_evidence", []):
            verdict_raw = str(report.get("verdict", "")).lower()
            clean_verdict = "unverified"
            if "contradict" in verdict_raw or "hallucinat" in verdict_raw:
                has_contradiction = True
                clean_verdict = "contradicted"
            elif verdict_raw in ("verified", "supported", "verdictlabel.verified") or (verdict_raw.startswith("verif") and "unverif" not in verdict_raw):
                has_verified = True
                clean_verdict = "verified"
            elif "conflict" in verdict_raw:
                has_conflicted = True
                clean_verdict = "conflicted"

            claims.append(
                {
                    "claim_id": report.get("claim_id"),
                    "text": report.get("claim_text"),
                    "verdict": clean_verdict,
                }
            )
            evidence_items = report.get("evidence", [])
            for evidence in evidence_items:
                evidence_all.append(evidence)
                nli_results.append(
                    {
                        "claim": report.get("claim_text", ""),
                        "label": evidence.get("entailment_label"),
                        "score": evidence.get("entailment_score"),
                    }
                )
                judge_pairs.append(
                    {
                        "claim": report.get("claim_text", ""),
                        "evidence": evidence.get("snippet", ""),
                        "source": evidence.get("source", ""),
                        "url": evidence.get("url", ""),
                        "entailment_label": evidence.get("entailment_label", "neutral"),
                        "entailment_score": evidence.get("entailment_score", 0.0),
                        "credibility_score": evidence.get("credibility_score", 0.0),
                    }
                )

        bus = add_bus_message(
            state,
            source_agent="verifier",
            target_agent="supervisor",
            message_type="VERIFICATION_RESULT",
            payload={
                "claims_count": len(claims),
                "evidence_count": len(evidence_all),
                "has_contradiction": has_contradiction,
                "has_verified": has_verified,
            },
        )

        canonical_verifier_result = _build_canonical_verifier_result(
            verifier, payload.query_id, payload.domain
        )

        overall_status = (
            "contradicted" if has_contradiction
            else "conflicted" if has_conflicted
            else "verified" if has_verified
            else "unverified"
        )
        verifier["verification_status"] = overall_status
        verifier["draft_verification_status"] = overall_status

        return {
            "verifier": verifier,
            "verifier_result": _dump(canonical_verifier_result),
            "claims": claims,
            "judge_pairs": judge_pairs,
            "evidence": evidence_all,
            "retrieved_evidence": evidence_all,
            "ranked_evidence": evidence_all,
            "nli_results": nli_results,
            "verification_status": overall_status,
            "draft_verification_status": overall_status,
            "original_verification_status": overall_status,
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "verifier",
                "completed",
                latency_ms=elapsed_ms(node_start),
                claim_count=len(claims),
                evidence_count=len(evidence_all),
                has_contradiction=has_contradiction,
            ),
        }
    except Exception as exc:
        from orchestration.schemas import VerifierResult as CanonicalVerifierResult, ExecutionStatus
        failed_res = CanonicalVerifierResult(
            query_id=payload.query_id if 'payload' in locals() else "q-failed",
            domain=state.get("domain", "general"),
            claim_reports=[],
            evidence=[],
            overall_confidence=0.0,
            status=ExecutionStatus.FAILED,
        )
        update = _failure_update(state, "verifier", exc, retryable=True)
        update["verifier_result"] = _dump(failed_res)
        return update


def _verifier_route(state: HalluciGuardState) -> str:
    """
    Determine the next node after verification based on execution status.

    Args:
        state: The current pipeline state.

    Returns:
        The name of the next node: "human_escalation" if verification failed, or "judge" otherwise.
    """
    if state.get("route") == "error" or state.get("verification_status") == "agent_failed":
        return "human_escalation"
    return "judge"


async def _judge_node(state: HalluciGuardState) -> dict[str, Any]:
    from agents.judge_agent.judge_agent import JudgeAgent

    node_start = start_timer()
    try:
        verifier_output = state.get("verifier_result") or state.get("verifier", {})
        detector_output = state.get("detector_result") or state.get("detector", {})
        user_query = state.get("user_query", "")
        draft_resp = state.get("llm_response") or state.get("draft_response", "")
        domain = state.get("domain", "general")
        retry_count = state.get("retry_count", 0)
        corr_attempts = int(state.get("correction_attempt_count", 0))
        reverification_res = state.get("reverification_result")

        def _run_judge():
            agent = JudgeAgent()
            return agent.evaluate(
                verifier_result=verifier_output,
                detector_result=detector_output,
                user_query=user_query,
                original_response=draft_resp,
                domain=domain,
                reverification_result=reverification_res,
                retry_count=retry_count,
                correction_attempt_count=corr_attempts,
            )

        judge_result = await asyncio.to_thread(_run_judge)
        dumped_judge = _dump(judge_result)

        decision_val = str(dumped_judge.get("decision", "ABSTAIN")).upper()
        answer_status_val = str(dumped_judge.get("answer_status", "ACCEPTED" if decision_val == "ACCEPT" else "REQUIRES_CORRECTION")).upper()
        
        # When a contradicted draft enters the pipeline, correction_required must remain True
        # until a valid grounded correction is actually accepted.
        prev_corr_required = bool(state.get("correction_required", False))
        if decision_val == "ACCEPT":
            corr_required_val = False
        elif prev_corr_required:
            corr_required_val = True
        else:
            corr_required_val = bool(dumped_judge.get("correction_required", decision_val == "CORRECT"))

        severity_val = str(dumped_judge.get("severity", "LOW")).upper()
        corr_req = dumped_judge.get("correction_request")

        # Bounded retry tracking: strictly increment for VERIFY_AGAIN
        new_retry_count = retry_count + 1 if decision_val == "VERIFY_AGAIN" else retry_count

        if decision_val == "ACCEPT":
            route = "memory"
            verification_status = "verified_and_accepted"
        elif decision_val == "REJECT":
            route = "reject"
            verification_status = "rejected_by_judge"
        elif decision_val == "CORRECT" or corr_required_val:
            active = state.get("active_agents")
            if active is not None and "corrector" not in active:
                route = "human_escalation"
            else:
                route = "corrector" if corr_attempts < state.get("max_retries", 2) else "reject"
            verification_status = "correction_requested"
        elif decision_val == "VERIFY_AGAIN":
            route = "verifier" if retry_count < state.get("max_retries", 2) else "human_escalation"
            verification_status = "reverification_requested"
        else:
            route = "human_escalation"
            verification_status = "judge_abstain"

        bus = add_bus_message(
            state,
            source_agent="judge",
            target_agent="supervisor",
            message_type="JUDGE_DECISION",
            payload={
                "decision": decision_val,
                "answer_status": answer_status_val,
                "correction_required": corr_required_val,
                "severity": severity_val,
                "reason": dumped_judge.get("reason"),
                "has_correction_request": corr_req is not None,
            },
        )

        return {
            "judge": dumped_judge,
            "judge_result": dumped_judge,
            "judge_decision": decision_val,
            "answer_status": answer_status_val,
            "correction_required": corr_required_val,
            "severity": severity_val,
            "correction_request": corr_req,
            "route": route,
            "terminal_status": "accepted" if decision_val == "ACCEPT" else state.get("terminal_status"),
            "retry_count": new_retry_count,
            "verification_status": verification_status,
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "judge",
                "completed",
                latency_ms=elapsed_ms(node_start),
                decision=decision_val,
                answer_status=answer_status_val,
                correction_required=corr_required_val,
                severity=severity_val,
            ),
        }
    except Exception as exc:
        return _failure_update(state, "judge", exc)


async def _corrector_node(state: HalluciGuardState) -> dict[str, Any]:
    from agents.corrector_agent.corrector import CorrectorAgent
    from orchestration.schemas import CorrectionRequest, ValidationStatus, ExecutionStatus

    node_start = start_timer()
    try:
        corr_req_data = state.get("correction_request")
        if not corr_req_data and isinstance(state.get("judge_result"), dict):
            corr_req_data = state.get("judge_result", {}).get("correction_request")

        # Coerce to canonical CorrectionRequest
        if isinstance(corr_req_data, CorrectionRequest):
            corr_req = corr_req_data
        elif isinstance(corr_req_data, dict) and corr_req_data:
            try:
                corr_req = CorrectionRequest.model_validate(corr_req_data)
            except Exception:
                corr_req = None
        else:
            corr_req = None

        if corr_req is None:
            original_resp = state.get("llm_response") or state.get("draft_response", "")
            user_q = state.get("user_query", "")
            v_res = state.get("verifier_result") or {}
            claims_to_correct = []
            claims_to_preserve = []
            trusted_ev = []
            contra_ev = []
            # Reuse the Judge's replacement-capable evidence classifier so a
            # reconstructed CorrectionRequest routes evidence the same way the
            # Judge would: only evidence that establishes the true replacement
            # fact (Category B) is trusted; pure-refutation/context evidence
            # (Category A) goes to contradictory_evidence and never grounds a fix.
            try:
                from agents.judge_agent.judge_agent import JudgeAgent
                from orchestration.schemas import Evidence as _Ev
                _is_replacement = JudgeAgent._is_replacement_capable_evidence
            except Exception:
                _is_replacement = None

            def _route_evidence(claim_text: str, ev_list: list) -> None:
                for ev in ev_list:
                    routed = False
                    if _is_replacement is not None:
                        try:
                            ev_obj = _Ev.model_validate(ev) if isinstance(ev, dict) else ev
                            if _is_replacement(claim_text, ev_obj):
                                trusted_ev.append(ev)
                            else:
                                contra_ev.append(ev)
                            routed = True
                        except Exception:
                            routed = False
                    if not routed:
                        trusted_ev.append(ev)

            if isinstance(v_res, dict):
                for cr in v_res.get("claim_reports", []):
                    verdict_str = str(cr.get("verdict", "")).lower()
                    if "contradict" in verdict_str:
                        claims_to_correct.append(cr)
                        _route_evidence(str(cr.get("claim_text", "")), cr.get("evidence", []))
                    elif "verif" in verdict_str and "unverif" not in verdict_str:
                        claims_to_preserve.append(cr)
                        # Verified claims: all their evidence is trusted grounding.
                        trusted_ev.extend(cr.get("evidence", []))

            corr_req = CorrectionRequest(
                execution_id=state.get("execution_id") or state.get("request_id") or str(uuid.uuid4()),
                user_query=user_q,
                original_response=original_resp,
                claims_to_correct=claims_to_correct,
                claims_to_preserve=claims_to_preserve,
                trusted_evidence=trusted_ev,
                contradictory_evidence=contra_ev,
                correction_instructions="Repair contradicted claim(s) using evidence.",
            )

        def _run_corrector():
            from agents.corrector_agent.corrector.config import CorrectorConfig
            cfg = CorrectorConfig.from_env()

            provider = os.environ.get("HG_CORRECTOR_PROVIDER", "").strip().lower()
            has_openrouter_key = bool(os.environ.get("OPENROUTER_API_KEY", "").strip())
            if (provider == "openrouter" or (not provider and has_openrouter_key)) and has_openrouter_key:
                from services.openrouter_corrector import OpenRouterCorrectorGenerator
                generator = OpenRouterCorrectorGenerator(config=cfg)
                return CorrectorAgent(config=cfg, generator=generator).correct(corr_req)

            if not cfg.allow_base_model_fallback and not os.path.exists(cfg.model_path):
                cfg = CorrectorConfig(
                    max_retries=cfg.max_retries,
                    evidence_alignment_threshold=cfg.evidence_alignment_threshold,
                    minimal_edit_min_similarity=cfg.minimal_edit_min_similarity,
                    max_expansion_ratio=cfg.max_expansion_ratio,
                    require_entailment_check=cfg.require_entailment_check,
                    enforce_single_sentence=cfg.enforce_single_sentence,
                    token_overlap_threshold=cfg.token_overlap_threshold,
                    token_overlap_margin=cfg.token_overlap_margin,
                    min_claim_tokens_for_overlap=cfg.min_claim_tokens_for_overlap,
                    max_prompt_tokens=cfg.max_prompt_tokens,
                    max_new_tokens=cfg.max_new_tokens,
                    model_path=cfg.model_path,
                    base_model_name=cfg.base_model_name,
                    allow_base_model_fallback=True,
                    deterministic=cfg.deterministic,
                    openrouter_model=cfg.openrouter_model,
                )
            try:
                agent = CorrectorAgent(config=cfg)
            except TypeError:
                agent = CorrectorAgent()
            return agent.correct(corr_req)

        corr_res = await asyncio.to_thread(_run_corrector)
        dumped_corr = _dump(corr_res)

        attempt_count = int(state.get("correction_attempt_count", 0)) + 1
        val_status = str(dumped_corr.get("validation_status", ValidationStatus.UNVALIDATED.value)).lower()
        exec_status = str(dumped_corr.get("status", ExecutionStatus.COMPLETED.value)).lower()

        corrected_text = dumped_corr.get("corrected_text", "")
        original_text = dumped_corr.get("original_text", state.get("llm_response", ""))

        candidate_text = corrected_text if corrected_text else original_text

        bus = add_bus_message(
            state,
            source_agent="corrector",
            target_agent="supervisor",
            message_type="CORRECTION_COMPLETED",
            payload={
                "validation_status": val_status,
                "attempt_count": attempt_count,
                "changed_claims_count": len(dumped_corr.get("changed_claims", [])),
                "is_reconstructed": bool(corrected_text and corrected_text != original_text),
            },
        )

        changed_claims = dumped_corr.get("changed_claims", [])
        has_unresolved_claims = any(
            isinstance(c, dict) and str(c.get("action", "")).lower() == "unresolved"
            for c in changed_claims
        )
        is_reconstructed = bool(
            corrected_text
            and corrected_text.strip() != original_text.strip()
            and val_status != "invalid"
            and exec_status not in ("terminated_unresolved", "failed")
        )

        if is_reconstructed:
            corr_status = "applied"
        elif (
            exec_status in ("terminated_unresolved", "failed", "fallback")
            or has_unresolved_claims
            or val_status == "invalid"
        ):
            corr_status = "unresolved" if (exec_status == "terminated_unresolved" or has_unresolved_claims) else "failed"
        elif exec_status in ("completed", "success") and not state.get("correction_required", False):
            corr_status = "completed"
        else:
            corr_status = "unresolved"

        trace_status = "completed" if is_reconstructed else ("unresolved" if corr_status == "unresolved" else "failed")

        return {
            "corrector": dumped_corr,
            "correction_result": dumped_corr,
            "correction_attempt_count": attempt_count,
            "correction_status": corr_status,
            "final_response": candidate_text,
            "route": "reverifier",
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "corrector",
                trace_status,
                latency_ms=elapsed_ms(node_start),
                validation_status=val_status,
                attempt_count=attempt_count,
            ),
        }
    except Exception as exc:
        return _failure_update(state, "corrector", exc)


async def _reverifier_node(state: HalluciGuardState) -> dict[str, Any]:
    from orchestration.schemas import (
        ReverificationResult,
        VerifierResult as CanonicalVerifierResult,
        ExecutionStatus,
    )
    VerificationPipeline, SuspiciousClaim, VerifierInputV2 = _verifier_imports()
    node_start = start_timer()
    try:
        corr_res = state.get("correction_result") or {}
        candidate_text = (
            corr_res.get("corrected_text")
            or state.get("final_response")
            or state.get("llm_response", "")
        )

        domain = state.get("domain", "general")
        query_id = (
            state.get("request_id")
            or state.get("execution_id")
            or str(uuid.uuid4())
        )

        # Re-extract claims directly from the candidate (corrected) text
        reverified_claims = _extract_claims_from_draft(candidate_text)
        claim_texts = [c["text"] for c in reverified_claims] if reverified_claims else []

        if not claim_texts:
            changed = corr_res.get("changed_claims")
            if changed and isinstance(changed, list):
                for c in changed:
                    if isinstance(c, dict) and c.get("text"):
                        claim_texts.append(c["text"])
                    elif isinstance(c, str) and c.strip():
                        claim_texts.append(c.strip())

        if not claim_texts:
            sentences = [s.strip() for s in candidate_text.replace("\n", " ").split(".") if len(s.strip()) > 10]
            claim_texts = sentences[:2] if sentences else [candidate_text[:200]]

        suspicious_claims = [
            SuspiciousClaim(claim_id=f"rev-{idx+1}", text=txt)
            for idx, txt in enumerate(claim_texts)
        ]

        payload = VerifierInputV2(
            query_id=f"rev-{query_id}",
            domain=domain,
            suspicious_claims=suspicious_claims,
        )

        try:
            verifier_timeout = float(os.environ.get("VERIFIER_TIMEOUT_SECONDS", "120.0"))
            raw_verifier_res = await asyncio.wait_for(
                VerificationPipeline().verify(payload),
                timeout=verifier_timeout,
            )
            raw_verifier = _dump(raw_verifier_res)
            canonical_v_res = _build_canonical_verifier_result(
                raw_verifier, payload.query_id, payload.domain
            )
        except (asyncio.TimeoutError, Exception) as sub_err:
            canonical_v_res = CanonicalVerifierResult(
                query_id=payload.query_id,
                domain=payload.domain,
                claim_reports=[],
                evidence=[],
                overall_confidence=0.0,
                status=ExecutionStatus.FAILED,
            )

        total_claims = len(canonical_v_res.claim_reports)
        supported_count = sum(
            1 for r in canonical_v_res.claim_reports
            if str(getattr(r, "verdict", "")).lower() in ("verified", "supported", "verdictlabel.verified")
        )
        contradicted_count = sum(
            1 for r in canonical_v_res.claim_reports
            if str(getattr(r, "verdict", "")).lower() in ("contradicted", "verdictlabel.contradicted")
        )
        uncertain_count = max(0, total_claims - supported_count - contradicted_count)

        # ------------------------------------------------------------------
        # CLAIM LINEAGE GATE (critical safety invariant).
        #
        # A previously CONTRADICTED claim that entered correction cannot be
        # laundered into ACCEPTED merely because a fresh, broad re-verification
        # of the (possibly unchanged) candidate text happens to return zero
        # contradictions. If a correction was REQUIRED but the Corrector did
        # not actually apply an evidence-grounded change, the correction is
        # UNRESOLVED — the answer is not safe and re-verification must fail
        # closed, regardless of what re-verifying the unchanged text returns.
        #
        # correction_status is set by _corrector_node:
        #   "applied"    -> corrected_text genuinely changed & validated
        #   "unresolved" -> nothing accepted / abstained / terminated_unresolved
        #   "failed"     -> invalid / fallback / model unavailable
        #   "completed"  -> exec completed and correction was not required
        # ------------------------------------------------------------------
        corr_status = str(state.get("correction_status", "")).lower()
        correction_was_required = bool(state.get("correction_required", False))
        correction_applied = corr_status == "applied"
        # Detect unresolved/abstained lineage directly from the corrector output too.
        corr_changed = corr_res.get("changed_claims", []) if isinstance(corr_res, dict) else []
        has_unresolved_lineage = any(
            isinstance(c, dict) and str(c.get("action", "")).lower() in ("unresolved", "abstained", "model_unavailable", "input_error")
            for c in corr_changed
        )
        # Text-level lineage: did the candidate actually differ from the original draft?
        original_draft = str(
            corr_res.get("original_text") if isinstance(corr_res, dict) else ""
        ) or str(state.get("draft_answer") or state.get("llm_response", ""))
        text_changed = bool(candidate_text.strip()) and candidate_text.strip() != original_draft.strip()

        lineage_broken = correction_was_required and (
            not correction_applied
            or corr_status in ("unresolved", "failed", "fallback")
            or has_unresolved_lineage
            or not text_changed
        )

        correction_successful = (
            canonical_v_res.status == ExecutionStatus.COMPLETED
            and contradicted_count == 0
            and supported_count > 0
            and not lineage_broken
        )
        # If the lineage is broken, the previously-contradicted claim is still
        # unresolved: surface at least one remaining contradiction so the Judge
        # cannot ACCEPT and instead retries or rejects.
        if lineage_broken:
            contradicted_count = max(contradicted_count, 1)
        passed = correction_successful

        rev_result = ReverificationResult(
            passed=passed,
            verifier_result=canonical_v_res,
            remaining_contradictions=contradicted_count,
            verified_claims=total_claims,
            supported=supported_count,
            contradicted=contradicted_count,
            uncertain=uncertain_count,
            correction_successful=correction_successful,
            status=ExecutionStatus.COMPLETED if canonical_v_res.status == ExecutionStatus.COMPLETED else ExecutionStatus.FAILED,
        )
        dumped_rev = _dump(rev_result)
        rev_attempts = int(state.get("reverification_attempt_count", 0)) + 1

        bus = add_bus_message(
            state,
            source_agent="reverifier",
            target_agent="supervisor",
            message_type="REVERIFICATION_RESULT",
            payload={
                "passed": passed,
                "remaining_contradictions": contradicted_count,
                "verified_claims": total_claims,
                "supported": supported_count,
                "contradicted": contradicted_count,
                "uncertain": uncertain_count,
                "correction_successful": correction_successful,
                "reverification_attempt": rev_attempts,
            },
        )

        rev_status = "passed" if passed else "failed"

        return {
            "reverification_result": dumped_rev,
            "reverification_attempt_count": rev_attempts,
            "reverification_status": rev_status,
            "corrected_verification_status": "verified" if (passed and contradicted_count == 0) else "unverified",
            "route": "judge",
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "reverifier",
                "completed" if rev_result.status == ExecutionStatus.COMPLETED else "failed",
                latency_ms=elapsed_ms(node_start),
                passed=passed,
                correction_successful=correction_successful,
                remaining_contradictions=contradicted_count,
                verified_claims=total_claims,
                supported=supported_count,
                contradicted=contradicted_count,
                uncertain=uncertain_count,
                attempt_count=rev_attempts,
            ),
        }
    except Exception as exc:
        return _failure_update(state, "reverifier", exc)


def _corrector_route(state: HalluciGuardState) -> str:
    """Fail closed when correction generation did not complete."""
    if state.get("route") == "error" or not state.get("correction_result"):
        return "human_escalation"
    return "reverifier"


def _reverifier_route(state: HalluciGuardState) -> str:
    """Only return to the Judge after a completed reverification run."""
    if state.get("route") == "error":
        return "human_escalation"
    result = state.get("reverification_result") or {}
    if str(result.get("status", "")).lower() not in {"completed", "success"}:
        return "human_escalation"
    return "judge"


def _judge_route(state: HalluciGuardState) -> str:
    """
    Determine the next node after judge arbitration based on the judge's decision.

    Args:
        state: The current pipeline state containing the judge decision.

    Returns:
        The name of the next node based on the judge decision:
        - ACCEPT: "memory"
        - CORRECT: "corrector" (if retries remain and corrector is active) or "reject"/"memory"
        - VERIFY_AGAIN: "verifier" (if retries remain) or "human_escalation"
        - REJECT: "reject"
        - ABSTAIN: "human_escalation"
        - error: "human_escalation"
    """
    if state.get("route") == "error":
        return "human_escalation"
    decision = str(state.get("judge_decision", "ACCEPT")).upper()

    if decision == "REJECT":
        return "reject"
    if decision == "ACCEPT":
        return "memory"
    if decision == "ABSTAIN":
        return "human_escalation"
    if decision == "VERIFY_AGAIN":
        retry_count = int(state.get("retry_count", 0))
        max_retries = int(state.get("max_retries", 2))
        if retry_count >= max_retries:
            return "human_escalation"
        return "verifier"

    correction_required = state.get("correction_required")
    # Corrector must run ONLY when the Judge explicitly requests correction
    if correction_required is True or decision == "CORRECT":
        active = state.get("active_agents")
        if active is not None and "corrector" not in active:
            return "human_escalation"
        # Hard upper bound on correction retries
        corr_attempts = int(state.get("correction_attempt_count", 0))
        max_retries = int(state.get("max_retries", 2))
        if corr_attempts >= max_retries:
            return "reject"
        return "corrector"

    return "human_escalation"


async def _memory_node(state: HalluciGuardState) -> dict[str, Any]:
    from agents.memory_agent.memory.memory_agent import MemoryAgent
    from agents.memory_agent.schemas.models import StoreFactRequest
    from orchestration.schemas import MemoryResult, MemoryStatus

    node_start = start_timer()

    # Sourcing verified facts: ONLY if judge accepted and reverification passed (if reverification ran)
    judge_decision = str(state.get("judge_decision", "")).upper()
    answer_status = str(state.get("answer_status", "")).upper()
    rev_res = state.get("reverification_result")

    verified_reports: list[dict[str, Any]] = []

    # Memory must NEVER persist unverified or contradicted facts.
    # Persist ONLY if Judge accepted and verification confirmed the facts.
    is_rejected = (
        judge_decision in ("REJECT", "CORRECT", "ABSTAIN", "VERIFY_AGAIN")
        or answer_status in ("REJECTED", "REQUIRES_CORRECTION", "INCONCLUSIVE")
    )
    is_accepted = not is_rejected and (judge_decision == "ACCEPT" or answer_status == "ACCEPTED" or not judge_decision)

    if is_accepted:
        if rev_res and isinstance(rev_res, dict):
            # If reverification ran, it must have passed with 0 remaining contradictions
            if rev_res.get("passed") is True and rev_res.get("remaining_contradictions", 0) == 0:
                v_res = rev_res.get("verifier_result", {})
                for cr in v_res.get("claim_reports", []):
                    verdict_str = str(cr.get("verdict", "")).lower()
                    if verdict_str in ("verified", "supported", "verdictlabel.verified") and cr.get("evidence"):
                        verified_reports.append(cr)
        elif not rev_res:
            v_res = state.get("verifier_result")
            if v_res and isinstance(v_res, dict):
                for cr in v_res.get("claim_reports", []):
                    verdict_str = str(cr.get("verdict", "")).lower()
                    if verdict_str in ("verified", "supported", "verdictlabel.verified") and cr.get("evidence"):
                        verified_reports.append(cr)
            if not verified_reports:
                claim_evidence = state.get("verifier", {}).get("claim_evidence", [])
                for r in claim_evidence:
                    v_raw = str(r.get("verdict", "")).lower()
                    if v_raw in ("verified", "supported", "verdictlabel.verified") and r.get("evidence"):
                        verified_reports.append(r)

    if not verified_reports:
        memory = {
            "stored": [],
            "count": 0,
            "stored_facts_count": 0,
            "fact_ids": [],
            "persisted_fact_ids": [],
            "status": "skipped",
            "knowledge_graph": False,
            "vector_memory": False,
            "skipped_reason": "no_verified_claims_to_persist",
        }
        mem_result = MemoryResult(
            status=MemoryStatus.SKIPPED,
            stored_count=0,
            fact_ids=[],
            reason="no_verified_claims_to_persist",
        )
        bus = add_bus_message(
            state,
            source_agent="memory",
            target_agent="supervisor",
            message_type="MEMORY_WRITE_RESULT",
            payload={"stored_count": 0, "status": "skipped", "reason": "no_verified_claims"},
        )
        return {
            "memory": memory,
            "memory_result": _dump(mem_result),
            "persisted_fact_ids": [],
            "final_response": state.get("final_response") or state.get("llm_response", ""),
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "memory",
                "skipped",
                latency_ms=elapsed_ms(node_start),
                reason=memory["skipped_reason"],
            ),
        }
    try:
        memory_agent = MemoryAgent()
        await memory_agent.initialize()
        stored = []
        try:
            for report in verified_reports:
                evidence = report.get("evidence", [])
                sources = [
                    str(e.get("source", "")) for e in evidence if e.get("source")
                ]
                req = StoreFactRequest(
                    claim_text=str(report.get("claim_text", "")),
                    domain=state.get("domain", "general"),
                    verdict="verified",
                    evidence=[
                        {
                            "source_id": e.get("source", ""),
                            "title": e.get("title", ""),
                            "url": e.get("url"),
                            "snippet": e.get("snippet", ""),
                        }
                        for e in evidence
                    ],
                    source_ids=sources,
                    confidence=float(
                        report.get("confidence_score", report.get("trust_score", 0.0))
                    ),
                    metadata={
                        "execution_id": state.get("execution_id", ""),
                        "request_id": state.get("request_id", ""),
                        "provenance": "halluciguard_verifier",
                        "verification_status": "SUPPORTED",
                        "verified_at": utc_now(),
                    },
                )
                stored.append(_dump(await memory_agent.store_fact(req)))
        finally:
            await memory_agent.close()

        fact_ids = [
            str(f.get("fact_id")) for f in stored
            if isinstance(f, dict) and f.get("fact_id")
        ]
        if not fact_ids and stored:
            fact_ids = [str(f.get("fact_id", f"fact-{i}")) for i, f in enumerate(stored)]

        memory = {
            "stored": stored,
            "count": len(stored),
            "stored_facts_count": len(stored),
            "fact_ids": fact_ids,
            "persisted_fact_ids": fact_ids,
            "status": "stored",
            "knowledge_graph": True,
            "vector_memory": True,
        }
        mem_result = MemoryResult(
            status=MemoryStatus.STORED,
            stored_count=len(stored),
            fact_ids=fact_ids,
        )
        bus = add_bus_message(
            state,
            source_agent="memory",
            target_agent="supervisor",
            message_type="MEMORY_WRITE_RESULT",
            payload={"stored_count": len(stored), "status": "stored", "fact_ids": fact_ids},
        )
        return {
            "memory": memory,
            "memory_result": _dump(mem_result),
            "persisted_fact_ids": fact_ids,
            "final_response": state.get("final_response") or state.get("llm_response", ""),
            "inter_agent_bus": bus,
            "updated_at": utc_now(),
            "trace": add_trace(
                state,
                "memory",
                "completed",
                latency_ms=elapsed_ms(node_start),
                stored_count=len(stored),
                fact_ids=fact_ids,
            ),
        }
    except Exception as exc:
        update = _failure_update(state, "memory", exc)
        update["final_response"] = state.get("final_response") or state.get("llm_response", "")
        return update


def _accept_node(state: HalluciGuardState) -> dict[str, Any]:
    """
    Terminal node that accepts the response without further verification or correction.

    Args:
        state: The current pipeline state.

    Returns:
        A state update dictionary marking the response as accepted.
    """
    return {
        "final_response": state.get("llm_response", ""),
        "terminal_status": "accepted",
        "verification_status": "accepted",
        "updated_at": utc_now(),
        "trace": add_trace(
            state, "accept", "completed", reason="accepted by detector/supervisor"
        ),
    }


def _reject_node(state: HalluciGuardState) -> dict[str, Any]:
    """
    Terminal node that rejects the response due to unresolvable contradictions or failures.

    Args:
        state: The current pipeline state.

    Returns:
        A state update dictionary marking the response as rejected with a fallback message.
    """
    msg = "The draft response could not be safely verified and has been rejected."
    return {
        "final_response": msg,
        "terminal_status": "rejected",
        "verification_status": "rejected",
        "updated_at": utc_now(),
        "trace": add_trace(
            state, "reject", "completed", decision="REJECT"
        ),
    }


def _human_escalation_node(state: HalluciGuardState) -> dict[str, Any]:
    """
    Terminal node that escalates the response to human review due to errors or judge abstention.

    Args:
        state: The current pipeline state.

    Returns:
        A state update dictionary marking the response for human review with a fallback message.
    """
    msg = "This response requires human review before it can be delivered."
    return {
        "final_response": msg,
        "terminal_status": "human_review",
        "verification_status": "human_review_required",
        "updated_at": utc_now(),
        "trace": add_trace(
            state,
            "human_escalation",
            "completed",
            errors=state.get("errors", []),
        ),
    }


def build_verification_graph(
    node_overrides: dict[str, Callable[..., Any]] | None = None,
):
    """Build and compile the LangGraph verification pipeline with all nodes and edges."""
    nodes = {
        "generate": _generate_node,
        "detector": _detector_node,
        "accept": _accept_node,
        "verifier": _verifier_node,
        "judge": _judge_node,
        "corrector": _corrector_node,
        "reverifier": _reverifier_node,
        "reject": _reject_node,
        "human_escalation": _human_escalation_node,
        "memory": _memory_node,
    }
    if node_overrides:
        nodes.update(node_overrides)

    graph = StateGraph(HalluciGuardState)
    for name, fn in nodes.items():
        graph.add_node(name, fn)

    graph.add_edge(START, "generate")
    graph.add_conditional_edges(
        "generate",
        _generate_route,
        {"detector": "detector", "human_escalation": "human_escalation"},
    )
    graph.add_conditional_edges(
        "detector",
        _detector_route,
        {"verifier": "verifier", "accept": "accept", "human_escalation": "human_escalation"},
    )
    graph.add_conditional_edges(
        "verifier",
        _verifier_route,
        {"judge": "judge", "human_escalation": "human_escalation"},
    )
    graph.add_conditional_edges(
        "judge",
        _judge_route,
        {
            "memory": "memory",
            "corrector": "corrector",
            "verifier": "verifier",
            "reject": "reject",
            "human_escalation": "human_escalation",
        },
    )
    graph.add_conditional_edges(
        "corrector",
        _corrector_route,
        {"reverifier": "reverifier", "human_escalation": "human_escalation"},
    )
    graph.add_conditional_edges(
        "reverifier",
        _reverifier_route,
        {"judge": "judge", "human_escalation": "human_escalation"},
    )
    # Every terminal outcome crosses the Memory boundary for an auditable trace;
    # Memory itself only persists Judge-accepted, verified claims.
    graph.add_edge("accept", "memory")
    graph.add_edge("reject", "memory")
    graph.add_edge("human_escalation", "memory")
    graph.add_edge("memory", END)

    return graph.compile()


_GRAPH = None


def get_verification_graph():
    """Get the singleton verification graph instance, building it if necessary."""
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_verification_graph()
    return _GRAPH


async def run_verification(
    user_query: str,
    llm_response: str = "",
    domain: str = "general",
    request_id: str | None = None,
    generation_mode: str = "normal",
    conversation_history: list[dict[str, str]] | None = None,
) -> HalluciGuardState:
    """Run the complete verification pipeline and return the final state."""
    execution_id = str(uuid.uuid4())
    now = utc_now()
    active_agents = [
        "base_llm",
        "detector",
        "verifier",
        "judge",
        "corrector",
        "reverifier",
        "memory",
    ]
    disabled_agents: list[str] = []

    return await get_verification_graph().ainvoke(
        {
            "execution_id": execution_id,
            "request_id": request_id or execution_id,
            "user_query": user_query,
            "llm_response": llm_response,
            "draft_response": llm_response,
            "draft_answer": llm_response,
            "generation_mode": generation_mode,
            "conversation_history": conversation_history or [],
            "domain": domain,
            "active_agents": active_agents,
            "disabled_agents": disabled_agents,
            "retry_count": 0,
            "max_retries": 2,
            "correction_attempt_count": 0,
            "reverification_attempt_count": 0,
            "created_at": now,
            "updated_at": now,
            "inter_agent_bus": [],
            "trace": [],
            "errors": [],
            "audit": {
                "graph": "halluciguard_production_supervisor",
                "base_llm": "openrouter_qwen",
                "active_agents": active_agents,
                "disabled_agents": disabled_agents,
            },
        }
    )
