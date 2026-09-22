"""
Re-verification claim-lineage safety regression suite.

This suite locks the critical safety invariant repaired in the reverifier +
judge lifecycle:

    A claim that was originally CONTRADICTED and entered correction cannot be
    laundered into ACCEPTED merely because a fresh, broad re-verification of the
    (possibly unchanged) candidate text happens to return zero contradictions.

Historically the reverifier computed correction_successful purely from
`contradicted_count == 0` on a re-extracted-from-candidate verification, with no
lineage check. When the Corrector failed (TERMINATED_UNRESOLVED / unchanged
text) but the second verification pass returned no contradictions (retrieval
variance, or the contradiction degrading to "unverified"), the failed
correction was accepted and the hallucination was persisted to Memory.

Scenarios covered (prompt scenarios F & G):
  F — Forced correction FAILURE (corrector returns TERMINATED_UNRESOLVED with
      unchanged text) while re-verification incidentally reports 0
      contradictions. Must NOT pass; must NOT be ACCEPTED.
  G — Corrector produces a genuine, applied, text-changing correction that the
      re-verifier confirms SUPPORTED. Must pass (control case — proves the gate
      is not simply "always fail").
"""

from __future__ import annotations

import uuid

import pytest

from orchestration.graph import _reverifier_node, _judge_node
from orchestration.schemas import ExecutionStatus, JudgeDecision
from orchestration.state import HalluciGuardState


def _base_state(**kwargs) -> HalluciGuardState:
    state: HalluciGuardState = {
        "execution_id": str(uuid.uuid4()),
        "request_id": str(uuid.uuid4()),
        "user_query": "Who created Python?",
        "llm_response": "Python was created by Elon Musk in 1999.",
        "draft_response": "Python was created by Elon Musk in 1999.",
        "draft_answer": "Python was created by Elon Musk in 1999.",
        "domain": "general",
        "generation_mode": "normal",
        "max_retries": 2,
        "retry_count": 0,
        "correction_attempt_count": 1,
        "reverification_attempt_count": 0,
        "correction_required": True,
        "trace": [],
        "errors": [],
        "inter_agent_bus": [],
    }
    state.update(kwargs)
    return state


def _clean_verify_pipeline():
    """A verifier that returns a *clean* (no contradiction) result for whatever
    candidate text it is given — this is the adversarial condition that used to
    launder a failed correction into acceptance."""

    class MockVerifierPipeline:
        async def verify(self, payload):
            return {
                "query_id": payload.query_id,
                "domain": payload.domain,
                "overall_evidence_confidence": 0.9,
                "claim_evidence": [
                    {
                        "claim_id": "c1",
                        "claim_text": "Python was created by Elon Musk in 1999.",
                        # NOTE: verifier returns 'verified' for the unchanged
                        # hallucinated text (the adversarial variance case).
                        "verdict": "verified",
                        "support_score": 0.9,
                        "contradiction_score": 0.1,
                        "evidence": [
                            {
                                "evidence_id": "ev-1",
                                "source": "SomeSource",
                                "snippet": "A passage mentioning Python and Elon Musk.",
                                "entailment_label": "entailment",
                                "entailment_score": 0.9,
                                "credibility_score": 0.9,
                            }
                        ],
                    }
                ],
            }

    from unittest.mock import MagicMock

    return (
        MockVerifierPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )


@pytest.mark.asyncio
async def test_scenario_f_failed_correction_not_laundered_by_clean_reverify(monkeypatch):
    """Corrector FAILED (unresolved, text unchanged) + clean re-verification
    must NOT be laundered into a passing correction."""
    monkeypatch.setattr("orchestration.graph._verifier_imports", _clean_verify_pipeline)

    # Corrector failed: unchanged text, TERMINATED_UNRESOLVED, unresolved claim.
    unchanged = "Python was created by Elon Musk in 1999."
    state = _base_state(
        correction_status="unresolved",
        correction_result={
            "original_text": unchanged,
            "corrected_text": unchanged,  # unchanged == failure
            "changed_claims": [
                {"claim_id": "c1", "action": "unresolved", "corrected": "", "original": unchanged}
            ],
            "validation_status": "warning",
            "status": ExecutionStatus.TERMINATED_UNRESOLVED.value,
        },
        final_response=unchanged,
    )

    rev_update = await _reverifier_node(state)
    rev = rev_update["reverification_result"]

    # The lineage gate must fail closed despite the clean re-verification.
    assert rev["passed"] is False, "Failed correction must not pass re-verification"
    assert rev["correction_successful"] is False
    assert rev["remaining_contradictions"] >= 1, (
        "A required-but-unresolved correction must surface a remaining contradiction"
    )

    # Judge must not ACCEPT.
    state.update(rev_update)
    judge_update = await _judge_node(state)
    assert judge_update["judge_decision"] != JudgeDecision.ACCEPT.value, (
        "Judge must never ACCEPT a laundered failed correction"
    )


