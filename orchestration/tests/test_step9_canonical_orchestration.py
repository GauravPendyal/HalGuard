"""
Step 9 — Canonical End-to-End Orchestration Integration Test Suite.

Verifies:
  A. Verifier receives generated LLM response (not user query).
  B. Detector LOW risk routes to VERIFIER by default; fast path is explicit opt-in.
  C. Detector HIGH/MEDIUM risk routes to VERIFIER.
  D. Detector operator override ALWAYS_VERIFY=true.
  E. Judge ACCEPT route -> memory.
  F. Judge REJECT route -> reject.
  G. Judge ABSTAIN route -> human_escalation.
  H. Judge CORRECT route -> corrector.
  I. Corrector invocation through canonical CorrectionRequest -> CorrectionResult.
  J. Corrector -> Re-verifier handoff.
  K. Re-verifier -> Judge canonical ReverificationResult.
  L. Successful correction loop (Judge CORRECT -> Corrector -> Reverifier -> Judge ACCEPT -> Memory).
  M. Failed reverification detection.
  N. Retry exhaustion safe termination.
  O. Hard upper bound: no infinite loop.
  P. Memory only receives valid verified facts and emits MemoryResult.
  Q. Execution trace reflects actual executed nodes.
"""

from __future__ import annotations

import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from orchestration.graph import (
    _detector_node,
    _detector_route,
    _judge_node,
    _judge_route,
    _verifier_node,
    _verifier_route,
    _corrector_node,
    _reverifier_node,
    _memory_node,
    build_verification_graph,
)
from orchestration.schemas import (
    ClaimReport,
    CorrectionRequest,
    CorrectionResult,
    DetectorResult,
    Evidence,
    ExecutionStatus,
    JudgeDecision,
    JudgeResult,
    MemoryResult,
    MemoryStatus,
    NextAction,
    ReverificationResult,
    RiskLevel,
    SeverityLevel,
    ValidationStatus,
    VerdictLabel,
    VerifierResult,
)
from orchestration.state import HalluciGuardState, add_trace


def make_base_state(**kwargs) -> HalluciGuardState:
    base: HalluciGuardState = {
        "execution_id": str(uuid.uuid4()),
        "request_id": str(uuid.uuid4()),
        "user_query": "Who created Python?",
        "llm_response": "Python was created by Elon Musk in 1999.",
        "draft_response": "Python was created by Elon Musk in 1999.",
        "generation_mode": "normal",
        "domain": "general",
        "active_agents": [
            "base_llm",
            "detector",
            "verifier",
            "judge",
            "corrector",
            "reverifier",
            "memory",
        ],
        "disabled_agents": [],
        "retry_count": 0,
        "max_retries": 2,
        "correction_attempt_count": 0,
        "reverification_attempt_count": 0,
        "trace": [],
        "errors": [],
        "inter_agent_bus": [],
    }
    base.update(kwargs)
    return base


# ===========================================================================
# A. Verifier Input Boundary Regression Test
# ===========================================================================

@pytest.mark.asyncio
async def test_verifier_receives_llm_response_not_user_query(monkeypatch):
    """Regression test: Verifier node must construct suspicious claim from the
    generated LLM response, NOT from state.user_query."""
    captured_payload = None

    class MockPipeline:
        async def verify(self, payload):
            nonlocal captured_payload
            captured_payload = payload
            mock_out = MagicMock()
            mock_out.claim_evidence = []
            mock_out.overall_evidence_confidence = 0.9
            mock_out.query_id = payload.query_id
            mock_out.domain = payload.domain
            return mock_out

    mock_imports = (
        MockPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )
    monkeypatch.setattr("orchestration.graph._verifier_imports", lambda: mock_imports)

    state = make_base_state(
        user_query="Who created Python?",
        llm_response="Python was created by Elon Musk in 1999.",
    )

    await _verifier_node(state)

    assert captured_payload is not None
    # Suspicious claims passed to pipeline must be the LLM response, NOT the query
    suspicious_claim = captured_payload.suspicious_claims[0]
    assert suspicious_claim.text == "Python was created by Elon Musk in 1999."
    assert suspicious_claim.text != "Who created Python?"


# ===========================================================================
# B. Detector Low-Risk Routing (Fast Path)
# ===========================================================================

