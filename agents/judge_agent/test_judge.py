"""
Comprehensive Unit Test Suite for Canonical JudgeAgent & Phase-1 Contracts.
Tests all Task 12 requirements (Tests A through H).
"""

import sys
import os
import json
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

agent_dir = os.path.dirname(os.path.abspath(__file__))
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)

from judge_agent import JudgeAgent
from orchestration.schemas import (
    JudgeResult,
    CorrectionRequest,
    ReverificationResult,
    VerifierResult,
    ClaimReport,
    Evidence,
    DetectorResult,
    JudgeDecision,
    SeverityLevel,
    VerdictLabel,
    EntailmentLabel,
    ExecutionStatus,
)

judge = JudgeAgent()

print("=" * 80)
print("  HALLUCIGUARD CANONICAL JUDGE AGENT — UNIT TEST SUITE")
print("=" * 80)

# Helper to get string value of enum or str
def str_val(v):
    return v.value if hasattr(v, "value") else str(v)

# TEST 1 (Test A): Verified Claim -> ACCEPT
print("\n[TEST 1] Single Verified Claim -> EXPECT ACCEPT")
vr1 = VerifierResult(
    query_id="Q-101",
    domain="General Knowledge",
    claim_reports=[
        ClaimReport(
            claim_id="C1",
            claim_text="Guido van Rossum created Python.",
            verdict=VerdictLabel.VERIFIED,
            support_score=0.95,
            contradiction_score=0.05,
            confidence_score=0.95,
            evidence=[
                Evidence(
                    evidence_id="E1",
                    title="Python History",
                    source="Wikipedia",
                    snippet="Python was created by Guido van Rossum in 1991.",
                    entailment_label=EntailmentLabel.ENTAILMENT,
                    entailment_score=0.98,
                    credibility_score=0.90
                )
            ]
        )
    ],
    overall_confidence=0.95
)

r1 = judge.evaluate(verifier_result=vr1, user_query="Who created Python?", original_response="Guido van Rossum created Python.")
assert str_val(r1.decision) == "ACCEPT", f"Expected ACCEPT, got {r1.decision}"
assert r1.correction_request is None
print(f"✅ PASSED — Decision: {str_val(r1.decision)} | Reason: {r1.reason}")

# TEST 2 (Test C): Contradicted Claim -> CORRECT
print("\n[TEST 2] Single Contradicted Claim -> EXPECT CORRECT")
vr2 = VerifierResult(
    query_id="Q-102",
    domain="General Knowledge",
    claim_reports=[
        ClaimReport(
            claim_id="C1",
            claim_text="Elon Musk created Python in 1999.",
            verdict=VerdictLabel.CONTRADICTED,
            support_score=0.05,
            contradiction_score=0.95,
            confidence_score=0.95,
            evidence=[
                Evidence(
                    evidence_id="E1",
                    title="Python History",
                    source="Wikipedia",
                    snippet="Python was created by Guido van Rossum in 1991.",
                    entailment_label=EntailmentLabel.CONTRADICTION,
                    entailment_score=0.98,
                    credibility_score=0.90
                )
            ]
        )
    ],
    overall_confidence=0.95
)

r2 = judge.evaluate(verifier_result=vr2, user_query="Who created Python?", original_response="Elon Musk created Python in 1999.")
assert str_val(r2.decision) == "CORRECT", f"Expected CORRECT, got {r2.decision}"
assert r2.correction_request is not None, "CorrectionRequest must be present when decision == CORRECT"
assert len(r2.correction_request.claims_to_correct) == 1
assert r2.correction_request.claims_to_correct[0].claim_id == "C1"
print(f"✅ PASSED — Decision: {str_val(r2.decision)} | Claims to correct: {len(r2.correction_request.claims_to_correct)}")

