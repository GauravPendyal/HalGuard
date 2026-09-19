"""
Backend Architecture Repairs Test Suite (Tests A through F).

Strictly verifies the repaired contracts and state transitions across the 7-agent pipeline:
  TEST A — Hallucinated answer (Elon Musk):
           - Verifier receives draft answer claim, NOT user query
           - Detector: HIGH risk
           - Verifier: CONTRADICTED
           - Judge: REQUIRES_CORRECTION, correction_required=True
           - Corrector: RUNS
           - ReVerifier: passes on corrected answer
           - Memory: rejects false statement, persists only verified facts
           - Final answer is corrected
  TEST B — Correct answer (Guido van Rossum):
           - Verifier: SUPPORTED / VERIFIED
           - Judge: ACCEPTED, correction_required=False
           - Corrector: NOT RUN
           - ReVerifier: NOT RUN
           - Final answer preserved verbatim
  TEST C — User has false premise, LLM refutes it:
           - User: "Java was created by Snehith, right?"
           - Draft: "No. Java was created by James Gosling and his team at Sun Microsystems."
           - Verifier verifies draft claims
           - Judge: ACCEPTED, correction_required=False
           - Corrector: NOT RUN
  TEST D — Corrector failure & bounded retry termination:
           - Corrector fails reverification
           - Retries bounded by max_retries
           - Terminated without infinite loop
  TEST E — Memory safety:
           - Persists ONLY SUPPORTED / VERIFIED facts with evidence
           - Strictly excludes CONTRADICTED, UNCERTAIN, NOT_ENOUGH_EVIDENCE
  TEST F — Long NLI input (> 512 tokens):
           - Token-aware chunking and truncation
           - No sequence length overflow (518 > 512)
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
    run_verification,
)
from orchestration.schemas import (
    AnswerStatus,
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


def make_test_state(**kwargs) -> HalluciGuardState:
    state: HalluciGuardState = {
        "execution_id": str(uuid.uuid4()),
        "request_id": str(uuid.uuid4()),
        "user_query": "Who created Python?",
        "llm_response": "Python was created by Elon Musk in 1999.",
        "draft_response": "Python was created by Elon Musk in 1999.",
        "draft_answer": "Python was created by Elon Musk in 1999.",
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
    state.update(kwargs)
    return state


# ===========================================================================
# TEST A: Hallucinated Answer Pipeline
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_a_hallucinated_answer(monkeypatch):
    """
    TEST A: User Query: "Who created Python?"
            Draft Answer: "Python was created by Elon Musk in 1999."
    
    Verifies:
      - Verifier receives the draft claim, NOT user query
      - Detector: HIGH risk
      - Verifier: CONTRADICTED
      - Judge: REQUIRES_CORRECTION, correction_required=True
      - Corrector: RUNS
      - ReVerifier: verified_claims=1, supported=1, contradicted=0, correction_successful=True
      - Memory: must not store the false Elon Musk claim
      - Final answer is corrected
    """
    captured_verifier_claims = []
    stored_memory_facts = []

    # 1. Mock Verifier
    class MockVerifierPipeline:
        async def verify(self, payload):
            for sc in payload.suspicious_claims:
                captured_verifier_claims.append(sc.text)
            
            is_reverification = payload.query_id.startswith("rev-")
            if not is_reverification:
                # First pass: draft claim is contradicted by historical evidence
                return {
                    "query_id": payload.query_id,
                    "domain": payload.domain,
                    "overall_evidence_confidence": 0.95,
                    "claim_evidence": [
                        {
                            "claim_id": "c1",
                            "claim_text": "Python was created by Elon Musk in 1999.",
                            "verdict": "contradicted",
                            "support_score": 0.05,
                            "contradiction_score": 0.99,
                            "evidence": [
                                {
                                    "evidence_id": "ev-1",
                                    "source": "Wikipedia",
                                    "snippet": "Python was conceived in the late 1980s by Guido van Rossum.",
                                    "entailment_label": "contradiction",
                                    "entailment_score": 0.99,
                                    "credibility_score": 0.98,
                                }
                            ],
                        }
                    ],
                }
            else:
                # Re-verification pass on corrected answer
                return {
                    "query_id": payload.query_id,
                    "domain": payload.domain,
                    "overall_evidence_confidence": 0.96,
                    "claim_evidence": [
                        {
                            "claim_id": "rev-1",
                            "claim_text": "Python was created by Guido van Rossum in 1991.",
                            "verdict": "verified",
                            "support_score": 0.98,
                            "contradiction_score": 0.01,
                            "evidence": [
                                {
                                    "evidence_id": "ev-2",
                                    "source": "Python Official Documentation",
                                    "snippet": "Guido van Rossum created the Python programming language.",
                                    "entailment_label": "entailment",
                                    "entailment_score": 0.98,
                                    "credibility_score": 0.99,
                                }
                            ],
                        }
                    ],
                }

    mock_imports = (
        MockVerifierPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )
    monkeypatch.setattr("orchestration.graph._verifier_imports", lambda: mock_imports)

    # 2. Mock Corrector
    class MockCorrectorAgent:
        def __init__(self, *args, **kwargs):
            pass

        def correct(self, req: CorrectionRequest) -> CorrectionResult:
            assert "Elon Musk" in req.original_response
            return CorrectionResult(
                execution_id=req.execution_id,
                original_text=req.original_response,
                corrected_text="Python was created by Guido van Rossum in 1991.",
                changed_claims=[
                    {
                        "claim_id": "c1",
                        "text": "Python was created by Guido van Rossum in 1991.",
                        "verdict": "verified",
                    }
                ],
                validation_status=ValidationStatus.VALID,
                status=ExecutionStatus.COMPLETED,
            )

    monkeypatch.setattr("agents.corrector_agent.corrector.CorrectorAgent", MockCorrectorAgent)

    # 3. Mock Memory
    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            stored_memory_facts.append(req)
            return {"fact_id": f"fact-{len(stored_memory_facts)}", "status": "stored"}

    monkeypatch.setattr("agents.memory_agent.memory.memory_agent.MemoryAgent", MockMemoryAgent)

    # 4. Mock Detector
    class MockDetectorAgent:
        def detect(self, query: str, response: str):
            return {
                "hallucination_probability": 0.9992,
                "confidence_score": 0.98,
                "risk_level": "HIGH",
                "next_action": "Verify",
                "model_source": "halueval-distilbert",
                "status": "completed",
            }

    monkeypatch.setattr("agents.detector_agent.detector.DetectorAgent", MockDetectorAgent)

    # Execute complete graph
    graph = build_verification_graph()
    state = make_test_state(
        user_query="Who created Python?",
        llm_response="Python was created by Elon Musk in 1999.",
        draft_response="Python was created by Elon Musk in 1999.",
        draft_answer="Python was created by Elon Musk in 1999.",
    )

    final_state = await graph.ainvoke(state)

    # Assertions
    # 1. Verifier received the draft claim, NOT the user query
    assert len(captured_verifier_claims) > 0
    assert "Python was created by Elon Musk in 1999." in captured_verifier_claims[0]
    assert "Who created Python?" not in captured_verifier_claims[0]

    # 2. Trace shows full corrective lifecycle
    executed_nodes = [t["node"] for t in final_state["trace"]]
    assert "detector" in executed_nodes
    assert "verifier" in executed_nodes
    assert "judge" in executed_nodes
    assert "corrector" in executed_nodes
    assert "reverifier" in executed_nodes
    assert "memory" in executed_nodes

    # 3. Final answer is corrected
    assert "Elon Musk" not in final_state["final_response"]
    assert "Guido van Rossum" in final_state["final_response"]

    # 4. ReVerifier audit metrics
    rev = final_state.get("reverification_result", {})
    assert rev.get("passed") is True
    assert rev.get("remaining_contradictions") == 0
    assert rev.get("correction_successful") is True

    # 5. Memory safety: NEVER store the false statement
    for stored in stored_memory_facts:
        assert "Elon Musk" not in stored.claim_text
        assert stored.verdict == "verified"
    assert len(stored_memory_facts) == 1
    assert "Guido van Rossum" in stored_memory_facts[0].claim_text


# ===========================================================================
# TEST B: Correct Answer Pipeline
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_b_correct_answer(monkeypatch):
    """
    TEST B: User Query: "Who created Python?"
            Draft Answer: "Python was created by Guido van Rossum."
    
    Verifies:
      - Verifier: SUPPORTED / VERIFIED
      - Judge: ACCEPTED, correction_required=False
      - Corrector: NOT RUN
      - ReVerifier: NOT RUN
      - Memory: verified fact safely persisted
      - Final answer: preserved verbatim
    """
    corrector_called = False

    class MockVerifierPipeline:
        async def verify(self, payload):
            return {
                "query_id": payload.query_id,
                "domain": payload.domain,
                "overall_evidence_confidence": 0.98,
                "claim_evidence": [
                    {
                        "claim_id": "c1",
                        "claim_text": "Python was created by Guido van Rossum.",
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

    mock_imports = (
        MockVerifierPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )
    monkeypatch.setattr("orchestration.graph._verifier_imports", lambda: mock_imports)

    class MockCorrectorAgent:
        def correct(self, req):
            nonlocal corrector_called
            corrector_called = True
            return MagicMock()

    monkeypatch.setattr("agents.corrector_agent.corrector.CorrectorAgent", MockCorrectorAgent)

    class MockDetectorAgent:
        def detect(self, query: str, response: str):
            return {
                "hallucination_probability": 0.05,
                "confidence_score": 0.95,
                "risk_level": "LOW",
                "next_action": "Verify",
                "model_source": "halueval-distilbert",
                "status": "completed",
            }

    monkeypatch.setattr("agents.detector_agent.detector.DetectorAgent", MockDetectorAgent)

    stored_facts = []
    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            stored_facts.append(req)
            return {"fact_id": "f-1", "status": "stored"}

    monkeypatch.setattr("agents.memory_agent.memory.memory_agent.MemoryAgent", MockMemoryAgent)

    graph = build_verification_graph()
    state = make_test_state(
        user_query="Who created Python?",
        llm_response="Python was created by Guido van Rossum.",
        draft_response="Python was created by Guido van Rossum.",
        draft_answer="Python was created by Guido van Rossum.",
    )

    final_state = await graph.ainvoke(state)

    executed_nodes = [t["node"] for t in final_state["trace"]]
    assert "corrector" not in executed_nodes
    assert "reverifier" not in executed_nodes
    assert corrector_called is False
    assert final_state.get("answer_status") == AnswerStatus.ACCEPTED.value
    assert final_state.get("correction_required") is False
    assert final_state["final_response"] == "Python was created by Guido van Rossum."
    assert len(stored_facts) == 1
    assert "Guido van Rossum" in stored_facts[0].claim_text


# ===========================================================================
# TEST C: User False Premise, LLM Corrects It
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_c_user_false_premise_llm_corrects_it(monkeypatch):
    """
    TEST C: User Query: "Java was created by Snehith, right?"
            Draft Answer: "No. Java was created by James Gosling and his team at Sun Microsystems."

    Verifies:
      - The Verifier targets the generated draft answer ("Java was created by James Gosling..."),
        NOT the user's premise ("Java was created by Snehith").
      - Verifier returns VERIFIED for the draft claims.
      - Judge emits ACCEPTED and correction_required=False.
      - Corrector is NOT RUN.
    """
    captured_claims = []
    corrector_called = False

    class MockVerifierPipeline:
        async def verify(self, payload):
            for c in payload.suspicious_claims:
                captured_claims.append(c.text)
            return {
                "query_id": payload.query_id,
                "domain": payload.domain,
                "overall_evidence_confidence": 0.96,
                "claim_evidence": [
                    {
                        "claim_id": "c1",
                        "claim_text": "Java was created by James Gosling and his team at Sun Microsystems.",
                        "verdict": "verified",
                        "support_score": 0.98,
                        "contradiction_score": 0.02,
                        "evidence": [
                            {
                                "evidence_id": "ev-java-1",
                                "source": "Oracle Docs",
                                "snippet": "James Gosling created the Java programming language at Sun Microsystems.",
                                "entailment_label": "entailment",
                                "entailment_score": 0.98,
                                "credibility_score": 0.99,
                            }
                        ],
                    }
                ],
            }

    mock_imports = (
        MockVerifierPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )
    monkeypatch.setattr("orchestration.graph._verifier_imports", lambda: mock_imports)

    class MockCorrectorAgent:
        def correct(self, req):
            nonlocal corrector_called
            corrector_called = True
            return MagicMock()

    monkeypatch.setattr("agents.corrector_agent.corrector.CorrectorAgent", MockCorrectorAgent)

    class MockDetectorAgent:
        def detect(self, query: str, response: str):
            return {
                "hallucination_probability": 0.10,
                "confidence_score": 0.90,
                "risk_level": "LOW",
                "next_action": "Verify",
                "model_source": "halueval-distilbert",
                "status": "completed",
            }

    monkeypatch.setattr("agents.detector_agent.detector.DetectorAgent", MockDetectorAgent)

    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            return {"fact_id": "f-java", "status": "stored"}

    monkeypatch.setattr("agents.memory_agent.memory.memory_agent.MemoryAgent", MockMemoryAgent)

    graph = build_verification_graph()
    state = make_test_state(
        user_query="Java was created by Snehith, right?",
        llm_response="No. Java was created by James Gosling and his team at Sun Microsystems.",
        draft_response="No. Java was created by James Gosling and his team at Sun Microsystems.",
        draft_answer="No. Java was created by James Gosling and his team at Sun Microsystems.",
    )

    final_state = await graph.ainvoke(state)

    # Verify that the user query's false premise was NOT verified as a factual target
    for c_text in captured_claims:
        assert "Snehith" not in c_text
        assert "James Gosling" in c_text or "Java" in c_text

    executed_nodes = [t["node"] for t in final_state["trace"]]
    assert "corrector" not in executed_nodes
    assert corrector_called is False
    assert final_state.get("answer_status") == AnswerStatus.ACCEPTED.value
    assert final_state.get("correction_required") is False


# ===========================================================================
# TEST D: Corrector Failure & Bounded Retry Termination
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_d_corrector_retry_bounded_termination(monkeypatch):
    """
    TEST D: Corrector repeatedly fails reverification (returns hallucinated claim).
            Verify:
              - Pipeline enters correction retry loop
              - ReVerifier catches invalid corrections
              - Terminates safely after max_retries
              - No infinite loop
    """
    corrector_attempts = 0

    class MockVerifierPipeline:
        async def verify(self, payload):
            # All responses (draft and corrections) remain contradicted
            return {
                "query_id": payload.query_id,
                "domain": payload.domain,
                "overall_evidence_confidence": 0.90,
                "claim_evidence": [
                    {
                        "claim_id": "c-contra",
                        "claim_text": "Failed attempt claim.",
                        "verdict": "contradicted",
                        "support_score": 0.05,
                        "contradiction_score": 0.95,
                        "evidence": [
                            {
                                "evidence_id": "ev-contra",
                                "source": "Refutation",
                                "snippet": "This statement is entirely false.",
                                "entailment_label": "contradiction",
                                "entailment_score": 0.95,
                                "credibility_score": 0.95,
                            }
                        ],
                    }
                ],
            }

    mock_imports = (
        MockVerifierPipeline,
        MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
        MagicMock(side_effect=lambda **kw: MagicMock(**kw)),
    )
    monkeypatch.setattr("orchestration.graph._verifier_imports", lambda: mock_imports)

    class MockCorrectorAgent:
        def correct(self, req):
            nonlocal corrector_attempts
            corrector_attempts += 1
            return CorrectionResult(
                execution_id=req.execution_id,
                original_text=req.original_response,
                corrected_text=f"Failed attempt claim {corrector_attempts}.",
                changed_claims=[
                    ClaimReport(
                        claim_id=f"c-{corrector_attempts}",
                        claim_text=f"Failed attempt claim {corrector_attempts}.",
                        verdict=VerdictLabel.CONTRADICTED,
                    )
                ],
                validation_status=ValidationStatus.WARNING,
                status=ExecutionStatus.COMPLETED,
            )

    monkeypatch.setattr("agents.corrector_agent.corrector.CorrectorAgent", MockCorrectorAgent)

    class MockDetectorAgent:
        def detect(self, query: str, response: str):
            return {
                "hallucination_probability": 0.95,
                "confidence_score": 0.95,
                "risk_level": "HIGH",
                "next_action": "Verify",
                "model_source": "halueval-distilbert",
                "status": "completed",
            }

    monkeypatch.setattr("agents.detector_agent.detector.DetectorAgent", MockDetectorAgent)

    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            pytest.fail("Memory must NEVER be stored when correction retries fail.")

    monkeypatch.setattr("agents.memory_agent.memory.memory_agent.MemoryAgent", MockMemoryAgent)

    graph = build_verification_graph()
    state = make_test_state(
        max_retries=2,
        user_query="Who created Python?",
        llm_response="Python was created by Elon Musk in 1999.",
        draft_response="Python was created by Elon Musk in 1999.",
        draft_answer="Python was created by Elon Musk in 1999.",
    )

    final_state = await graph.ainvoke(state)

    # The pipeline must terminate without infinite loop
    executed_nodes = [t["node"] for t in final_state["trace"]]
    assert "reject" in executed_nodes or "human_escalation" in executed_nodes
    assert corrector_attempts <= 2
    assert final_state.get("terminal_status") in ("rejected", "human_review")


# ===========================================================================
# TEST E: Memory Safety Filtering
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_e_memory_safety_filtering(monkeypatch):
    """
    TEST E: Memory safety test.
            Feed Memory 4 types of facts:
              1. SUPPORTED fact (with evidence)
              2. CONTRADICTED fact
              3. UNCERTAIN fact
              4. NOT_ENOUGH_EVIDENCE / UNVERIFIED fact
            
            Assert that ONLY the SUPPORTED fact is persisted to MemoryAgent.
    """
    stored_requests = []

    class MockMemoryAgent:
        async def initialize(self):
            pass
        async def close(self):
            pass
        async def store_fact(self, req):
            stored_requests.append(req)
            return {"fact_id": f"fact-{len(stored_requests)}", "status": "stored"}

    monkeypatch.setattr("agents.memory_agent.memory.memory_agent.MemoryAgent", MockMemoryAgent)

    # Construct mixed VerifierResult
    v_res = VerifierResult(
        query_id="q-mixed-memory",
        domain="general",
        claim_reports=[
            ClaimReport(
                claim_id="c1",
                claim_text="Python was created by Guido van Rossum.",
                verdict=VerdictLabel.VERIFIED,
                support_score=0.98,
                confidence_score=0.95,
                evidence=[
                    Evidence(
                        evidence_id="e1",
                        title="History of Python",
                        source="Wikipedia",
                        snippet="Guido created Python.",
                        entailment_label="entailment",
                    )
                ],
            ),
            ClaimReport(
                claim_id="c2",
                claim_text="Python was created by Elon Musk.",
                verdict=VerdictLabel.CONTRADICTED,
                contradiction_score=0.99,
                confidence_score=0.98,
                evidence=[
                    Evidence(
                        evidence_id="e2",
                        title="Musk Bio",
                        source="Wikipedia",
                        snippet="Elon Musk did not create Python.",
                        entailment_label="contradiction",
                    )
                ],
            ),
            ClaimReport(
                claim_id="c3",
                claim_text="Python was conceived on a Tuesday afternoon.",
                verdict=VerdictLabel.UNVERIFIED,
                support_score=0.3,
                confidence_score=0.2,
                evidence=[],
            ),
            ClaimReport(
                claim_id="c4",
                claim_text="Python is secretly named after a mythical serpent god.",
                verdict=VerdictLabel.CONFLICTED,
                support_score=0.4,
                confidence_score=0.3,
                evidence=[],
            ),
        ],
        overall_confidence=0.80,
    )

    state = make_test_state(
        verifier_result=v_res.model_dump(),
        judge_decision="ACCEPT",
        answer_status="ACCEPTED",
    )

    res = await _memory_node(state)

    # Exactly 1 fact should be stored (the SUPPORTED one)
    assert len(stored_requests) == 1
    assert stored_requests[0].claim_text == "Python was created by Guido van Rossum."
    assert stored_requests[0].verdict == "verified"
    assert stored_requests[0].metadata.get("provenance") == "halluciguard_verifier"

    # Verify no contradicted or unverified facts made it into storage
    stored_texts = [r.claim_text for r in stored_requests]
    assert "Python was created by Elon Musk." not in stored_texts
    assert "Python was conceived on a Tuesday afternoon." not in stored_texts
    assert "Python is secretly named after a mythical serpent god." not in stored_texts


# ===========================================================================
# TEST F: Long NLI Input (> 512 Tokens)
# ===========================================================================

def test_scenario_f_long_nli_input_overflow():
    """
    TEST F: Token sequence length exceeding 512 tokens.
            Verifies:
              - NLI wrapper and NLIEngine chunk/truncate token-aware
              - No IndexError or 'Token indices sequence length is longer than 512'
              - Returns valid classifications
    """
    from agents.verifier_agent.models.wrappers.nli import NLIWrapper
    from agents.verifier_agent.nli.entailment import NLIEngine

    # 1. Test NLIWrapper with very long premise (> 600 tokens)
    wrapper = NLIWrapper()
    long_premise = "Python is a high-level general-purpose programming language. " * 80
    hypothesis = "Python was created by Guido van Rossum."

    scores = wrapper.predict(long_premise, hypothesis)
    assert isinstance(scores, dict)
    assert "entailment" in scores
    assert "contradiction" in scores
    assert "neutral" in scores

    # 2. Test NLIEngine chunking
    engine = NLIEngine()
    chunks = engine._chunk_evidence(
        claim="Guido created Python.",
        evidence=long_premise,
    )
    assert len(chunks) >= 1
    # Evidence chunking must not destroy the text or throw an exception
    for ch in chunks:
        assert len(ch) > 0