@pytest.mark.asyncio
async def test_detector_low_risk_routes_to_accept(monkeypatch):
    """Explicitly enabled low-risk fast path may bypass verification."""
    class StubDetector:
        def detect(self, query, response):
            return {
                "hallucination_probability": 0.08,
                "confidence_score": 0.92,
                "risk_level": "LOW",
                "next_action": "Accept",
                "model_source": "halueval-distilbert",
            }

    monkeypatch.setattr(
        "agents.detector_agent.detector.DetectorAgent",
        lambda *a, **k: StubDetector(),
    )
    monkeypatch.setenv("ALWAYS_VERIFY", "false")
    monkeypatch.setenv("ALLOW_DETECTOR_FAST_PATH", "true")

    state = make_base_state()
    res = await _detector_node(state)

    assert res["route"] == "accept"
    assert res["verification_status"] == "detector_safe_fast_path"
    assert res["detector_result"]["risk_level"] == "LOW"
    assert _detector_route(res) == "accept"


@pytest.mark.asyncio
async def test_detector_low_risk_verifies_by_default(monkeypatch):
    """The safe production default sends even LOW-risk drafts to evidence verification."""
    class StubDetector:
        def detect(self, query, response):
            return {
                "hallucination_probability": 0.08,
                "confidence_score": 0.92,
                "risk_level": "LOW",
                "next_action": "Accept",
                "model_source": "halueval-distilbert",
                "status": "completed",
            }

    monkeypatch.setattr(
        "agents.detector_agent.detector.DetectorAgent",
        lambda *a, **k: StubDetector(),
    )
    monkeypatch.delenv("ALLOW_DETECTOR_FAST_PATH", raising=False)
    monkeypatch.delenv("ALWAYS_VERIFY", raising=False)

    res = await _detector_node(make_base_state())

    assert res["route"] == "verify"
    assert res["verification_status"] == "verification_required"
    assert _detector_route(res) == "verifier"


# ===========================================================================
# C. Detector High/Medium-Risk Routing
# ===========================================================================

@pytest.mark.asyncio
async def test_detector_high_risk_routes_to_verifier(monkeypatch):
    """High risk detection must route to 'verifier'."""
    class StubDetector:
        def detect(self, query, response):
            return {
                "hallucination_probability": 0.85,
                "confidence_score": 0.90,
                "risk_level": "HIGH",
                "next_action": "Verify",
                "model_source": "halueval-distilbert",
            }

    monkeypatch.setattr(
        "agents.detector_agent.detector.DetectorAgent",
        lambda *a, **k: StubDetector(),
    )
    monkeypatch.setenv("ALWAYS_VERIFY", "false")

    state = make_base_state()
    res = await _detector_node(state)

    assert res["route"] == "verify"
    assert res["verification_status"] == "verification_required"
    assert _detector_route(res) == "verifier"


# ===========================================================================
# D. Detector Debug / Operator Override (ALWAYS_VERIFY=true)
# ===========================================================================

@pytest.mark.asyncio
async def test_detector_always_verify_override(monkeypatch):
    """Setting ALWAYS_VERIFY=true forces verification even when risk is LOW."""
    class StubDetector:
        def detect(self, query, response):
            return {
                "hallucination_probability": 0.05,
                "confidence_score": 0.95,
                "risk_level": "LOW",
                "next_action": "Accept",
                "model_source": "halueval-distilbert",
            }

    monkeypatch.setattr(
        "agents.detector_agent.detector.DetectorAgent",
        lambda *a, **k: StubDetector(),
    )
    monkeypatch.setenv("ALWAYS_VERIFY", "true")

    state = make_base_state()
    res = await _detector_node(state)

    assert res["route"] == "verify"
    assert _detector_route(res) == "verifier"


# ===========================================================================
# E. Judge Routing Decisions (ACCEPT, REJECT, ABSTAIN, CORRECT)
# ===========================================================================

def test_judge_routes():
    assert _judge_route({"judge_decision": "ACCEPT"}) == "memory"
    assert _judge_route({"judge_decision": "REJECT"}) == "reject"
    assert _judge_route({"judge_decision": "ABSTAIN"}) == "human_escalation"
    assert _judge_route({"judge_decision": "VERIFY_AGAIN", "retry_count": 0, "max_retries": 2}) == "verifier"
    assert _judge_route({"judge_decision": "VERIFY_AGAIN", "retry_count": 2, "max_retries": 2}) == "human_escalation"
    assert _judge_route({"judge_decision": "CORRECT", "correction_attempt_count": 0, "max_retries": 2}) == "corrector"
    assert _judge_route({"judge_decision": "CORRECT", "correction_attempt_count": 2, "max_retries": 2}) == "reject"


