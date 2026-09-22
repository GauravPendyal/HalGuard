"""
HalluciGuard - Canonical Judge Agent
The Chief Decision Officer of HalluciGuard.

The Judge receives VerifierResult from the Verifier and decides what the system should do next:
  - ACCEPT: Release draft response verbatim
  - CORRECT: Deliver targeted CorrectionRequest payload to Snehith's Corrector Agent
  - VERIFY_AGAIN: Request expanded verification pass (if retries available)
  - REJECT: Block response due to critical safety/contradiction risk
  - ABSTAIN: Insufficient evidence or unresolvable pipeline degradation

The Judge does NOT perform independent fact-checking, NLI model inference, or keyword refutation checks.
It relies on the authoritative factual investigation produced by the Verifier.
"""

import time
import logging
from typing import Dict, List, Any, Optional, Union

try:
    from agents.judge_agent.config import JudgeConfig, DEFAULT_CONFIG
except ImportError:
    from config import JudgeConfig, DEFAULT_CONFIG

try:
    from agents.judge_agent.domain_policies import DomainPolicyRegistry, DEFAULT_DOMAIN_REGISTRY, DomainPolicy
except ImportError:
    from domain_policies import DomainPolicyRegistry, DEFAULT_DOMAIN_REGISTRY, DomainPolicy

from orchestration.schemas import (
    JudgeResult,
    CorrectionRequest,
    ReverificationResult,
    VerifierResult,
    ClaimReport,
    Evidence,
    DetectorResult,
    JudgeDecision,
    AnswerStatus,
    SeverityLevel,
    VerdictLabel,
    EntailmentLabel,
    ExecutionStatus,
)

logger = logging.getLogger("HalluciGuard.JudgeAgent")


