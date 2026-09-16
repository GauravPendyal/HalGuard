import asyncio
import sys
import json
import time
import os
from dotenv import load_dotenv

# Ensure UTF-8 output in Windows CMD
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

from orchestration.graph import run_verification

async def main():
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "Java was created by James Gosling"

    print("\n" + "=" * 80)
    print("      HALLUCIGUARD 7-AGENT MULTI-AGENT PIPELINE LOCAL TEST")
    print("=" * 80)
    print(f"[*] Input Query: \"{query}\"\n")

    start_time = time.time()
    print("[*] Executing LangGraph Multi-Agent Workflow...")
    result = await run_verification(user_query=query)
    elapsed = time.time() - start_time

    print("\n" + "=" * 80)
    print("  PIPELINE EXECUTION BREAKDOWN BY AGENT")
    print("=" * 80)

    # 1. Base LLM
    print("\n" + "-" * 80)
    print("1. [AGENT] BASE LLM (Draft Generator)")
    print("-" * 80)
    base_llm = result.get("base_llm", {})
    print(f"  • Model Provider: {base_llm.get('provider', 'openrouter')}")
    print(f"  • Model Name:     {base_llm.get('model', 'qwen/qwen-2.5-7b-instruct')}")
    print(f"  • Generation Latency: {base_llm.get('latency_ms', 0)} ms")
    draft = result.get("draft_response", result.get("llm_response", ""))
    print(f"  • Draft Response:\n    \"{draft}\"")

    # 2. Detector Agent
    print("\n" + "-" * 80)
    print("2. [AGENT] DETECTOR AGENT (Hallucination Risk & Token Analysis)")
    print("-" * 80)
    detector = result.get("detector_result") or result.get("detector", {})
    risk_level = str(detector.get("risk_level", "UNKNOWN")).upper()
    prob = float(detector.get("hallucination_probability", 0.0))
    conf = float(detector.get("confidence_score", detector.get("confidence", 0.0)))
    next_action = str(detector.get("next_action", "verify")).upper()
    print(f"  • Hallucination Risk Level: {risk_level}")
    print(f"  • Hallucination Probability: {prob:.4f}")
    print(f"  • Confidence Score:          {conf:.4f}")
    print(f"  • Recommended Route Action:  {next_action}")

    # 3. Verifier Agent
    print("\n" + "-" * 80)
    print("3. [AGENT] VERIFIER AGENT (Multi-Source Retrieval: n8n + Tavily + Wikipedia + NLI)")
    print("-" * 80)
    verifier = result.get("verifier_result") or result.get("verifier", {})
    claim_evidence = verifier.get("claim_evidence") or verifier.get("claim_reports", [])
    sources_attempted = verifier.get("sources_attempted", ["n8n", "tavily", "wikipedia"])
    print(f"  • Search Integrations: {sources_attempted}")
    print(f"  • Evaluated Claims Count: {len(claim_evidence)}")
    print(f"  • Verification Status: {result.get('verification_status', 'N/A')}")
    
    for idx, claim in enumerate(claim_evidence, 1):
        c_text = claim.get("claim_text") or claim.get("claim") or claim.get("text", "")
        v_verdict = str(claim.get("verdict", "unverified")).upper()
        v_expl = claim.get("explanation", "N/A")
        print(f"\n    [Claim #{idx}]: \"{c_text}\"")
        print(f"    • Verdict: {v_verdict}")
        print(f"    • Explanation: {v_expl}")
        ev_list = claim.get("evidence", [])
        print(f"    • Grounding Evidence Snippets ({len(ev_list)} retrieved):")
        for j, ev in enumerate(ev_list[:3], 1):
            src = ev.get("source", "unknown")
            snippet = ev.get("snippet", "")
            lbl = ev.get("entailment_label", "")
            score = ev.get("entailment_score", "")
            print(f"      ({j}) [{src}] (NLI: {lbl} {score}): {snippet[:130]}...")

    # 4. Judge Agent
    print("\n" + "-" * 80)
    print("4. [AGENT] JUDGE AGENT (Arbitration & Consistency Decision)")
    print("-" * 80)
    judge = result.get("judge_result") or result.get("judge", {})
    decision = str(judge.get("decision", result.get("judge_decision", "N/A"))).upper()
    severity = str(judge.get("severity", result.get("severity", "LOW"))).upper()
    reason = judge.get("reason", "N/A")
    explanation = judge.get("explanation", "N/A")
    judge_conf = judge.get("confidence", 0.0)
    corr_req = judge.get("correction_request") or result.get("correction_request")
    print(f"  • Decision:    {decision}")
    print(f"  • Severity:    {severity}")
    print(f"  • Confidence:  {judge_conf}")
    print(f"  • Reason:      {reason}")
    print(f"  • Explanation: {explanation}")
    print(f"  • Correction Requested: {bool(corr_req)}")

    # 5. Corrector Agent
    print("\n" + "-" * 80)
    print("5. [AGENT] CORRECTOR AGENT (Grounded Fact-Repair & Hallucination Elimination)")
    print("-" * 80)
    corrector = result.get("correction_result") or result.get("corrector")
    if corrector:
        print("  • Status: TRIGGERED & COMPLETED")
        print(f"  • Validation Status: {corrector.get('validation_status', 'validated')}")
        print(f"  • Attempts Made: {result.get('correction_attempt_count', 1)}")
        print(f"  • Changed Claims: {corrector.get('changed_claims', [])}")
        print(f"  • Original Draft:\n    \"{corrector.get('original_text', '')}\"")
        print(f"  • Corrected Response:\n    \"{corrector.get('corrected_text', '')}\"")
        if corrector.get("reasoning"):
            print(f"  • Repair Reasoning: {corrector.get('reasoning')}")
    else:
        print("  • Status: SKIPPED (Judge emitted ACCEPT / No contradicted claims required repair)")

    # 6. Reverifier Node
    print("\n" + "-" * 80)
    print("6. [AGENT] REVERIFIER NODE (Post-Correction Factual Re-Validation)")
    print("-" * 80)
    reverifier = result.get("reverification_result")
    if reverifier:
        print("  • Status: TRIGGERED & EVALUATED")
        print(f"  • Passed: {reverifier.get('passed')}")
        print(f"  • Remaining Contradictions: {reverifier.get('remaining_contradictions', 0)}")
        print(f"  • Reverification Attempts: {result.get('reverification_attempt_count', 1)}")
    else:
        print("  • Status: SKIPPED (Correction was not triggered)")

    # 7. Memory Agent
    print("\n" + "-" * 80)
    print("7. [AGENT] MEMORY AGENT (Knowledge Graph & Vector Persistence)")
    print("-" * 80)
    memory = result.get("memory_result") or result.get("memory", {})
    mem_status = memory.get("status", "stored" if memory.get("count", 0) > 0 else "skipped")
    stored_cnt = memory.get("stored_count", memory.get("count", 0))
    fact_ids = memory.get("fact_ids", [f.get("fact_id") for f in memory.get("stored", []) if isinstance(f, dict)])
    print(f"  • Persistence Status: {mem_status}")
    print(f"  • Stored Facts Count: {stored_cnt}")
    if fact_ids:
        print(f"  • Persisted Fact IDs: {fact_ids}")
    print(f"  • Knowledge Graph Active: {memory.get('knowledge_graph', True)}")
    print(f"  • Vector Memory Active:   {memory.get('vector_memory', True)}")
    if memory.get("skipped_reason") or memory.get("reason"):
        print(f"  • Note: {memory.get('skipped_reason') or memory.get('reason')}")

    # Final Summary
    print("\n" + "=" * 80)
    print("  FINAL SUPERVISOR SUMMARY & OUTPUT")
    print("=" * 80)
    print(f"  • Terminal Status:     {result.get('terminal_status', 'completed')}")
    print(f"  • Verification Status: {result.get('verification_status', 'completed')}")
    print(f"  • Total Pipeline Time: {elapsed:.2f}s")
    print(f"\n  • Final Output Delivered to User:\n    \"{result.get('final_response', draft)}\"")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(main())