# ===========================================================================
# H & I. Corrector Invocation Through Canonical Contract
# ===========================================================================

@pytest.mark.asyncio
async def test_corrector_node_invoked_via_canonical_contract(monkeypatch):
    """Corrector node receives CorrectionRequest and returns canonical CorrectionResult."""
    received_request = None

    class MockCorrectorAgent:
        def correct(self, req):
            nonlocal received_request
            received_request = req
            return CorrectionResult(
                original_text=req.original_response,
                corrected_text="Python was created by Guido van Rossum in 1991.",
                changed_claims=[{"claim_id": "c1", "action": "corrected"}],
                validation_status=ValidationStatus.VALID,
                attempt_count=1,
                status=ExecutionStatus.COMPLETED,
            )

    monkeypatch.setattr(
        "agents.corrector_agent.corrector.CorrectorAgent",
        MockCorrectorAgent,
    )
    monkeypatch.setenv("HG_CORRECTOR_PROVIDER", "local")

    req = CorrectionRequest(
        execution_id="ex-100",
        user_query="Who created Python?",
        original_response="Python was created by Elon Musk in 1999.",
        claims_to_correct=[
            ClaimReport(
                claim_id="c1",
                claim_text="Python was created by Elon Musk in 1999.",
                verdict=VerdictLabel.CONTRADICTED,
            )
        ],
    )
    state = make_base_state(correction_request=req.model_dump())

    res = await _corrector_node(state)

    assert received_request is not None
    assert isinstance(received_request, CorrectionRequest)
    assert received_request.original_response == "Python was created by Elon Musk in 1999."

    assert "correction_result" in res
    corr_res = res["correction_result"]
    assert corr_res["corrected_text"] == "Python was created by Guido van Rossum in 1991."
    assert corr_res["validation_status"] == "valid"
    assert res["correction_attempt_count"] == 1
    assert res["route"] == "reverifier"


# ===========================================================================
# J & K. Corrector -> Re-verifier -> Judge Handoff
# ===========================================================================

@pytest.mark.asyncio
async def test_reverifier_node_produces_canonical_reverification_result(monkeypatch):
    """Reverifier node verifies candidate text and produces ReverificationResult."""
    class MockPipeline:
        async def verify(self, payload):
            return {
                "claim_evidence": [
                    {
                        "claim_id": "rev-1",
                        "claim_text": "Python was created by Guido van Rossum in 1991.",
                        "verdict": "verified",
                        "support_score": 0.98,
                        "evidence": [
                            {
                                "source": "wikipedia",
                                "snippet": "Guido van Rossum began developing Python in 1989.",
                                "entailment_label": "entailment",
                            }
                        ],
                    }
                ],
                "overall_evidence_confidence": 0.95,
                "query_id": payload.query_id,
                "domain": payload.domain,
            }

    mock_imports = (
        MockPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )
    monkeypatch.setattr("orchestration.graph._verifier_imports", lambda: mock_imports)

    corr_res = CorrectionResult(
        original_text="Python was created by Elon Musk in 1999.",
        corrected_text="Python was created by Guido van Rossum in 1991.",
        validation_status=ValidationStatus.VALID,
        attempt_count=1,
    )
    state = make_base_state(correction_result=corr_res.model_dump())

    res = await _reverifier_node(state)

    assert "reverification_result" in res
    rev_res = res["reverification_result"]
    assert rev_res["passed"] is True
    assert rev_res["remaining_contradictions"] == 0
    assert res["route"] == "judge"
    assert res["reverification_attempt_count"] == 1


# ===========================================================================
# L. Successful End-to-End Correction Loop
# ===========================================================================

