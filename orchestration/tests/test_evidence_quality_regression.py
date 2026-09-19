"""
Regression tests for retrieval and evidence quality for contradicted claims.

Covers:
1. "Elon Musk created Java." — Verifies retrieval/evidence contains a passage directly
   relevant to Java's creator/development, OR safely marks replacement evidence insufficient.
2. "Python was created by Elon Musk." — Verifies evidence directly supports the corrected Python creator fact.
3. Famous person and unrelated entity claim — Ensures query expansion and evidence filtering
   target the entity/relation and do not simply retrieve/trust pages about the famous person.
4. Category A (contradictory) vs Category B (replacement-supporting) evidence represented distinctly
   in Judge and CorrectionRequest.
5. Corrector receives replacement-capable evidence only when it actually establishes the replacement,
   skipping targets with NO_USABLE_EVIDENCE when only refutation/unrelated evidence is present.
"""
from __future__ import annotations

import os
import sys
import unittest

from orchestration.schemas import (
    ClaimReport,
    CorrectionRequest,
    EntailmentLabel,
    Evidence,
    ExecutionStatus,
    VerdictLabel,
    VerifierResult,
)
from agents.judge_agent.judge_agent import JudgeAgent
from routers.query_expander import QueryExpander
from agents.corrector_agent.corrector.adapter import to_internal_request
from agents.corrector_agent.corrector.contracts import SkipReason
from agents.corrector_agent.corrector.evidence import ground_request


