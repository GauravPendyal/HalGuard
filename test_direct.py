"""
HalluciGuard 7-Agent Multi-Agent Pipeline Local Test Runner.

Executes the complete LangGraph multi-agent workflow:
1. Base LLM (Draft Generator)
2. Detector Agent (Hallucination Risk & Token Analysis)
3. Verifier Agent (Multi-Source Retrieval: n8n + Tavily + Wikipedia + NLI)
4. Judge Agent (Arbitration & Consistency Decision)
5. Corrector Agent (Grounded Fact-Repair & Hallucination Elimination)
6. Reverifier Node (Post-Correction Factual Re-Validation)
7. Memory Agent (Knowledge Graph & Vector Persistence)
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from collections import Counter
from pathlib import Path

# Setup root path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

verifier_dir = ROOT_DIR / "agents" / "verifier_agent"
if str(verifier_dir) not in sys.path:
    sys.path.insert(0, str(verifier_dir))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

# Ensure UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from orchestration.graph import run_verification


def format_breakdown(query: str, result: dict, total_time: float) -> None:
    print("\n" + "=" * 80)
    print("  PIPELINE EXECUTION BREAKDOWN BY AGENT")
    print("=" * 80)

    # 1. Base LLM
    base_llm = result.get("base_llm") or {}
    draft = result.get("draft_response") or result.get("llm_response") or ""
    provider = base_llm.get("provider", "openrouter")
    model = base_llm.get("model", os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-7b-instruct"))
    latency = base_llm.get("latency_ms", 0)

    print("\n" + "-" * 80)
    print("1. [AGENT] BASE LLM (Draft Generator)")
    print("-" * 80)
    print(f"  • Model Provider: {provider}")
    print(f"  • Model Name:     {model}")
    print(f"  • Generation Latency: {latency} ms")
    print("  • Draft Response:")
    indented_draft = "\n    ".join(draft.strip().splitlines())
    print(f"    \"{indented_draft}\"")

    # 2. Detector
    detector = result.get("detector") or result.get("detector_result") or {}
    risk_level = detector.get("risk_level", "LOW")
    if hasattr(risk_level, "value"):
        risk_level = risk_level.value
    prob = detector.get("hallucination_probability", 0.0)
    conf = detector.get("confidence_score", 1.0 - prob)
    next_action = detector.get("next_action", "Verify")
    if hasattr(next_action, "value"):
        next_action = next_action.value

    print("\n" + "-" * 80)
    print("2. [AGENT] DETECTOR AGENT (Hallucination Risk & Token Analysis)")
    print("-" * 80)
    detector_model = (
        detector.get("model_source")
        or detector.get("detector_model_source")
        or detector.get("model_repository")
        or "Manjunath2000006/halluciguard-detector"
    )
    print(f"  • Model Repository:          {detector_model}")
    print(f"  • Hallucination Risk Level:  RISKLEVEL.{str(risk_level).upper()}")
    print(f"  • Hallucination Probability: {prob:.4f}")
    print(f"  • Confidence Score:          {conf:.4f}")
    print(f"  • Recommended Route Action:  NEXTACTION.{str(next_action).upper()}")

    # 3. Verifier (Original Draft Verification)
    verifier = result.get("verifier") or result.get("verifier_result") or {}
    search_ints = verifier.get("search_integrations") or ["n8n", "tavily", "wikipedia"]
    claims = verifier.get("claim_evidence") or verifier.get("claim_reports") or []
    draft_status = (
        verifier.get("draft_verification_status")
        or verifier.get("verification_status")
        or result.get("draft_verification_status")
        or result.get("original_verification_status")
        or "unverified"
    )

    print("\n" + "-" * 80)
    print("3. [AGENT] VERIFIER AGENT (Original Draft Claim Verification)")
    print("-" * 80)
    print(f"  • Search Integrations: {search_ints}")
    print(f"  • Evaluated Claims Count: {len(claims)}")
    print(f"  • Draft Answer Verification Status: {str(draft_status).upper()}")

    for idx, c in enumerate(claims, 1):
        c_text = c.get("claim_text") or c.get("claim") or query
        c_verdict = c.get("verdict", "UNVERIFIED")
        c_expl = c.get("explanation", "N/A")
        evidence_list = c.get("grounding_evidence") or c.get("evidence") or []
        print(f"\n    [Original Draft Claim #{idx}]: \"{c_text}\"")
        print(f"    • Verdict: {str(c_verdict).upper()}")
        print(f"    • Explanation: {c_expl}")
        print(f"    • Grounding Evidence Snippets ({len(evidence_list)} retrieved):")
        for e_idx, ev in enumerate(evidence_list[:4], 1):
            src = ev.get("source", "web")
            nli_label = ev.get("nli_label", "neutral")
            nli_score = ev.get("nli_score", ev.get("entailment_score", 0.0))
            snip = ev.get("snippet", ev.get("text", ""))[:120].replace("\n", " ")
            print(f"      ({e_idx}) [{src}] (NLI: {nli_label} {nli_score}): {snip}...")

    # 4. Judge
    judge = result.get("judge") or result.get("judge_result") or {}
    j_dec = judge.get("decision", "ACCEPT")
    j_sev = judge.get("severity", "LOW")
    j_conf = judge.get("confidence", 0.90)
    j_reas = judge.get("reason", "Verification assessment complete.")
    j_expl = judge.get("explanation", "Completed multi-agent evaluation.")
    j_corr = bool(judge.get("correction_requested", False))

    print("\n" + "-" * 80)
    print("4. [AGENT] JUDGE AGENT (Arbitration & Consistency Decision)")
    print("-" * 80)
    print(f"  • Decision:    {str(j_dec).upper()}")
    print(f"  • Severity:    {str(j_sev).upper()}")
    print(f"  • Confidence:  {j_conf:.2f}")
    print(f"  • Reason:      {j_reas}")
    print(f"  • Explanation: {j_expl}")
    print(f"  • Correction Requested: {j_corr}")

    # 5. Corrector
    corrector = result.get("corrector") or result.get("correction_result") or {}
    orig_draft = corrector.get("original_text", draft)
    corr_resp = corrector.get("corrected_text", orig_draft)
    c_status_raw = str(result.get("correction_status", "")).lower()
    c_exec_status = str(corrector.get("status", "")).lower()
    c_val = str(corrector.get("validation_status", "valid")).lower()
    c_att = result.get("correction_attempt_count", 1 if corrector else 0)
    c_changed = corrector.get("changed_claims", [])
    has_unresolved_claims = any(
        isinstance(c, dict) and str(c.get("action", "")).lower() == "unresolved"
        for c in c_changed
    )

    is_reconstructed = bool(
        corr_resp
        and corr_resp.strip() != orig_draft.strip()
        and c_exec_status not in ("terminated_unresolved", "failed")
        and c_status_raw != "unresolved"
    )

    if is_reconstructed:
        c_action = "APPLIED (Grounded replacement synthesized & spliced)"
        c_status = result.get("correction_status") or "applied"
    elif not corrector:
        c_action = "SKIPPED (No contradictions identified)"
        c_status = result.get("correction_status") or "skipped"
    elif (
        c_status_raw in ("unresolved", "failed")
        or c_exec_status in ("terminated_unresolved", "failed", "fallback")
        or has_unresolved_claims
        or c_val == "invalid"
    ):
        c_action = "FAILED / UNRESOLVED — no valid correction produced"
        c_status = result.get("correction_status") or ("unresolved" if (has_unresolved_claims or c_exec_status == "terminated_unresolved") else "failed")
    else:
        c_action = "COMPLETED (No textual modification needed)"
        c_status = result.get("correction_status") or "completed"

    print("\n" + "-" * 80)
    print("5. [AGENT] CORRECTOR AGENT (Grounded Fact-Repair & Hallucination Elimination)")
    print("-" * 80)
    print(f"  • Correction Action: {c_action}")
    print(f"  • Correction Status: {str(c_status).upper()}")
    print(f"  • Validation Status: {c_val}")
    print(f"  • Attempts Made: {c_att}")
    print(f"  • Changed Claims: {c_changed}")
    print("  • Original Draft:")
    indented_orig = "\n    ".join(orig_draft.strip().splitlines())
    print(f"    \"{indented_orig}\"")
    print("  • Corrected Response:")
    indented_corr = "\n    ".join(corr_resp.strip().splitlines())
    print(f"    \"{indented_corr}\"")

    # 6. Reverifier
    reverifier = result.get("reverifier") or result.get("reverification_result") or {}
    r_status = "TRIGGERED & EVALUATED" if reverifier else "SKIPPED"
    r_passed = reverifier.get("passed", True if not reverifier else False)
    r_rem = reverifier.get("remaining_contradictions", 0)
    r_att = result.get("reverification_attempt_count", 1 if reverifier else 0)
    if r_passed and r_rem == 0:
        corrected_verdict = "VERIFIED / SUPPORTED"
    elif r_rem > 0:
        corrected_verdict = "CONTRADICTED"
    else:
        corrected_verdict = "UNVERIFIED"

    print("\n" + "-" * 80)
    print("6. [AGENT] REVERIFIER NODE (Post-Correction Factual Re-Validation)")
    print("-" * 80)
    print(f"  • Evaluation Status: {r_status}")
    print(f"  • Re-Verification Passed: {r_passed}")
    print(f"  • Corrected Answer Verification Status: {corrected_verdict}")
    print(f"  • Remaining Contradictions: {r_rem}")
    print(f"  • Reverification Attempts: {r_att}")

    # 7. Memory
    memory = result.get("memory") or result.get("memory_result") or {}
    m_stat = memory.get("status", "stored" if result.get("terminal_status") == "accepted" else "skipped")
    m_cnt = memory.get("count", memory.get("stored_facts_count", memory.get("stored_count", len(memory.get("stored", [])))))
    m_ids = (
        memory.get("persisted_fact_ids")
        or memory.get("fact_ids")
        or result.get("persisted_fact_ids")
    )
    if not m_ids and isinstance(result.get("memory_result"), dict):
        m_ids = result.get("memory_result", {}).get("fact_ids")
    if not m_ids and memory.get("stored"):
        m_ids = [s.get("fact_id") for s in memory.get("stored") if isinstance(s, dict) and s.get("fact_id")]
    if not m_ids:
        m_ids = []
    kg_act = bool(memory.get("kg_active", True))
    vec_act = bool(memory.get("vector_active", True))

    print("\n" + "-" * 80)
    print("7. [AGENT] MEMORY AGENT (Knowledge Graph & Vector Persistence)")
    print("-" * 80)
    print(f"  • Persistence Status: {m_stat}")
    print(f"  • Stored Facts Count: {m_cnt}")
    print(f"  • Persisted Fact IDs: {m_ids}")
    print(f"  • Knowledge Graph Active: {kg_act}")
    print(f"  • Vector Memory Active:   {vec_act}")

    # Final Supervisor Summary
    term = str(result.get("terminal_status", "completed")).upper()
    pipe_v_stat = str(result.get("verification_status", "verified")).upper()
    final_out = result.get("final_response") or result.get("draft_response") or ""

    if is_reconstructed:
        corr_summary_str = "APPLIED"
    elif not corrector:
        corr_summary_str = "SKIPPED / NOT NEEDED"
    elif (
        c_status_raw in ("unresolved", "failed")
        or c_exec_status in ("terminated_unresolved", "failed", "fallback")
        or has_unresolved_claims
        or c_val == "invalid"
    ):
        corr_summary_str = "FAILED / UNRESOLVED"
    else:
        corr_summary_str = "NOT NEEDED"

    # Execution Lifecycle Trace (observability).
    # `format_breakdown` above renders only the TERMINAL merged state, so a
    # VERIFY_AGAIN retry loop (multiple verifier/judge passes) is invisible in
    # the per-agent sections. The trace is the only faithful per-node record
    # (HalluciGuardState is last-write-wins with no reducers), so we surface it
    # here to make the printed report agree with the real graph lifecycle.
    trace = result.get("trace") or []
    if trace:
        node_counts = Counter(ev.get("node") for ev in trace)
        print("\n" + "-" * 80)
        print("   EXECUTION LIFECYCLE TRACE (per-node, faithful order)")
        print("-" * 80)
        print(
            f"  • Verifier passes: {node_counts.get('verifier', 0)}   "
            f"Judge passes: {node_counts.get('judge', 0)}   "
            f"Retry budget: {result.get('retry_count', 0)}/{result.get('max_retries', 2)}"
        )
        for i, ev in enumerate(trace):
            dec = (ev.get("details") or {}).get("decision")
            dec_str = f"  decision={dec}" if dec else ""
            print(
                f"    {i:>2}. {str(ev.get('node')):<16} "
                f"{str(ev.get('status')):<10} rc={ev.get('retry_count')}{dec_str}"
            )

    print("\n" + "=" * 80)
    print("  FINAL SUPERVISOR SUMMARY & TELEMETRY BREAKDOWN")
    print("=" * 80)
    print(f"  • Original Draft Verification:  {str(draft_status).upper()}")
    print(f"  • Correction Applied:           {corr_summary_str}")
    print(f"  • Corrected Answer Status:      {corrected_verdict if reverifier else 'N/A'}")
    print(f"  • Final Answer Decision:        {term}")
    print(f"  • Pipeline Lifecycle Status:    {pipe_v_stat}")
    print(f"  • Total Pipeline Time:          {total_time:.2f}s")
    print("\n  • Final Output Delivered to User:")
    indented_final = "\n    ".join(final_out.strip().splitlines())
    print(f"    \"{indented_final}\"")
    print("=" * 80 + "\n")


async def main():
    if len(sys.argv) > 1:
        user_query = " ".join(sys.argv[1:])
    else:
        user_query = "Java was created by snehith"

    print("\n" + "=" * 80)
    print("      HALLUCIGUARD 7-AGENT MULTI-AGENT PIPELINE LOCAL TEST")
    print("=" * 80)
    print(f"[*] Input Query: \"{user_query}\"")
    print("\n[*] Executing LangGraph Multi-Agent Workflow...")

    t0 = time.time()
    
    # If OPENROUTER_API_KEY is not set, we provide the input query as the draft statement
    # so the full 7-agent pipeline (Detector -> Verifier -> Judge -> Corrector -> Reverifier -> Memory)
    # can run offline without hitting API rate limits or missing credentials.
    has_openrouter = bool(os.getenv("OPENROUTER_API_KEY", "").strip())
    draft_arg = "" if has_openrouter else user_query

    try:
        result = await run_verification(
            user_query=user_query,
            llm_response=draft_arg,
            domain="general",
        )
        total_time = time.time() - t0
        format_breakdown(user_query, result, total_time)
    except Exception as exc:
        print(f"\n[ERROR] Multi-Agent Pipeline Execution Failed: {type(exc).__name__}: {exc}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