@pytest.mark.asyncio
async def test_successful_end_to_end_correction_loop():
    """Graph executes: Judge CORRECT -> Corrector -> Reverifier PASS -> Judge ACCEPT -> Memory."""
    judge_call_count = 0

    async def mock_detector(s):
        return {
            "route": "verify",
            "trace": add_trace(s, "detector", "completed"),
        }

    async def mock_verifier(s):
        return {
            "verifier_result": VerifierResult(
                query_id="q1",
                domain="general",
                claim_reports=[
                    ClaimReport(
                        claim_id="c1",
                        claim_text="Python was created by Elon Musk.",
                        verdict=VerdictLabel.CONTRADICTED,
                        contradiction_score=0.95,
                    )
                ],
                overall_confidence=0.8,
            ).model_dump(),
            "route": "judge",
            "trace": add_trace(s, "verifier", "completed"),
        }

    async def mock_judge(s):
        nonlocal judge_call_count
        judge_call_count += 1
        rev_res = s.get("reverification_result")
        if rev_res and rev_res.get("passed"):
            return {
                "judge_decision": "ACCEPT",
                "route": "memory",
                "trace": add_trace(s, "judge", "completed", decision="ACCEPT"),
            }
        else:
            req = CorrectionRequest(
                execution_id="ex-1",
                user_query=s.get("user_query", ""),
                original_response=s.get("llm_response", ""),
                claims_to_correct=[
                    ClaimReport(claim_id="c1", claim_text="Python was created by Elon Musk.", verdict=VerdictLabel.CONTRADICTED)
                ],
            )
            return {
                "judge_decision": "CORRECT",
                "correction_request": req.model_dump(),
                "route": "corrector",
                "trace": add_trace(s, "judge", "completed", decision="CORRECT"),
            }

    async def mock_corrector(s):
        return {
            "correction_result": {
                "original_text": s.get("llm_response", ""),
                "corrected_text": "Python was created by Guido van Rossum.",
                "validation_status": "valid",
                "attempt_count": 1,
            },
            "final_response": "Python was created by Guido van Rossum.",
            "correction_attempt_count": s.get("correction_attempt_count", 0) + 1,
            "route": "reverifier",
            "trace": add_trace(s, "corrector", "completed"),
        }

    async def mock_reverifier(s):
        v_res = VerifierResult(
            query_id="rev-q1",
            domain="general",
            claim_reports=[
                ClaimReport(
                    claim_id="rev-c1",
                    claim_text="Python was created by Guido van Rossum.",
                    verdict=VerdictLabel.VERIFIED,
                    support_score=0.99,
                    evidence=[
                        Evidence(
                            evidence_id="e1",
                            source="wikipedia",
                            snippet="Guido created Python.",
                            entailment_label="entailment",
                        )
                    ],
                )
            ],
            overall_confidence=0.95,
        )
        return {
            "reverification_result": {
                "passed": True,
                "remaining_contradictions": 0,
                "verifier_result": v_res.model_dump(),
                "status": "completed",
            },
            "reverification_attempt_count": s.get("reverification_attempt_count", 0) + 1,
            "route": "judge",
            "trace": add_trace(s, "reverifier", "completed"),
        }

    async def mock_memory(s):
        return {
            "memory": {"count": 1},
            "final_response": s.get("final_response", ""),
            "terminal_status": "accepted",
            "trace": add_trace(s, "memory", "completed"),
        }

    graph = build_verification_graph(
        node_overrides={
            "detector": mock_detector,
            "verifier": mock_verifier,
            "judge": mock_judge,
            "corrector": mock_corrector,
            "reverifier": mock_reverifier,
            "memory": mock_memory,
        }
    )

    state = make_base_state()
    final_state = await graph.ainvoke(state)

    nodes = [event["node"] for event in final_state["trace"]]
    assert "detector" in nodes
    assert "verifier" in nodes
    assert "judge" in nodes
    assert "corrector" in nodes
    assert "reverifier" in nodes
    assert "memory" in nodes
    assert final_state["final_response"] == "Python was created by Guido van Rossum."
    assert judge_call_count == 2  # Evaluated twice: pre-correction and post-reverification


# ===========================================================================
# M, N & O. Failed Reverification & Bounded Retry Exhaustion (No Infinite Loop)
# ===========================================================================