class TestEvidenceQualityRegression(unittest.TestCase):

    def setUp(self) -> None:
        self.query_expander = QueryExpander()
        self.judge = JudgeAgent()

    # -----------------------------------------------------------------------
    # Test 1: "Elon Musk created Java."
    # -----------------------------------------------------------------------
    def test_elon_musk_created_java_evidence_quality(self) -> None:
        """
        Verify query expansion produces inverted relational queries targeting Java,
        and Judge classifies Java-creation passages as replacement-capable while
        routing unrelated Elon Musk passages to contradictory_evidence.
        """
        claim = "Elon Musk created Java."
        queries = self.query_expander.generate_search_queries(claim, "general")

        # Must generate queries targeting Java's creation/creator
        queries_lower = [q.lower() for q in queries]
        self.assertTrue(
            any("java created by" in q or "java creator" in q or "who created java" in q for q in queries_lower),
            f"Expected Java creation relational queries, got: {queries}",
        )

        # Replacement-capable passage: Java's true creator
        ev_gosling = Evidence(
            evidence_id="ev_gosling_1",
            title="Wikipedia: Java (programming language)",
            source="wikipedia",
            snippet="Java was designed by James Gosling at Sun Microsystems. It was released in May 1995.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.98,
            credibility_score=0.90,
        )

        # Contradictory / refutation passage: unrelated celebrity noise
        ev_truth = Evidence(
            evidence_id="ev_truth_1",
            title="Truth Social App",
            source="n8n_retrieval",
            snippet="Elon Musk suggests new name for Truth Social app on May 6, 2022.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.90,
            credibility_score=0.70,
        )

        # Test Judge classification helper directly
        self.assertTrue(
            self.judge._is_replacement_capable_evidence(claim, ev_gosling),
            "James Gosling Java passage must be recognized as replacement-capable (Category B)",
        )
        self.assertFalse(
            self.judge._is_replacement_capable_evidence(claim, ev_truth),
            "Truth Social Elon Musk passage must NOT be recognized as replacement-capable (Category A)",
        )

        # Test Judge arbitration routing
        claim_report = ClaimReport(
            claim_id="c3",
            claim_text=claim,
            verdict=VerdictLabel.CONTRADICTED,
            contradiction_score=0.95,
            evidence=[ev_gosling, ev_truth],
        )
        vr = VerifierResult(
            query_id="q_test_1",
            domain="general",
            claim_reports=[claim_report],
            overall_confidence=0.90,
        )

        res = self.judge.evaluate(
            vr,
            user_query="Who created Java?",
            original_response=claim,
        )

        self.assertIsNotNone(res.correction_request)
        req = res.correction_request
        trusted_ids = [e.evidence_id for e in req.trusted_evidence]
        contradictory_ids = [e.evidence_id for e in req.contradictory_evidence]

        self.assertIn("ev_gosling_1", trusted_ids)
        self.assertNotIn("ev_truth_1", trusted_ids)
        self.assertIn("ev_truth_1", contradictory_ids)

    # -----------------------------------------------------------------------
    # Test 2: "Python was created by Elon Musk."
    # -----------------------------------------------------------------------
    def test_python_created_by_elon_musk_evidence_quality(self) -> None:
        """
        Verify query expansion produces Python creator queries, and Judge recognizes
        Guido van Rossum Python passages as replacement-capable evidence.
        """
        claim = "Python was created by Elon Musk."
        queries = self.query_expander.generate_search_queries(claim, "general")

        queries_lower = [q.lower() for q in queries]
        self.assertTrue(
            any("python created by" in q or "python creator" in q or "who created python" in q for q in queries_lower),
            f"Expected Python creation queries, got: {queries}",
        )

        ev_guido = Evidence(
            evidence_id="ev_guido_1",
            title="Wikipedia: History of Python",
            source="wikipedia",
            snippet="Python was conceived in the late 1980s by Guido van Rossum at Centrum Wiskunde & Informatica (CWI).",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.99,
            credibility_score=0.95,
        )

        ev_musk_bio = Evidence(
            evidence_id="ev_musk_bio_1",
            title="Elon Musk Biography",
            source="general",
            snippet="Elon Musk co-founded PayPal, SpaceX, and Tesla. He did not author standard programming languages.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.85,
            credibility_score=0.75,
        )

        self.assertTrue(
            self.judge._is_replacement_capable_evidence(claim, ev_guido),
            "Guido van Rossum passage must be replacement-capable for Python creator claim",
        )
        self.assertFalse(
            self.judge._is_replacement_capable_evidence(claim, ev_musk_bio),
            "Musk biography refutation must not be classified as replacement-capable",
        )

        claim_report = ClaimReport(
            claim_id="c_py",
            claim_text=claim,
            verdict=VerdictLabel.CONTRADICTED,
            contradiction_score=0.95,
            evidence=[ev_guido, ev_musk_bio],
        )
        vr = VerifierResult(
            query_id="q_test_2",
            domain="general",
            claim_reports=[claim_report],
            overall_confidence=0.90,
        )
        res = self.judge.evaluate(
            vr,
            user_query="Who created Python?",
            original_response=claim,
        )

        req = res.correction_request
        self.assertIsNotNone(req)
        self.assertIn("ev_guido_1", [e.evidence_id for e in req.trusted_evidence])
        self.assertIn("ev_musk_bio_1", [e.evidence_id for e in req.contradictory_evidence])

    # -----------------------------------------------------------------------
    # Test 3: Unrelated Claim Mentioning Famous Person & Entity
    # -----------------------------------------------------------------------
    def test_famous_person_unrelated_entity_retrieval(self) -> None:
        """
        Verify that an unrelated claim mentioning a famous person and another entity
        generates target entity queries rather than querying the famous person only,
        and evidence about the famous person is not accepted as replacement for the entity.
        """
        claim = "Albert Einstein founded Microsoft."
        queries = self.query_expander.generate_search_queries(claim, "general")

        queries_lower = [q.lower() for q in queries]
        self.assertTrue(
            any("microsoft founded by" in q or "microsoft creator" in q or "who founded microsoft" in q for q in queries_lower),
            f"Expected Microsoft relational queries, got: {queries}",
        )

        # Famous person passage unrelated to Microsoft's founding
        ev_einstein = Evidence(
            evidence_id="ev_einstein_1",
            title="Albert Einstein - Wikipedia",
            source="wikipedia",
            snippet="Albert Einstein was a German-born theoretical physicist best known for developing the theory of relativity.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.95,
            credibility_score=0.90,
        )

        # Genuine entity founding passage
        ev_msft = Evidence(
            evidence_id="ev_msft_1",
            title="Wikipedia: Microsoft",
            source="wikipedia",
            snippet="Microsoft was founded by Bill Gates and Paul Allen on April 4, 1975, to develop and sell BASIC interpreters.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.98,
            credibility_score=0.92,
        )

        self.assertFalse(
            self.judge._is_replacement_capable_evidence(claim, ev_einstein),
            "Einstein biography must not be replacement-capable for Microsoft founding",
        )
        self.assertTrue(
            self.judge._is_replacement_capable_evidence(claim, ev_msft),
            "Bill Gates Microsoft founding passage must be replacement-capable",
        )

    # -----------------------------------------------------------------------
    # Test 4: Contradictory vs Replacement Evidence Distinct Representation
    # -----------------------------------------------------------------------
    def test_contradictory_and_replacement_evidence_represented_distinctly(self) -> None:
        """
        Verify that Category A (evidence that claim is false) and Category B
        (evidence establishing replacement) are represented distinctly in Judge output.
        """
        claim = "Elon Musk created Java."

        # Pure refutation without affirmative replacement fact
        ev_refutation = Evidence(
            evidence_id="ev_refute",
            title="Tech Fact Check",
            source="factcheck",
            snippet="There is no record of Elon Musk ever being involved with Java; this claim is false and debunked.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.95,
            credibility_score=0.85,
        )

        # Affirmative replacement fact
        ev_replacement = Evidence(
            evidence_id="ev_replace",
            title="Java Origins",
            source="wikipedia",
            snippet="Java was designed by James Gosling at Sun Microsystems and released in May 1995.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.95,
            credibility_score=0.90,
        )

        claim_report = ClaimReport(
            claim_id="c_test_4",
            claim_text=claim,
            verdict=VerdictLabel.CONTRADICTED,
            contradiction_score=0.95,
            evidence=[ev_refutation, ev_replacement],
        )
        vr = VerifierResult(
            query_id="q_test_4",
            domain="general",
            claim_reports=[claim_report],
            overall_confidence=0.90,
        )

        res = self.judge.evaluate(
            vr,
            user_query="Who created Java?",
            original_response=claim,
        )

        req = res.correction_request
        self.assertIsNotNone(req)

        # Distinct pools
        trusted_ids = {e.evidence_id for e in req.trusted_evidence}
        contradictory_ids = {e.evidence_id for e in req.contradictory_evidence}

        self.assertIn("ev_replace", trusted_ids, "Replacement-establishing evidence must be in trusted_evidence")
        self.assertNotIn("ev_replace", contradictory_ids)

        self.assertIn("ev_refute", contradictory_ids, "Pure refutation evidence must be in contradictory_evidence")
        self.assertNotIn("ev_refute", trusted_ids)

    # -----------------------------------------------------------------------
    # Test 5: Corrector Receives Replacement-Capable Evidence Only
    # -----------------------------------------------------------------------
    def test_corrector_receives_replacement_capable_evidence_only(self) -> None:
        """
        Verify that:
        1. When only Category A evidence is supplied, Corrector marks NO_USABLE_EVIDENCE
           and produces 0 grounded targets, preventing hallucinated replacement.
        2. When Category B evidence is supplied, Corrector binds it as supporting evidence.
        """
        claim_text = "Elon Musk created Java."

        ev_truth = Evidence(
            evidence_id="ev_truth",
            title="Truth Social",
            source="n8n_retrieval",
            snippet="Elon Musk suggests new name for Truth Social app on May 6, 2022.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.90,
            credibility_score=0.70,
        )

        # Case A: Only contradictory noise available
        report_a = ClaimReport(
            claim_id="c_noise_only",
            claim_text=claim_text,
            verdict=VerdictLabel.CONTRADICTED,
            contradiction_score=0.95,
            evidence=[ev_truth],
        )
        vr_a = VerifierResult(
            query_id="q_case_a",
            domain="general",
            claim_reports=[report_a],
            overall_confidence=0.85,
        )
        res_a = self.judge.evaluate(vr_a, user_query="Who created Java?", original_response=claim_text)
        req_a = res_a.correction_request

        # trusted_evidence should be empty because ev_truth is not replacement-capable
        self.assertEqual(len(req_a.trusted_evidence), 0)
        self.assertEqual(len(req_a.contradictory_evidence), 1)

        # Corrector grounding must drop target with NO_USABLE_EVIDENCE
        ireq_a = to_internal_request(req_a)
        plan_a = ground_request(ireq_a)
        self.assertEqual(len(plan_a.grounded_targets), 0)
        self.assertEqual(len(plan_a.skipped_claims), 1)
        self.assertEqual(plan_a.skipped_claims[0].reason, SkipReason.NO_USABLE_EVIDENCE.value)

        # Case B: Replacement evidence available
        ev_gosling = Evidence(
            evidence_id="ev_gosling",
            title="Wikipedia: Java",
            source="wikipedia",
            snippet="Java was designed by James Gosling at Sun Microsystems.",
            entailment_label=EntailmentLabel.CONTRADICTION,
            entailment_score=0.95,
            credibility_score=0.90,
        )
        report_b = ClaimReport(
            claim_id="c_with_replacement",
            claim_text=claim_text,
            verdict=VerdictLabel.CONTRADICTED,
            contradiction_score=0.95,
            evidence=[ev_gosling, ev_truth],
        )
        vr_b = VerifierResult(
            query_id="q_case_b",
            domain="general",
            claim_reports=[report_b],
            overall_confidence=0.90,
        )
        res_b = self.judge.evaluate(vr_b, user_query="Who created Java?", original_response=claim_text)
        req_b = res_b.correction_request

        self.assertEqual(len(req_b.trusted_evidence), 1)
        self.assertEqual(req_b.trusted_evidence[0].evidence_id, "ev_gosling")

        ireq_b = to_internal_request(req_b)
        plan_b = ground_request(ireq_b)
        self.assertEqual(len(plan_b.grounded_targets), 1)
        target = plan_b.grounded_targets[0]
        self.assertTrue(target.has_usable_support)
        self.assertEqual([e.evidence_id for e in target.supporting], ["ev_gosling"])
        self.assertEqual([e.evidence_id for e in target.contradictory], ["ev_truth"])


if __name__ == "__main__":
    unittest.main()