# TEST 3 (Test D): Unverified Claim -> Must NOT automatically become CORRECT
print("\n[TEST 3] Unverified Claim -> Must NOT become CORRECT automatically (UNVERIFIED != FALSE)")
vr3 = VerifierResult(
    query_id="Q-103",
    domain="General Knowledge",
    claim_reports=[
        ClaimReport(
            claim_id="C1",
            claim_text="An obscure startup was founded on a Tuesday.",
            verdict=VerdictLabel.UNVERIFIED,
            support_score=0.1,
            contradiction_score=0.0,
            confidence_score=0.4,
            evidence=[]
        )
    ],
    overall_confidence=0.4
)

r3 = judge.evaluate(verifier_result=vr3, retry_count=0)
assert str_val(r3.decision) != "CORRECT", f"UNVERIFIED must NOT result in CORRECT automatically, got {r3.decision}"
assert str_val(r3.decision) in ["VERIFY_AGAIN", "ACCEPT", "ABSTAIN"]
print(f"✅ PASSED — Decision for UNVERIFIED claim: {str_val(r3.decision)} (Correctly preserved invariant UNVERIFIED != FALSE)")

# TEST 4 (Test E): Conflicted Claim -> Safe Decision (VERIFY_AGAIN or ABSTAIN)
print("\n[TEST 4] Conflicted Claim -> Safe Decision")
vr4 = VerifierResult(
    query_id="Q-104",
    domain="General Knowledge",
    claim_reports=[
        ClaimReport(
            claim_id="C1",
            claim_text="Event X happened in 2010 vs 2012.",
            verdict=VerdictLabel.CONFLICTED,
            support_score=0.5,
            contradiction_score=0.5,
            confidence_score=0.5,
            evidence=[]
        )
    ],
    overall_confidence=0.5
)

r4 = judge.evaluate(verifier_result=vr4, retry_count=0)
assert str_val(r4.decision) in ["VERIFY_AGAIN", "ABSTAIN", "REJECT"]
print(f"✅ PASSED — Decision for CONFLICTED claim: {str_val(r4.decision)}")

# TEST 5 (Test G): Multiple Claims (Claim 1 Verified, Claim 2 Contradicted, Claim 3 Verified)
print("\n[TEST 5] Multiple Claims -> Only Claim 2 corrected, Claims 1 and 3 preserved")
vr5 = VerifierResult(
    query_id="Q-105",
    domain="General Knowledge",
    claim_reports=[
        ClaimReport(
            claim_id="C1",
            claim_text="Python is a high-level programming language.",
            verdict=VerdictLabel.VERIFIED,
            support_score=0.95,
            contradiction_score=0.05,
            confidence_score=0.95,
            evidence=[Evidence(evidence_id="E1", title="Python", source="Docs", snippet="Python is high-level.", entailment_label=EntailmentLabel.ENTAILMENT)]
        ),
        ClaimReport(
            claim_id="C2",
            claim_text="Python was created by Steve Jobs.",
            verdict=VerdictLabel.CONTRADICTED,
            support_score=0.05,
            contradiction_score=0.95,
            confidence_score=0.95,
            evidence=[Evidence(evidence_id="E2", title="Python Creator", source="Wikipedia", snippet="Created by Guido van Rossum.", entailment_label=EntailmentLabel.CONTRADICTION)]
        ),
        ClaimReport(
            claim_id="C3",
            claim_text="Python supports dynamic typing.",
            verdict=VerdictLabel.VERIFIED,
            support_score=0.95,
            contradiction_score=0.05,
            confidence_score=0.95,
            evidence=[Evidence(evidence_id="E3", title="Python Types", source="Docs", snippet="Python is dynamically typed.", entailment_label=EntailmentLabel.ENTAILMENT)]
        )
    ],
    overall_confidence=0.95
)

r5 = judge.evaluate(
    verifier_result=vr5,
    user_query="Tell me about Python.",
    original_response="Python is a high-level programming language. Python was created by Steve Jobs. Python supports dynamic typing."
)