@pytest.mark.asyncio
async def test_reverification_failure_retry_exhaustion_terminates_safely():
    """Persistent reverification failure terminates at max_retries without infinite loop."""
    corrector_count = 0

    async def mock_detector(s):
        return {"route": "verify", "trace": add_trace(s, "detector", "completed")}

    async def mock_verifier(s):
        return {"route": "judge", "trace": add_trace(s, "verifier", "completed")}

    async def mock_judge(s):
        return {
            "judge_decision": "CORRECT",
            "route": "corrector",
            "trace": add_trace(s, "judge", "completed", decision="CORRECT"),
        }

    async def mock_corrector(s):
        nonlocal corrector_count
        corrector_count += 1
        return {
            "correction_result": {"corrected_text": "Failed attempt", "validation_status": "invalid"},
            "correction_attempt_count": s.get("correction_attempt_count", 0) + 1,
            "route": "reverifier",
            "trace": add_trace(s, "corrector", "completed"),
        }

    async def mock_reverifier(s):
        return {
            "reverification_result": {
                "passed": False,
                "remaining_contradictions": 1,
                "status": "completed",
            },
            "reverification_attempt_count": s.get("reverification_attempt_count", 0) + 1,
            "route": "judge",
            "trace": add_trace(s, "reverifier", "completed"),
        }

    graph = build_verification_graph(
        node_overrides={
            "detector": mock_detector,
            "verifier": mock_verifier,
            "judge": mock_judge,
            "corrector": mock_corrector,
            "reverifier": mock_reverifier,
        }
    )

    state = make_base_state(max_retries=2)
    final_state = await graph.ainvoke(state)

    nodes = [event["node"] for event in final_state["trace"]]
    # Must hit reject after retry budget is exhausted
    assert "reject" in nodes
    assert final_state["terminal_status"] == "rejected"
    # Corrector must only run exactly max_retries (2) times, preventing infinite loop
    assert corrector_count == 2


# ===========================================================================
# P. Memory Only Receives Valid Verified Facts & Emits MemoryResult
# ===========================================================================

@pytest.mark.asyncio
async def test_memory_only_persists_verified_facts_and_emits_memory_result(monkeypatch):
    """Memory agent must persist verified facts and emit canonical MemoryResult."""
    stored_requests = []

    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            stored_requests.append(req)
            return {"fact_id": f"fact-{len(stored_requests)}", "status": "stored"}

    monkeypatch.setattr(
        "agents.memory_agent.memory.memory_agent.MemoryAgent",
        MockMemoryAgent,
    )

    # Reverification result with 1 verified fact
    v_res = VerifierResult(
        query_id="q1",
        domain="general",
        claim_reports=[
            ClaimReport(
                claim_id="c1",
                claim_text="Python was created by Guido van Rossum.",
                verdict=VerdictLabel.VERIFIED,
                support_score=0.95,
                evidence=[
                    Evidence(
                        evidence_id="e1",
                        source="Wikipedia",
                        snippet="Guido created Python.",
                        entailment_label="entailment",
                    )
                ],
            )
        ],
        overall_confidence=0.95,
    )
    rev_res = ReverificationResult(
        passed=True,
        remaining_contradictions=0,
        verifier_result=v_res,
        status=ExecutionStatus.COMPLETED,
    )

    state = make_base_state(
        reverification_result=rev_res.model_dump(),
        final_response="Python was created by Guido van Rossum.",
    )

    res = await _memory_node(state)

    assert len(stored_requests) == 1
    assert stored_requests[0].claim_text == "Python was created by Guido van Rossum."
    assert "memory_result" in res
    mem_res = res["memory_result"]
    assert mem_res["status"] == "stored"
    assert mem_res["stored_count"] == 1


# ===========================================================================
# Q. Execution Trace Accurately Reflects Executed Nodes
# ===========================================================================

@pytest.mark.asyncio
async def test_execution_trace_accuracy():
    """Trace events accurately document executed pipeline nodes."""
    state = make_base_state()
    trace = add_trace(state, "base_llm", "completed", latency_ms=12)
    state["trace"] = trace
    trace = add_trace(state, "detector", "completed", latency_ms=8, risk_level="LOW")
    state["trace"] = trace
    trace = add_trace(state, "accept", "completed")
    state["trace"] = trace

    node_names = [e["node"] for e in state["trace"]]
    assert node_names == ["base_llm", "detector", "accept"]
    assert "verifier" not in node_names
    assert "judge" not in node_names
    assert "corrector" not in node_names


# ===========================================================================
# R. VERIFY_AGAIN Retrieval Loop Bounding (Safe Termination)
# ===========================================================================