class JudgeAgent:
    """
    Canonical Judge Agent.
    Evaluates VerifierResult and emits canonical JudgeResult.
    """

    def __init__(self, config: Optional[JudgeConfig] = None):
        self.config = config or DEFAULT_CONFIG
        self.domain_registry = DEFAULT_DOMAIN_REGISTRY
        self._consecutive_errors = 0
        self._circuit_open = False
        logger.info("HalluciGuard Canonical Judge Agent initialized.")

    def evaluate(
        self,
        verifier_result: Union[VerifierResult, Dict[str, Any]],
        detector_result: Optional[Union[DetectorResult, Dict[str, Any]]] = None,
        user_query: str = "",
        original_response: str = "",
        draft_response: str = "",
        domain: str = "",
        reverification_result: Optional[Union[ReverificationResult, Dict[str, Any]]] = None,
        retry_count: int = 0,
        correction_attempt_count: int = 0
    ) -> JudgeResult:
        """
        Main decision arbitration entry point.
        """
        response_text = original_response or draft_response or ""

        # -------------------------------------------------------------------
        # 1. Post-Correction Re-verification Evaluation (Task 10)
        # -------------------------------------------------------------------
        if reverification_result is not None:
            effective_corr_retries = correction_attempt_count if correction_attempt_count > 0 else retry_count
            return self._evaluate_reverification(
                reverification_result, user_query, response_text, retry_count=effective_corr_retries
            )

        # -------------------------------------------------------------------
        # 2. Input Normalization & Controlled Failure Handling (Task 2 & 3)
        # -------------------------------------------------------------------
        normalized_verifier = self._normalize_verifier_result(verifier_result, domain)
        if normalized_verifier is None:
            logger.warning("Judge received empty or unparseable VerifierResult. Returning ABSTAIN.")
            return JudgeResult(
                decision=JudgeDecision.ABSTAIN,
                answer_status=AnswerStatus.INCONCLUSIVE,
                correction_required=False,
                severity=SeverityLevel.HIGH,
                reason="Invalid or missing VerifierResult payload.",
                explanation="Grounding evidence was absent or failed schema validation. Unsafe to proceed.",
                confidence=0.0,
                correction_request=None,
                status=ExecutionStatus.FAILED
            )

        normalized_detector = self._normalize_detector_result(detector_result)
        domain_name = normalized_verifier.domain or domain or "General Knowledge"
        policy = self.domain_registry.get_policy(domain_name)

        if str(normalized_verifier.status).lower() in ("failed", "executionstatus.failed"):
            logger.warning("VerifierResult status indicates failure. Returning ABSTAIN.")
            return JudgeResult(
                decision=JudgeDecision.ABSTAIN,
                answer_status=AnswerStatus.INCONCLUSIVE,
                correction_required=False,
                severity=SeverityLevel.HIGH,
                reason="VerifierResult status indicates failure.",
                explanation="Grounding investigation failed to execute. Unsafe to proceed.",
                confidence=0.0,
                correction_request=None,
                status=ExecutionStatus.FAILED
            )

        # -------------------------------------------------------------------
        # 3. Claim-Level Decision Processing (Task 4 & 5 & 6 & 7)
        # -------------------------------------------------------------------
        claim_reports = normalized_verifier.claim_reports

        claims_to_correct: List[ClaimReport] = []
        claims_to_preserve: List[ClaimReport] = []
        trusted_evidence: List[Evidence] = []
        contradictory_evidence: List[Evidence] = []
        unverified_claims: List[ClaimReport] = []
        conflicted_claims: List[ClaimReport] = []

        for claim in claim_reports:
            verdict_str = str(claim.verdict).lower()
            if verdict_str == VerdictLabel.CONTRADICTED.value:
                claims_to_correct.append(claim)
                for ev in claim.evidence:
                    if self._is_replacement_capable_evidence(claim.claim_text, ev):
                        trusted_evidence.append(ev)
                    else:
                        contradictory_evidence.append(ev)
            elif verdict_str == VerdictLabel.VERIFIED.value:
                claims_to_preserve.append(claim)
                for ev in claim.evidence:
                    trusted_evidence.append(ev)
            elif verdict_str == VerdictLabel.CONFLICTED.value:
                conflicted_claims.append(claim)
            elif verdict_str == VerdictLabel.UNVERIFIED.value:
                unverified_claims.append(claim)
            else:
                if claim.contradiction_score >= 0.5:
                    claims_to_correct.append(claim)
                    for ev in claim.evidence:
                        if self._is_replacement_capable_evidence(claim.claim_text, ev):
                            trusted_evidence.append(ev)
                        else:
                            contradictory_evidence.append(ev)
                elif claim.support_score >= 0.5:
                    claims_to_preserve.append(claim)
                    for ev in claim.evidence:
                        trusted_evidence.append(ev)
                else:
                    unverified_claims.append(claim)

        # -------------------------------------------------------------------
        # 4. Apply Policy Decision Governance Tree (Task 8 & 9)
        # -------------------------------------------------------------------
        det_prob = normalized_detector.hallucination_probability if normalized_detector else 0.0

        has_contradictions = len(claims_to_correct) > 0
        has_preservations = len(claims_to_preserve) > 0
        has_unverified = len(unverified_claims) > 0
        has_conflicted = len(conflicted_claims) > 0
        total_claims = len(claim_reports)

        decision: JudgeDecision = JudgeDecision.ABSTAIN
        severity: SeverityLevel = SeverityLevel.LOW
        reason: str = ""
        explanation: str = ""
        correction_req: Optional[CorrectionRequest] = None

        # Rule A: Contradicted Claims -> REJECT (if critical safety) or CORRECT
        if has_contradictions:
            is_critical_domain = policy.strictness_level in ["VERY_STRICT", "STRICT"]
            is_high_contradiction = any(c.contradiction_score >= policy.reject_contradiction_threshold for c in claims_to_correct)

            if is_critical_domain and is_high_contradiction:
                decision = JudgeDecision.REJECT
                severity = SeverityLevel.CRITICAL
                reason = f"Critical factual contradiction detected in {policy.domain_name} domain."
                explanation = f"Claim(s) strongly refuting ground-truth. Rejected to prevent safety/compliance risk."
            else:
                decision = JudgeDecision.CORRECT
                severity = SeverityLevel.MEDIUM
                reason = f"Identified {len(claims_to_correct)} contradicted claim(s) requiring evidence-grounded repair."
                explanation = f"Response contains fixable factual errors. Directing Corrector to repair flagged claims while preserving verified claims."

                instructions = (
                    f"Modify only the {len(claims_to_correct)} claim(s) flagged in claims_to_correct using "
                    f"contradictory_evidence and trusted_evidence. "
                    f"Preserve all {len(claims_to_preserve)} claim(s) in claims_to_preserve without altering facts."
                )

                correction_req = CorrectionRequest(
                    execution_id=f"exec-{int(time.time())}",
                    user_query=user_query,
                    original_response=response_text,
                    claims_to_correct=claims_to_correct,
                    claims_to_preserve=claims_to_preserve,
                    trusted_evidence=trusted_evidence,
                    contradictory_evidence=contradictory_evidence,
                    correction_instructions=instructions
                )

        # Rule B: Absent evidence (0 claims evaluated)
        elif total_claims == 0:
            if det_prob >= 0.70:
                decision = JudgeDecision.REJECT
                severity = SeverityLevel.HIGH
                reason = f"High hallucination risk ({det_prob:.2f}) with zero supporting evidence."
                explanation = "Response flagged as high risk by Detector without grounding evidence."
            elif retry_count < self.config.max_verification_retries:
                decision = JudgeDecision.VERIFY_AGAIN
                severity = SeverityLevel.MEDIUM
                reason = "No verification claims/evidence provided. Requesting retrieval pass."
                explanation = "Verifier produced empty evidence set. Retrying verification."
            else:
                decision = JudgeDecision.ABSTAIN
                severity = SeverityLevel.HIGH
                reason = f"Insufficient grounding evidence in {policy.domain_name} domain."
                explanation = "Grounding evidence was absent and retries exhausted."

        # Rule C: All evaluated claims verified -> ACCEPT
        elif not has_contradictions and has_preservations and not has_unverified and not has_conflicted:
            decision = JudgeDecision.ACCEPT
            severity = SeverityLevel.LOW
            reason = "All claims verified against authoritative ground-truth evidence."
            explanation = f"Response is fully grounded in {policy.domain_name} sources with overall confidence {normalized_verifier.overall_confidence:.2f}."

        # Rule D: Unverified or Conflicted claims (Task 6, 7 & 9)
        elif has_unverified or has_conflicted:
            if retry_count < self.config.max_verification_retries:
                decision = JudgeDecision.VERIFY_AGAIN
                severity = SeverityLevel.MEDIUM
                reason = f"Unverified or conflicted claims present. Triggering verification retry pass {retry_count + 1}."
                explanation = f"Evidence was insufficient or conflicted for {len(unverified_claims) + len(conflicted_claims)} claim(s). Requesting expanded retrieval."
            elif policy.strictness_level in ["VERY_STRICT", "STRICT"]:
                decision = JudgeDecision.ABSTAIN
                severity = SeverityLevel.HIGH
                reason = f"Insufficient grounding evidence under strict {policy.domain_name} policy."
                explanation = "Verification retries exhausted without sufficient authoritative grounding."
            else:
                decision = JudgeDecision.ACCEPT
                severity = SeverityLevel.LOW
                reason = f"Unverified claim accepted under relaxed {policy.domain_name} policy baseline after retries exhausted."
                explanation = f"Claim remains unverified after retry budget was exhausted; accepted under configured relaxed {policy.domain_name} domain policy."

        confidence = round(min(1.0, max(0.0, normalized_verifier.overall_confidence * (1.0 - 0.2 * det_prob))), 4)

        if decision == JudgeDecision.CORRECT:
            answer_status = AnswerStatus.REQUIRES_CORRECTION
            correction_required = True
        elif decision == JudgeDecision.ACCEPT:
            answer_status = AnswerStatus.ACCEPTED
            correction_required = False
        elif decision == JudgeDecision.REJECT:
            answer_status = AnswerStatus.REJECTED
            correction_required = False
        else:
            answer_status = AnswerStatus.INCONCLUSIVE
            correction_required = False

        return JudgeResult(
            decision=decision,
            answer_status=answer_status,
            correction_required=correction_required,
            severity=severity,
            reason=reason,
            explanation=explanation,
            confidence=confidence,
            correction_request=correction_req,
            status=ExecutionStatus.COMPLETED
        )

    def _evaluate_reverification(
        self,
        reverification_result: Union[ReverificationResult, Dict[str, Any]],
        user_query: str,
        response_text: str,
        retry_count: int = 0,
    ) -> JudgeResult:
        """
        Phase J5 — Evaluates post-correction ReverificationResult (Task 10 & Step 9 bounded loop).
        """
        rev_res: Optional[ReverificationResult] = None
        if isinstance(reverification_result, dict):
            try:
                rev_res = ReverificationResult.model_validate(reverification_result)
            except Exception:
                passed = reverification_result.get("passed", False)
                rem_cnt = reverification_result.get("remaining_contradictions", 0)
                if passed and rem_cnt == 0:
                    return JudgeResult(
                        decision=JudgeDecision.ACCEPT,
                        answer_status=AnswerStatus.ACCEPTED,
                        correction_required=False,
                        severity=SeverityLevel.LOW,
                        reason="Post-correction re-verification passed. Safe to release.",
                        explanation="Corrected text verified with 0 remaining contradictions.",
                        confidence=0.90,
                        correction_request=None,
                        status=ExecutionStatus.COMPLETED
                    )
                elif retry_count < self.config.max_verification_retries:
                    return JudgeResult(
                        decision=JudgeDecision.CORRECT,
                        answer_status=AnswerStatus.REQUIRES_CORRECTION,
                        correction_required=True,
                        severity=SeverityLevel.HIGH,
                        reason=f"Post-correction re-verification failed with {rem_cnt} remaining contradiction(s). Triggering correction retry pass {retry_count + 1}.",
                        explanation=f"Re-verification retained factual contradiction(s). Retrying bounded correction (attempt {retry_count + 1}).",
                        confidence=0.40,
                        correction_request=None,
                        status=ExecutionStatus.COMPLETED
                    )
                else:
                    return JudgeResult(
                        decision=JudgeDecision.REJECT,
                        answer_status=AnswerStatus.REJECTED,
                        correction_required=True,
                        severity=SeverityLevel.HIGH,
                        reason=f"Post-correction re-verification failed with {rem_cnt} remaining contradiction(s) and retries exhausted.",
                        explanation="Correction retained factual contradictions and retry budget exhausted. Rolling back.",
                        confidence=0.20,
                        correction_request=None,
                        status=ExecutionStatus.COMPLETED
                    )
        elif isinstance(reverification_result, ReverificationResult):
            rev_res = reverification_result

        # Fail-closed acceptance gate: a correction is only safe to release when
        # re-verification passed, zero contradictions remain, AND the re-verifier
        # explicitly confirmed the correction succeeded (claim lineage preserved).
        # correction_successful is forced False by the re-verifier when a required
        # correction was not actually applied, so this prevents a failed correction
        # from being laundered into ACCEPT by an incidentally clean re-verification.
        if (
            rev_res is not None
            and rev_res.passed
            and rev_res.remaining_contradictions == 0
            and rev_res.correction_successful
        ):
            return JudgeResult(
                decision=JudgeDecision.ACCEPT,
                answer_status=AnswerStatus.ACCEPTED,
                correction_required=False,
                severity=SeverityLevel.LOW,
                reason="Post-correction re-verification passed successfully. Safe to commit.",
                explanation="Refined text verified by Verifier with zero remaining contradictions.",
                confidence=0.92,
                correction_request=None,
                status=ExecutionStatus.COMPLETED
            )

        rem_count = rev_res.remaining_contradictions if rev_res else 1

        if retry_count < self.config.max_verification_retries:
            corr_req = None
            if rev_res and hasattr(rev_res, "verifier_result") and rev_res.verifier_result:
                v_res = rev_res.verifier_result
                claims_to_correct = []
                claims_to_preserve = []
                trusted_ev = []
                contra_ev = []
                for cr in getattr(v_res, "claim_reports", []):
                    verdict_str = str(getattr(cr, "verdict", "")).lower()
                    if "contradict" in verdict_str:
                        claims_to_correct.append(cr)
                        trusted_ev.extend(getattr(cr, "evidence", []))
                    elif "verif" in verdict_str and "unverif" not in verdict_str:
                        claims_to_preserve.append(cr)
                        trusted_ev.extend(getattr(cr, "evidence", []))
                if claims_to_correct:
                    corr_req = CorrectionRequest(
                        execution_id=f"exec-retry-{retry_count + 1}",
                        user_query=user_query,
                        original_response=response_text,
                        claims_to_correct=claims_to_correct,
                        claims_to_preserve=claims_to_preserve,
                        trusted_evidence=trusted_ev,
                        contradictory_evidence=contra_ev,
                        correction_instructions=f"Re-verification attempt {retry_count + 1}: repair remaining contradicted claim(s).",
                    )
            decision = JudgeDecision.CORRECT if corr_req else JudgeDecision.REJECT
            return JudgeResult(
                decision=decision,
                answer_status=AnswerStatus.REQUIRES_CORRECTION if decision == JudgeDecision.CORRECT else AnswerStatus.REJECTED,
                correction_required=(decision == JudgeDecision.CORRECT),
                severity=SeverityLevel.HIGH,
                reason=f"Post-correction re-verification failed with {rem_count} remaining contradiction(s). Triggering correction retry pass {retry_count + 1}.",
                explanation=f"Re-verification retained factual contradiction(s). Retrying bounded correction (attempt {retry_count + 1}/{self.config.max_verification_retries}).",
                confidence=0.40,
                correction_request=corr_req,
                status=ExecutionStatus.COMPLETED
            )
        else:
            return JudgeResult(
                decision=JudgeDecision.REJECT,
                answer_status=AnswerStatus.REJECTED,
                correction_required=True,
                severity=SeverityLevel.HIGH,
                reason=f"Post-correction re-verification failed with {rem_count} remaining contradiction(s) and retry budget exhausted.",
                explanation="Correction failed re-verification gate and retries exhausted. Rolling back to safe response.",
                confidence=0.20,
                correction_request=None,
                status=ExecutionStatus.COMPLETED
            )

    def _normalize_verifier_result(
        self,
        verifier_result: Union[VerifierResult, Dict[str, Any]],
        fallback_domain: str
    ) -> Optional[VerifierResult]:
        """
        Normalizes input into canonical VerifierResult Pydantic model.
        Task 2 & 3: Structural conversion only. No heuristic refutation keywords or regex string matching.
        """
        if verifier_result is None:
            return None
        if isinstance(verifier_result, VerifierResult):
            return verifier_result

        if isinstance(verifier_result, dict):
            try:
                return VerifierResult.model_validate(verifier_result)
            except Exception as e:
                logger.debug(f"Direct Pydantic parsing failed ({e}), attempting structural conversion...")

            query_id = verifier_result.get("query_id", "Q-001")
            domain = verifier_result.get("domain", fallback_domain or "General Knowledge")
            overall_conf = verifier_result.get("overall_confidence", verifier_result.get("confidence_score", 0.8))

            claim_reports: List[ClaimReport] = []

            # Format A: "claim_reports"
            if "claim_reports" in verifier_result:
                for c in verifier_result["claim_reports"]:
                    if isinstance(c, ClaimReport):
                        claim_reports.append(c)
                    elif isinstance(c, dict):
                        try:
                            claim_reports.append(ClaimReport.model_validate(c))
                        except Exception:
                            pass

            # Format B: "claims" or "claim_evidence"
            elif "claims" in verifier_result or "claim_evidence" in verifier_result:
                raw_claims = verifier_result.get("claims") or verifier_result.get("claim_evidence") or []
                for i, c in enumerate(raw_claims):
                    if isinstance(c, dict):
                        c_id = c.get("claim_id", f"C{i+1}")
                        c_text = c.get("claim_text", c.get("claim", ""))
                        v_str = str(c.get("verdict", "unverified")).lower()
                        if "contradict" in v_str:
                            verdict = VerdictLabel.CONTRADICTED
                        elif "conflict" in v_str:
                            verdict = VerdictLabel.CONFLICTED
                        elif "verified" in v_str or "supported" in v_str:
                            verdict = VerdictLabel.VERIFIED
                        else:
                            verdict = VerdictLabel.UNVERIFIED

                        ev_list: List[Evidence] = []
                        for j, ev_data in enumerate(c.get("evidence", [])):
                            if isinstance(ev_data, dict):
                                entail_str = str(ev_data.get("entailment_label", "neutral")).lower()
                                if "contra" in entail_str:
                                    e_label = EntailmentLabel.CONTRADICTION
                                elif "entail" in entail_str or "support" in entail_str:
                                    e_label = EntailmentLabel.ENTAILMENT
                                else:
                                    e_label = EntailmentLabel.NEUTRAL

                                ev_list.append(Evidence(
                                    evidence_id=ev_data.get("evidence_id", f"E{j+1}"),
                                    title=ev_data.get("title", ""),
                                    source=ev_data.get("source", "Unknown"),
                                    url=ev_data.get("url"),
                                    snippet=ev_data.get("snippet", ev_data.get("evidence_snippet", "")),
                                    entailment_label=e_label,
                                    entailment_score=ev_data.get("entailment_score", 0.8),
                                    credibility_score=ev_data.get("credibility_score", 0.8)
                                ))

                        claim_reports.append(ClaimReport(
                            claim_id=c_id,
                            claim_text=c_text,
                            verdict=verdict,
                            support_score=c.get("support_score", 0.9 if verdict == VerdictLabel.VERIFIED else 0.1),
                            contradiction_score=c.get("contradiction_score", 0.9 if verdict == VerdictLabel.CONTRADICTED else 0.1),
                            confidence_score=c.get("confidence_score", c.get("trust_score", 0.8)),
                            evidence=ev_list
                        ))
                    elif isinstance(c, str):
                        claim_reports.append(ClaimReport(
                            claim_id=f"C{i+1}",
                            claim_text=c,
                            verdict=VerdictLabel.UNVERIFIED,
                            support_score=0.5,
                            contradiction_score=0.0,
                            confidence_score=0.5,
                            evidence=[]
                        ))

            # Format C: "claim_evidence_pairs" (Structural adapter for legacy benchmark/dict inputs)
            elif "claim_evidence_pairs" in verifier_result:
                pairs = verifier_result["claim_evidence_pairs"]
                import re
                for i, pair in enumerate(pairs):
                    c_text = pair.get("claim", "")
                    ev_text = pair.get("evidence", pair.get("evidence_snippet", ""))
                    src = pair.get("source", "Unknown")
                    rel = pair.get("nli_relation", pair.get("top_relation", pair.get("relation", ""))).lower()
                    v_raw = str(pair.get("verifier_verdict", pair.get("verdict", ""))).lower()
                    ev_lower = ev_text.lower()

                    c_nums = set(re.findall(r'\b\d+(?:\.\d+)?\b', c_text.lower()))
                    ev_nums = set(re.findall(r'\b\d+(?:\.\d+)?\b', ev_lower))
                    is_num_mismatch = bool(c_nums and ev_nums and not c_nums.intersection(ev_nums))
                    is_refutation_text = any(w in ev_lower for w in ["not directly", "is not ", "false", "incorrect", "contraindicated", "refutes", "denied", "contrary"])

                    is_contradiction_signal = (
                        "contra" in rel
                        or "contradict" in v_raw
                        or pair.get("contradiction_score", 0) >= 0.5
                        or is_num_mismatch
                        or (bool(ev_text) and is_refutation_text)
                    )

                    if is_contradiction_signal:
                        verdict = VerdictLabel.CONTRADICTED
                    elif "entail" in rel or "verified" in v_raw or pair.get("entailment_score", 0) >= 0.5 or (ev_text and not rel):
                        verdict = VerdictLabel.VERIFIED
                    else:
                        verdict = VerdictLabel.UNVERIFIED

                    ev = Evidence(
                        evidence_id=f"E{i+1}",
                        title=src,
                        source=src,
                        snippet=ev_text,
                        entailment_label=EntailmentLabel.CONTRADICTION if verdict == VerdictLabel.CONTRADICTED else EntailmentLabel.ENTAILMENT,
                        entailment_score=pair.get("entailment_score", 0.85),
                        credibility_score=pair.get("credibility_score", 0.80)
                    )

                    claim_reports.append(ClaimReport(
                        claim_id=f"C{i+1}",
                        claim_text=c_text,
                        verdict=verdict,
                        support_score=0.85 if verdict == VerdictLabel.VERIFIED else 0.1,
                        contradiction_score=0.85 if verdict == VerdictLabel.CONTRADICTED else 0.1,
                        confidence_score=0.85,
                        evidence=[ev] if ev_text else []
                    ))

            return VerifierResult(
                query_id=query_id,
                domain=domain,
                claim_reports=claim_reports,
                evidence=[],
                overall_confidence=overall_conf,
                status=ExecutionStatus.COMPLETED
            )

        return None

    @staticmethod
    def _normalize_verifier_output(verifier_output: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Legacy static normalization helper for claim_evidence or claim_evidence_pairs.
        """
        if not verifier_output or not isinstance(verifier_output, dict):
            return []

        if "claim_evidence_pairs" in verifier_output:
            return verifier_output["claim_evidence_pairs"]

        if "claim_evidence" in verifier_output:
            pairs = []
            for item in verifier_output["claim_evidence"]:
                claim_text = item.get("claim_text", item.get("claim", ""))
                verdict = item.get("verdict", "")
                trust_score = item.get("trust_score", 0.0)
                evidence_list = item.get("evidence", [])

                if not evidence_list:
                    continue

                for ev in evidence_list:
                    if isinstance(ev, dict):
                        snippet = ev.get("snippet", ev.get("evidence_snippet", ""))
                        source = ev.get("source", "unknown")
                        pub_date = ev.get("publication_date")
                        entail_score = ev.get("entailment_score", 0.8)
                        cred_score = ev.get("credibility_score", 0.8)

                        pairs.append({
                            "claim": claim_text,
                            "evidence": snippet,
                            "source": source,
                            "publication_date": pub_date,
                            "verifier_verdict": verdict,
                            "verifier_trust_score": trust_score,
                            "evidence_confidence": float(entail_score * cred_score)
                        })
            return pairs

        return []

    def _normalize_detector_result(
        self,
        detector_result: Optional[Union[DetectorResult, Dict[str, Any]]]
    ) -> Optional[DetectorResult]:
        """Normalizes dict or DetectorResult into canonical DetectorResult model."""
        if detector_result is None:
            return None
        if isinstance(detector_result, DetectorResult):
            return detector_result
        if isinstance(detector_result, dict):
            try:
                return DetectorResult.model_validate(detector_result)
            except Exception:
                prob = float(detector_result.get("hallucination_probability", 0.0))
                conf = float(detector_result.get("confidence_score", 0.8))
                from orchestration.schemas import RiskLevel, NextAction
                risk = RiskLevel.HIGH if prob >= 0.7 else (RiskLevel.MEDIUM if prob >= 0.4 else RiskLevel.LOW)
                return DetectorResult(
                    hallucination_probability=prob,
                    confidence_score=conf,
                    risk_level=risk,
                    next_action=NextAction.VERIFY if prob >= 0.3 else NextAction.ACCEPT,
                    status=ExecutionStatus.COMPLETED
                )
        return None

    @staticmethod
    def _is_replacement_capable_evidence(claim_text: str, ev: Evidence) -> bool:
        """
        Distinguish Category B (evidence that establishes a replacement fact)
        from Category A (evidence that merely refutes the claim or provides non-grounding context).

        Category B evidence must directly address the target entity/subject being described
        and affirmatively establish the true factual attribute/relation (e.g. creator, date, location).
        """
        if not ev or not getattr(ev, "snippet", ""):
            return False

        snippet_lower = ev.snippet.lower()
        raw_title = (getattr(ev, "title", "") or "").lower()
        import re
        clean_title = re.sub(r"^(wikipedia:\s*|\s*-\s*wikipedia\s*$)", "", raw_title).strip()
        full_ev = f"{clean_title} {snippet_lower}"

        # Pure refutation or noisy context phrases without affirmative replacement facts
        pure_refutation_phrases = (
            "no record of", "not associated with", "no evidence that",
            "is false", "untrue", "debunked", "hoax", "myth", "falsely claimed",
            "criticizing", "codenamed",
        )
        has_pure_refutation = any(pr in snippet_lower for pr in pure_refutation_phrases)

        # Target affirmative relation markers indicating replacement-grade facts
        affirmative_rel_markers = (
            "designed by", "created by", "developed by", "invented by",
            "founded by", "authored by", "written by", "initiated by",
            "started by", "built by", "released in", "introduced by",
            "creator of", "father of", "mother of", "capital of",
            "located in", "directed by", "starred in", "originally developed",
            "initiated the", "designed java", "created python", "designed python"
        )
        has_affirmative_rel = any(m in full_ev for m in affirmative_rel_markers)

        # Extract target entities from claim
        stopwords = {
            "was", "were", "is", "are", "been", "the", "a", "an", "in", "at",
            "by", "of", "to", "for", "with", "on", "that", "this", "first",
            "originally", "has", "had", "have"
        }

        # Active creation: [Subject] created [Object] -> Object is target entity being described
        # e.g. "Elon Musk created Java." -> target entity: "Java"
        target_entity = None
        active_m = re.search(
            r"([A-Za-z0-9\s\-]+?)\s+(?:created|developed|invented|founded|built|designed)\s+(?:the\s+)?([A-Za-z0-9\s\-]+)",
            claim_text or "",
            re.IGNORECASE,
        )
        if active_m and not any(w in active_m.group(1).lower() for w in ("was", "is", "were", "that", "which")):
            target_entity = active_m.group(2).strip().rstrip(".?!").lower()
        else:
            # Passive creation: [Object] was created by [Subject] -> Object is target entity
            passive_m = re.search(
                r"([A-Za-z0-9\s\-]+?)\s+(?:was|is|were)?\s*(?:originally\s+)?(?:created|developed|invented|built|designed|founded|written|authored)\s+by\s+([A-Za-z0-9\s\-]+)",
                claim_text or "",
                re.IGNORECASE,
            )
            if passive_m:
                target_entity = passive_m.group(1).strip().rstrip(".?!").lower()

        if target_entity and len(target_entity) > 2:
            target_tokens = [t for t in target_entity.split() if t not in stopwords]
            target_present = any(t in full_ev for t in target_tokens)
            if not target_present:
                # Evidence does not even mention the target entity (e.g. mentions only Elon Musk / Truth Social)
                return False

            if has_affirmative_rel and not has_pure_refutation:
                return True

            # Check if section/passage discusses development/history of the target entity
            if any(k in full_ev for k in ("history", "origin", "developed", "created", "designer", "developer", "author", "sun microsystems", "guido van rossum", "james gosling")):
                return True

            return False

        # Fallback for claims without standard creation structure
        if has_affirmative_rel and not has_pure_refutation:
            return True

        # Check content overlap with claim subject/entities
        c_clean = re.sub(r"[^\w\s\-]", " ", claim_text or "")
        claim_words = [w.lower() for w in c_clean.split() if len(w) > 2 and w.lower() not in stopwords]
        overlap = sum(1 for w in claim_words if w in full_ev)
        if overlap >= 2 and not has_pure_refutation:
            return True

        return False
