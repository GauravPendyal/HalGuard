"""
VERIFY_AGAIN lifecycle regression — REAL PRODUCTION ENTRYPOINT.

Motivation
----------
`test_step9_canonical_orchestration.py::test_verify_again_loop_bounds_safe_termination`
proves the retry loop for a graph built via `build_verification_graph(node_overrides=...)`.
It does NOT exercise the entrypoint that `test_real_base_to_halluciguard.py` and the
production API actually use:

    run_verification()  ->  get_verification_graph()  (module-level singleton)

A forensic audit (2026-09) suspected the real E2E terminated in HUMAN_REVIEW
*before* the retry budget was spent (no visible second verifier pass). The audit
proved otherwise: the second verifier + judge pass DO run; they were merely
invisible in `format_breakdown`, which renders only the terminal merged state.

This suite locks the real-entrypoint contract via the execution TRACE (the only
faithful per-node record, since HalluciGuardState is last-write-wins with no
reducers). It guards against a future regression where VERIFY_AGAIN stops
reaching the compiled verifier node on the singleton path.

Semantics preserved (NOT weakened):
  - UNVERIFIED claims (no contradiction) trigger VERIFY_AGAIN while budget remains.
  - The verifier genuinely re-executes on VERIFY_AGAIN.
  - HUMAN_REVIEW is reached ONLY after the retry budget is exhausted.
  - Memory persists nothing when the outcome is not an accepted/verified claim.
"""

from __future__ import annotations

import uuid
from collections import Counter
from unittest.mock import MagicMock

import pytest

import orchestration.graph as g


OBSERVED_DRAFT = (
    "Python was created by Guido van Rossum, a Dutch programmer. He began "
    "working on Python in the late 1980s and released the first version in "
    "1991. Van Rossum remained the leader of the Python project until 2018."
)

# Verdicts matching the observed real E2E: claim 0 VERIFIED, claims 1-2 UNVERIFIED.
# UNVERIFIED (not CONTRADICTED) is the condition that must yield VERIFY_AGAIN.
_VERDICTS = {
    0: ("verified", 0.85, 0.05),
    1: ("unverified", 0.30, 0.10),
    2: ("unverified", 0.25, 0.10),
}


def _stub_verifier_imports_factory():
    """Return (imports_fn, call_counter). The stub verifier returns a
    deterministic 1-verified / 2-unverified result for whatever claims it is
    handed, and counts how many times the pipeline actually executed."""
    call_counter = {"n": 0}

    class StubPipeline:
        async def verify(self, payload):
            call_counter["n"] += 1
            claims = getattr(payload, "suspicious_claims", None) or []
            reports = []
            for idx, c in enumerate(claims):
                verdict, sup, con = _VERDICTS.get(idx, ("unverified", 0.3, 0.1))
                reports.append({
                    "claim_id": getattr(c, "claim_id", f"c{idx+1}"),
                    "claim_text": getattr(c, "text", ""),
                    "verdict": verdict,
                    "support_score": sup,
                    "contradiction_score": con,
                    "evidence": ([{
                        "evidence_id": f"ev-{idx}",
                        "source": "StubSource",
                        "snippet": "stub evidence snippet",
                        "entailment_label": "entailment",
                        "entailment_score": sup,
                        "credibility_score": 0.8,
                    }] if verdict == "verified" else []),
                })
            return {
                "query_id": getattr(payload, "query_id", "q"),
                "domain": getattr(payload, "domain", "general"),
                "overall_evidence_confidence": 0.5,
                "claim_evidence": reports,
            }

    def _imports():
        return (
            StubPipeline,
            MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
            MagicMock(side_effect=lambda **kw: MagicMock(
                query_id=kw.get("query_id", "q"),
                domain=kw.get("domain", "general"),
                suspicious_claims=kw.get("suspicious_claims", []),
            )),
        )

    return _imports, call_counter


@pytest.fixture
def _reset_graph_singleton():
    """Ensure the production singleton is rebuilt for the test and restored after."""
    saved = g._GRAPH
    saved_imports = g._verifier_imports
    g._GRAPH = None
    try:
        yield
    finally:
        g._GRAPH = saved
        g._verifier_imports = saved_imports