@pytest.mark.asyncio
async def test_verify_again_loop_bounds_safe_termination():
    """Repeated VERIFY_AGAIN decisions increment retry_count and terminate safely at max_retries."""
    verifier_call_count = 0

    async def mock_detector(s):
        return {"route": "verify", "trace": add_trace(s, "detector", "completed")}

    async def mock_verifier(s):
        nonlocal verifier_call_count
        verifier_call_count += 1
        return {
            "verifier": {"claim_evidence": []},
            "judge_pairs": [],
            "route": "judge",
            "trace": add_trace(s, "verifier", "completed"),
        }

    graph = build_verification_graph(
        node_overrides={
            "detector": mock_detector,
            "verifier": mock_verifier,
        }
    )

    state = make_base_state(max_retries=2)
    final_state = await graph.ainvoke(state)

    nodes = [e["node"] for e in final_state["trace"]]
    assert "human_escalation" in nodes
    assert final_state["terminal_status"] == "human_review"
    # Verifier must be called at most initial + max_retries = 3 times
    assert verifier_call_count <= 3
    assert final_state.get("retry_count", 0) >= 2


# ===========================================================================
# S. Memory Safety on Failed Reverification & Rejected Decisions
# ===========================================================================

@pytest.mark.asyncio
async def test_memory_safety_rejects_failed_reverification(monkeypatch):
    """Memory node must NEVER persist claims from a failed reverification."""
    stored_requests = []

    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            stored_requests.append(req)
            return {"fact_id": "f1"}

    monkeypatch.setattr(
        "agents.memory_agent.memory.memory_agent.MemoryAgent",
        MockMemoryAgent,
    )

    # Reverification result that FAILED with 1 contradiction
    v_res = VerifierResult(
        query_id="q1",
        domain="general",
        claim_reports=[
            ClaimReport(
                claim_id="c1",
                claim_text="Still contradicted fact.",
                verdict=VerdictLabel.CONTRADICTED,
            )
        ],
        overall_confidence=0.5,
    )
    rev_res = ReverificationResult(
        passed=False,
        remaining_contradictions=1,
        verifier_result=v_res,
        status=ExecutionStatus.COMPLETED,
    )

    state = make_base_state(
        reverification_result=rev_res.model_dump(),
        judge_decision="REJECT",
    )

    res = await _memory_node(state)

    assert len(stored_requests) == 0
    assert res["memory_result"]["status"] == "skipped"
    assert res["memory_result"]["stored_count"] == 0


@pytest.mark.asyncio
async def test_memory_safety_rejects_non_accept_judge_decision(monkeypatch):
    """Memory node must not persist anything if Judge decision was not ACCEPT."""
    stored_requests = []

    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            stored_requests.append(req)
            return {"fact_id": "f1"}

    monkeypatch.setattr(
        "agents.memory_agent.memory.memory_agent.MemoryAgent",
        MockMemoryAgent,
    )

    # Verifier had verified claims, but Judge decided ABSTAIN due to policy
    v_res = VerifierResult(
        query_id="q1",
        domain="general",
        claim_reports=[
            ClaimReport(
                claim_id="c1",
                claim_text="Some fact.",
                verdict=VerdictLabel.VERIFIED,
            )
        ],
        overall_confidence=0.9,
    )

    state = make_base_state(
        verifier_result=v_res.model_dump(),
        judge_decision="ABSTAIN",
    )

    res = await _memory_node(state)

    assert len(stored_requests) == 0
    assert res["memory_result"]["status"] == "skipped"
    assert res["memory_result"]["stored_count"] == 0


# ===========================================================================
# T. Real CorrectorAgent Canonical Contract Fail-Closed Execution
# ===========================================================================

def test_real_corrector_agent_fails_closed_without_model():
    """Real CorrectorAgent class without weights fails closed, preserving original text."""
    from agents.corrector_agent.corrector import CorrectorAgent
    from agents.corrector_agent.corrector.config import CorrectorConfig

    req = CorrectionRequest(
        execution_id="ex-fail-closed",
        user_query="Who created Python?",
        original_response="Python was created by Elon Musk.",
        claims_to_correct=[
            ClaimReport(
                claim_id="c1",
                claim_text="Python was created by Elon Musk.",
                verdict=VerdictLabel.CONTRADICTED,
            )
        ],
    )

    cfg = CorrectorConfig(model_path="/nonexistent/model")
    agent = CorrectorAgent(config=cfg)
    result = agent.correct(req)

    assert isinstance(result, CorrectionResult)
    assert result.original_text == "Python was created by Elon Musk."
    assert result.corrected_text == "Python was created by Elon Musk."
    assert result.validation_status in ("unvalidated", "warning")
    assert result.status in ("degraded", "terminated_unresolved")