assert str_val(r5.decision) == "CORRECT"
cr5 = r5.correction_request
assert cr5 is not None
assert len(cr5.claims_to_correct) == 1 and cr5.claims_to_correct[0].claim_id == "C2"
assert len(cr5.claims_to_preserve) == 2 and set(c.claim_id for c in cr5.claims_to_preserve) == {"C1", "C3"}
print(f"✅ PASSED — Corrected: {[c.claim_id for c in cr5.claims_to_correct]} | Preserved: {[c.claim_id for c in cr5.claims_to_preserve]}")

# TEST 6: CorrectionRequest Validation
print("\n[TEST 6] CorrectionRequest Payload Validation")
assert isinstance(cr5, CorrectionRequest)
assert cr5.user_query == "Tell me about Python."
assert cr5.original_response.startswith("Python is a high-level")
assert len(cr5.trusted_evidence) == 3
assert "Modify only the 1 claim(s)" in cr5.correction_instructions
print("✅ PASSED — CorrectionRequest payload conforms strictly to Pydantic schema.")

# TEST 7 (Test H): Reverification Gate Evaluation
print("\n[TEST 7] Reverification Gate Evaluation (passed=True vs passed=False)")
# A safe ACCEPT requires the re-verifier to have explicitly confirmed the
# correction succeeded (claim lineage preserved), not merely a clean re-verify.
rev_pass = ReverificationResult(
    passed=True, verifier_result=vr1, remaining_contradictions=0, correction_successful=True
)
r_pass = judge.evaluate(verifier_result=vr1, reverification_result=rev_pass)
assert str_val(r_pass.decision) == "ACCEPT", f"Expected ACCEPT for passed reverification, got {r_pass.decision}"

rev_fail = ReverificationResult(passed=False, verifier_result=vr2, remaining_contradictions=1)
r_retry = judge.evaluate(verifier_result=vr2, reverification_result=rev_fail, retry_count=0)
assert str_val(r_retry.decision) == "CORRECT", f"Expected CORRECT for retryable reverification failure, got {r_retry.decision}"

r_fail = judge.evaluate(verifier_result=vr2, reverification_result=rev_fail, retry_count=2)
assert str_val(r_fail.decision) == "REJECT", f"Expected REJECT for exhausted reverification, got {r_fail.decision}"
print(f"✅ PASSED — Reverification Pass: {str_val(r_pass.decision)} | Retry: {str_val(r_retry.decision)} | Exhausted Fail: {str_val(r_fail.decision)}")

# TEST 8: Invalid Input / Safe Failure Handling
print("\n[TEST 8] Safe Failure Handling on Invalid / Null VerifierResult")
r_null = judge.evaluate(verifier_result=None)
assert str_val(r_null.decision) == "ABSTAIN"
assert str_val(r_null.status) == "failed"
print(f"✅ PASSED — Safe Failure Decision: {str_val(r_null.decision)} | Status: {str_val(r_null.status)}")

# TEST 9: Pydantic Contract Validation
print("\n[TEST 9] Shared Schema Validation (JudgeResult.model_validate)")
validated = JudgeResult.model_validate(r5.model_dump())
assert str_val(validated.decision) == "CORRECT"
print("✅ PASSED — JudgeResult successfully validated against orchestration.schemas Pydantic contract.")

# TEST 10 (Test B): No Independent Verification Invoked
print("\n[TEST 10] Task 12 Test B — No Independent Verification Invoked")
assert not hasattr(judge, "nli_engine")
assert not hasattr(judge, "retriever")
print("✅ PASSED — Judge performs decision logic without running NLI or web retrieval.")

# TEST 11 (Test F): Evidence Grounding Authority Validation
print("\n[TEST 11] Task 12 Test F — Evidence Grounding Authority Validation")
trusted_ids = [e.evidence_id for e in cr5.trusted_evidence]
assert "E2" in trusted_ids, "E2 must be in trusted_evidence to ground the Corrector"
assert set(trusted_ids) == {"E1", "E2", "E3"}
print("✅ PASSED — trusted_evidence contains grounding evidence for both preserved and contradicted claims (E1, E2, E3).")

print("\n" + "=" * 80)
print("  ALL 11 CANONICAL UNIT TESTS PASSED SUCCESSFULLY (100%)")
print("=" * 80)