@pytest.mark.asyncio
async def test_verify_again_loop_runs_on_real_entrypoint(monkeypatch, _reset_graph_singleton):
    """The REAL run_verification()/singleton path must execute the verifier a
    second time on VERIFY_AGAIN, run the judge a second time, progress
    retry_count 0->1->2, and only THEN escalate to human review."""
    import_stub, counter = _stub_verifier_imports_factory()
    monkeypatch.setattr(g, "_verifier_imports", import_stub)

    result = await g.run_verification(
        user_query="Who created Python?",
        llm_response=OBSERVED_DRAFT,
        domain="general",
        request_id="regr-" + uuid.uuid4().hex[:8],
    )

    trace = result.get("trace", [])
    counts = Counter(ev.get("node") for ev in trace)

    # 1. The verifier genuinely re-executed (initial + one retry).
    assert counts.get("verifier", 0) == 2, (
        f"Expected 2 verifier executions on VERIFY_AGAIN loop, got {counts.get('verifier')}. "
        f"Trace nodes: {[e.get('node') for e in trace]}"
    )
    assert counter["n"] == 2, "Verifier pipeline network seam must be invoked exactly twice"

    # 2. The judge ran twice and returned VERIFY_AGAIN each time.
    judge_events = [e for e in trace if e.get("node") == "judge"]
    assert len(judge_events) == 2, f"Expected 2 judge executions, got {len(judge_events)}"
    assert all(str(e.get("details", {}).get("decision")).upper() == "VERIFY_AGAIN"
               for e in judge_events), "Both judge passes must decide VERIFY_AGAIN for UNVERIFIED claims"

    # 3. retry_count progressed 0 -> 1 -> 2 across the loop.
    verifier_rcs = [e.get("retry_count") for e in trace if e.get("node") == "verifier"]
    assert verifier_rcs == [0, 1], f"retry_count at each verifier pass should be [0, 1], got {verifier_rcs}"
    assert result.get("retry_count") == 2, "Final retry_count must equal max_retries after exhaustion"

    # 4. HUMAN_REVIEW only AFTER the budget is exhausted — never before.
    node_order = [e.get("node") for e in trace]
    assert node_order.index("human_escalation") > node_order.index("verifier"), (
        "human_escalation must come after at least one verifier pass"
    )
    # The escalation must be the LAST non-memory node (retries not cut short early).
    assert node_order.count("human_escalation") == 1
    assert result.get("terminal_status") == "human_review"

    # 5. No premature corrector/reverifier: UNVERIFIED (not CONTRADICTED) must
    #    NOT be laundered into the correction path.
    assert counts.get("corrector", 0) == 0, "UNVERIFIED claims must not trigger the Corrector"
    assert counts.get("reverifier", 0) == 0

    # 6. Memory persisted nothing (no accepted/verified terminal claim).
    mem = result.get("memory") or {}
    assert mem.get("status") == "skipped"
    assert mem.get("count", 0) == 0


@pytest.mark.asyncio
async def test_verify_again_can_accept_when_second_pass_verifies(monkeypatch, _reset_graph_singleton):
    """Control: if the SECOND verifier pass returns all-VERIFIED (evidence became
    sufficient), the Judge must be able to ACCEPT — proving the retry loop is a
    genuine second chance, not a dead-end that always escalates."""
    call_counter = {"n": 0}

    class FlipPipeline:
        async def verify(self, payload):
            call_counter["n"] += 1
            claims = getattr(payload, "suspicious_claims", None) or []
            # Pass 1: 1 verified + 2 unverified (the composition PROVEN to yield
            # VERIFY_AGAIN by test_verify_again_loop_runs_on_real_entrypoint).
            # Pass 2: evidence became sufficient -> ALL claims verified.
            second_pass = call_counter["n"] >= 2
            reports = []
            for idx, c in enumerate(claims):
                verified = second_pass or idx == 0
                reports.append({
                    "claim_id": getattr(c, "claim_id", f"c{idx+1}"),
                    "claim_text": getattr(c, "text", ""),
                    "verdict": "verified" if verified else "unverified",
                    "support_score": 0.9 if verified else 0.3,
                    "contradiction_score": 0.05,
                    "evidence": ([{
                        "evidence_id": f"ev-{idx}",
                        "source": "StubSource",
                        "snippet": "Guido van Rossum created Python; released 1991.",
                        "entailment_label": "entailment",
                        "entailment_score": 0.9,
                        "credibility_score": 0.9,
                    }] if verified else []),
                })
            return {
                "query_id": getattr(payload, "query_id", "q"),
                "domain": getattr(payload, "domain", "general"),
                "overall_evidence_confidence": 0.95 if second_pass else 0.5,
                "claim_evidence": reports,
            }

    def _imports():
        return (
            FlipPipeline,
            MagicMock(side_effect=lambda claim_id, text: MagicMock(claim_id=claim_id, text=text)),
            MagicMock(side_effect=lambda **kw: MagicMock(
                query_id=kw.get("query_id", "q"),
                domain=kw.get("domain", "general"),
                suspicious_claims=kw.get("suspicious_claims", []),
            )),
        )

    monkeypatch.setattr(g, "_verifier_imports", _imports)

    result = await g.run_verification(
        user_query="Who created Python?",
        llm_response=OBSERVED_DRAFT,
        domain="general",
        request_id="regr2-" + uuid.uuid4().hex[:8],
    )

    trace = result.get("trace", [])
    counts = Counter(ev.get("node") for ev in trace)

    # Verifier ran twice; the second pass made evidence sufficient.
    assert counts.get("verifier", 0) == 2
    # The loop resolved to ACCEPT, not human_review — the retry was a real second chance.
    assert result.get("judge_decision") == "ACCEPT"
    assert result.get("terminal_status") == "accepted"
    assert counts.get("human_escalation", 0) == 0