@pytest.mark.asyncio
async def test_scenario_f_model_unavailable_not_laundered(monkeypatch):
    """A DEGRADED/model-unavailable correction (unchanged text) must also fail closed."""
    monkeypatch.setattr("orchestration.graph._verifier_imports", _clean_verify_pipeline)

    unchanged = "Python was created by Elon Musk in 1999."
    state = _base_state(
        correction_status="failed",
        correction_result={
            "original_text": unchanged,
            "corrected_text": unchanged,
            "changed_claims": [
                {"claim_id": "c1", "action": "model_unavailable", "corrected": "", "original": unchanged}
            ],
            "validation_status": "unvalidated",
            "status": ExecutionStatus.DEGRADED.value,
        },
        final_response=unchanged,
    )

    rev_update = await _reverifier_node(state)
    rev = rev_update["reverification_result"]
    assert rev["passed"] is False
    assert rev["correction_successful"] is False


@pytest.mark.asyncio
async def test_scenario_g_genuine_correction_passes(monkeypatch):
    """Control: an applied, text-changing correction whose corrected claim
    re-verifies SUPPORTED must pass (proves the gate is not a blanket fail)."""

    corrected = "Python was created by Guido van Rossum."

    class MockVerifierPipeline:
        async def verify(self, payload):
            return {
                "query_id": payload.query_id,
                "domain": payload.domain,
                "overall_evidence_confidence": 0.98,
                "claim_evidence": [
                    {
                        "claim_id": "c1",
                        "claim_text": corrected,
                        "verdict": "verified",
                        "support_score": 0.99,
                        "contradiction_score": 0.01,
                        "evidence": [
                            {
                                "evidence_id": "ev-1",
                                "source": "Python Foundation",
                                "snippet": "Guido van Rossum created Python in 1991.",
                                "entailment_label": "entailment",
                                "entailment_score": 0.99,
                                "credibility_score": 0.99,
                            }
                        ],
                    }
                ],
            }

    from unittest.mock import MagicMock

    monkeypatch.setattr(
        "orchestration.graph._verifier_imports",
        lambda: (
            MockVerifierPipeline,
            MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
            MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
        ),
    )

    original = "Python was created by Elon Musk in 1999."
    state = _base_state(
        correction_status="applied",
        correction_result={
            "original_text": original,
            "corrected_text": corrected,  # genuinely changed
            "changed_claims": [
                {"claim_id": "c1", "action": "corrected", "corrected": corrected, "original": original}
            ],
            "validation_status": "valid",
            "status": ExecutionStatus.COMPLETED.value,
        },
        final_response=corrected,
    )

    rev_update = await _reverifier_node(state)
    rev = rev_update["reverification_result"]
    assert rev["passed"] is True, "A genuine, applied, verified correction must pass"
    assert rev["correction_successful"] is True
    assert rev["remaining_contradictions"] == 0

    state.update(rev_update)
    judge_update = await _judge_node(state)
    assert judge_update["judge_decision"] == JudgeDecision.ACCEPT.value


@pytest.mark.asyncio
async def test_judge_rejects_inconsistent_reverification_defense_in_depth():
    """Defense-in-depth: even if a ReverificationResult arrives with the
    internally-inconsistent combination (passed=True, remaining=0) but
    correction_successful=False, the Judge must NOT ACCEPT. This guards paths
    other than the primary reverifier node (dict fallbacks, external callers)."""
    from agents.judge_agent.judge_agent import JudgeAgent
    from orchestration.schemas import ReverificationResult, VerifierResult

    vr = VerifierResult(
        query_id="q",
        domain="general",
        claim_reports=[],
        evidence=[],
        overall_confidence=0.9,
        status=ExecutionStatus.COMPLETED,
    )
    rev = ReverificationResult(
        passed=True,
        verifier_result=vr,
        remaining_contradictions=0,
        correction_successful=False,  # lineage says correction did NOT succeed
    )
    judge = JudgeAgent()
    result = judge.evaluate(verifier_result=vr, reverification_result=rev, retry_count=2)
    assert result.decision != JudgeDecision.ACCEPT, (
        "Judge must not ACCEPT when correction_successful is False, "
        "even if passed=True and remaining_contradictions=0"
    )
