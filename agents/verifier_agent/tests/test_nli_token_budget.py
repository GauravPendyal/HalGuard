"""Regression tests for token-budget boundary and chunking in canonical robust_entailment.NLIEngine.

Guards against:
- Sequence length overflow warnings (e.g. 516 > 512).
- Truncation of useful facts located at the tail of long evidence passages.
- Batch misalignment during chunked inference.
- Model input sequences exceeding the model's actual maximum sequence length (512).
"""
from __future__ import annotations

import logging
import os
import sys
from typing import Any, List

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
VERIFIER_DIR = os.path.join(PROJECT_ROOT, "agents", "verifier_agent")
for _p in (PROJECT_ROOT, VERIFIER_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from nli import NLIEngine
    from schemas.models import EntailmentLabel
    _HAS_DEPS = True
    _DEPS_ERR = ""
except Exception as _e:
    _HAS_DEPS = False
    _DEPS_ERR = repr(_e)

needs_deps = pytest.mark.skipif(not _HAS_DEPS, reason=f"deps unavailable: {_DEPS_ERR}")


@needs_deps
def test_short_evidence_executes_normally():
    """Requirement 13.A: Short evidence executes normally and accurately."""
    engine = NLIEngine()
    claim = "The Transformer architecture was introduced in 2017."
    evidence = "Attention Is All You Need introduced the Transformer neural network architecture in 2017."

    result = engine.classify(claim, evidence)
    assert result["label"] == EntailmentLabel.ENTAILMENT
    assert result["entailment_score"] >= 0.50
    assert result.get("degraded", False) is False


@needs_deps
def test_long_evidence_inputs_never_exceed_max_length():
    """Requirement 13.B & Requirement 6: Model input must NEVER exceed model max token length."""
    engine = NLIEngine()
    # Force model load so tokenizer is present
    engine._load_model()
    assert engine.pipeline is not None
    tok = engine.pipeline.tokenizer
    max_len = engine._get_max_length()

    claim = "Albert Einstein invented the Transformer in 1920."
    filler = "This is background filler context describing general scientific concepts and history. " * 45
    evidence = filler

    # Verify that raw combined length would exceed max_len
    raw_pair = tok(evidence, text_pair=claim, add_special_tokens=True, verbose=False)["input_ids"]
    assert len(raw_pair) > max_len, f"Expected raw pair len > {max_len}, got {len(raw_pair)}"

    class PipelineSpy:
        def __init__(self, inner):
            self.inner = inner
            self.recorded_inputs = []

        def __call__(self, *args, **kwargs):
            if args:
                self.recorded_inputs.append(args[0])
            return self.inner(*args, **kwargs)

        def __getattr__(self, name):
            return getattr(self.inner, name)

    original_pipeline = engine.pipeline
    spy = PipelineSpy(original_pipeline)
    engine.pipeline = spy
    try:
        res = engine.classify(claim, evidence)
        assert res is not None
        assert spy.recorded_inputs, "Pipeline was not called"

        for call_input in spy.recorded_inputs:
            items = [call_input] if isinstance(call_input, dict) else call_input
            for item in items:
                text = item.get("text", "")
                text_pair = item.get("text_pair", "")
                pair_tokens = tok(text, text_pair=text_pair, add_special_tokens=True)["input_ids"]
                assert len(pair_tokens) <= max_len, (
                    f"Token length {len(pair_tokens)} exceeds maximum {max_len}"
                )
    finally:
        engine.pipeline = original_pipeline


@needs_deps
def test_long_evidence_retains_useful_fact_at_end():
    """Requirement 13.C: Useful fact near the end is not blindly discarded."""
    engine = NLIEngine()
    claim = "Albert Einstein invented the Transformer in 1920."
    # Long filler background (exceeding 512 tokens)
    filler = "This is background filler context describing physics and general relativity in the 20th century. " * 45
    # Decisive refuting fact placed at the very end
    fact = "In 2017, Vaswani et al. introduced the Transformer neural network architecture, not Albert Einstein."
    evidence = filler + fact

    result = engine.classify(claim, evidence)
    assert result["label"] == EntailmentLabel.CONTRADICTION
    assert result["contradiction_score"] >= 0.50
    assert result.get("degraded", False) is False


@needs_deps
def test_batch_classify_alignment_with_mixed_lengths():
    """Requirement 13.D: Multiple long and short evidence passages remain strictly aligned 1:1."""
    engine = NLIEngine()
    claim = "Albert Einstein invented the Transformer in 1920."
    filler = "Background context on physics history. " * 50

    evidences = [
        "Vaswani et al. invented the Transformer in 2017.",  # short contradiction
        filler + "Vaswani et al. introduced the Transformer in 2017, not Einstein.",  # long contradiction
        "Albert Einstein published papers on the photoelectric effect in 1905.",  # short neutral/other
        filler + "Einstein developed the general theory of relativity.",  # long neutral/other
    ]

    results = engine.batch_classify(claim, evidences)
    assert len(results) == len(evidences)

    # 1:1 alignment check: batch_classify results must match per-evidence classify results
    individual_results = [engine.classify(claim, ev) for ev in evidences]
    assert len(results) == len(individual_results)

    for i in range(len(evidences)):
        assert results[i]["label"] == individual_results[i]["label"], f"Mismatch at index {i}"
        assert abs(results[i]["contradiction_score"] - individual_results[i]["contradiction_score"]) < 1e-4
        assert abs(results[i]["entailment_score"] - individual_results[i]["entailment_score"]) < 1e-4

    # The two contradiction items must both be contradiction
    assert results[0]["label"] == EntailmentLabel.CONTRADICTION
    assert results[1]["label"] == EntailmentLabel.CONTRADICTION

    diag = engine.diagnostics()
    assert diag["status"] == "executed"
    assert diag["inference_executed"] is True
    assert diag["degraded"] is False
    assert diag["batch_size"] == 4


@needs_deps
def test_classify_long_evidence_safe():
    """Requirement 13.E: classify() on long evidence remains safe and returns valid decision."""
    engine = NLIEngine()
    claim = "Python was created by Guido van Rossum."
    filler = "Programming languages have evolved through multiple paradigms and design philosophies over decades. " * 40
    fact = "Python was created by Guido van Rossum and first released in 1991."
    evidence = filler + fact

    result = engine.classify(claim, evidence)
    assert result["label"] == EntailmentLabel.ENTAILMENT
    assert result["entailment_score"] >= 0.50


@needs_deps
def test_diagnostics_on_chunked_inference():
    """Requirement 13.F: Successful bounded inference reports status='executed', inference_executed=True, degraded=False."""
    engine = NLIEngine()
    claim = "Vaccines stimulate the immune system to build protection."
    long_ev = "Immunology research shows that vaccination stimulates immune response to generate antibodies. " * 40

    res = engine.batch_classify(claim, [long_ev])
    assert len(res) == 1
    diag = engine.diagnostics()

    assert diag["component"] == "deberta_nli"
    assert diag["loaded"] is True
    assert diag["status"] == "executed"
    assert diag["inference_executed"] is True
    assert diag["degraded"] is False
    assert diag["batch_size"] == 1
    assert diag["latency_ms"] >= 0


@needs_deps
def test_focused_production_warning_516_over_512_eliminated(caplog):
    """Requirement 14: Verifies the exact live 516 > 512 warning is eliminated and never emitted."""
    engine = NLIEngine()
    engine._load_model()
    tok = engine.pipeline.tokenizer

    claim = "Albert Einstein invented the Transformer in 1920."
    claim_len = len(tok.encode(claim, add_special_tokens=False))

    # Construct evidence such that raw unchunked pair length would be around 516 tokens
    # (516 = ev_len + claim_len + 3)
    target_ev_len = 516 - claim_len - 3
    filler_unit = " scientific theory observation experiment"
    # Build token sequence of exact length
    unit_tokens = tok.encode(filler_unit, add_special_tokens=False)
    repeat_count = (target_ev_len // len(unit_tokens)) + 2
    raw_filler = (filler_unit * repeat_count)
    ev_tokens = tok.encode(raw_filler, add_special_tokens=False)[:target_ev_len]
    exact_516_evidence = tok.decode(ev_tokens, skip_special_tokens=True)

    # Prove that raw pair would have been >= 514 tokens
    raw_pair = tok(exact_516_evidence, text_pair=claim, add_special_tokens=True)["input_ids"]
    assert len(raw_pair) >= 514, f"Targeted pair length {len(raw_pair)} should be around 516"

    # Capture logs from transformers tokenization
    with caplog.at_level(logging.WARNING, logger="transformers.tokenization_utils_base"):
        result = engine.classify(claim, exact_516_evidence)

    # Assert no length overflow warning was logged
    for record in caplog.records:
        assert "516 > 512" not in record.message
        assert "longer than the specified maximum sequence length" not in record.message

    assert result["label"] in (EntailmentLabel.NEUTRAL, EntailmentLabel.CONTRADICTION, EntailmentLabel.ENTAILMENT)


@needs_deps
def test_conservative_aggregation_logic_unit():
    """Requirement 9: Unit verification of conservative aggregation behaviors."""
    engine = NLIEngine()

    # 1. Decisive contradiction in one chunk dominates neutral chunks
    chunk_scores_contra = [
        {"label": EntailmentLabel.NEUTRAL, "entailment_score": 0.05, "contradiction_score": 0.05, "neutral_score": 0.90},
        {"label": EntailmentLabel.CONTRADICTION, "entailment_score": 0.02, "contradiction_score": 0.92, "neutral_score": 0.06},
    ]
    agg_c = engine._aggregate_chunk_results(chunk_scores_contra)
    assert agg_c["label"] == EntailmentLabel.CONTRADICTION
    assert agg_c["contradiction_score"] == 0.92

    # 2. Decisive entailment in one chunk dominates neutral chunks
    chunk_scores_entail = [
        {"label": EntailmentLabel.NEUTRAL, "entailment_score": 0.05, "contradiction_score": 0.05, "neutral_score": 0.90},
        {"label": EntailmentLabel.ENTAILMENT, "entailment_score": 0.88, "contradiction_score": 0.04, "neutral_score": 0.08},
    ]
    agg_e = engine._aggregate_chunk_results(chunk_scores_entail)
    assert agg_e["label"] == EntailmentLabel.ENTAILMENT
    assert agg_e["entailment_score"] == 0.88

    # 3. Conflicting chunks (both entailment and contradiction high) resolve to NEUTRAL
    chunk_scores_conflict = [
        {"label": EntailmentLabel.ENTAILMENT, "entailment_score": 0.75, "contradiction_score": 0.15, "neutral_score": 0.10},
        {"label": EntailmentLabel.CONTRADICTION, "entailment_score": 0.15, "contradiction_score": 0.78, "neutral_score": 0.07},
    ]
    agg_conf = engine._aggregate_chunk_results(chunk_scores_conflict)
    assert agg_conf["label"] == EntailmentLabel.NEUTRAL

    # 4. All neutral chunks resolve to NEUTRAL
    chunk_scores_neutral = [
        {"label": EntailmentLabel.NEUTRAL, "entailment_score": 0.05, "contradiction_score": 0.05, "neutral_score": 0.90},
        {"label": EntailmentLabel.NEUTRAL, "entailment_score": 0.04, "contradiction_score": 0.06, "neutral_score": 0.90},
    ]
    agg_n = engine._aggregate_chunk_results(chunk_scores_neutral)
    assert agg_n["label"] == EntailmentLabel.NEUTRAL


@needs_deps
def test_excessive_claim_length_fails_safely_to_neutral():
    """Requirement 8 & 10: Claim that leaves no evidence budget fails safely to neutral without mutating claim."""
    engine = NLIEngine()
    # Construct an extreme claim of 510 tokens
    filler = "This is an extremely long claim assertion with excessive length. " * 60
    evidence = "Short evidence."

    result = engine.classify(claim=filler, evidence=evidence)
    assert result["label"] == EntailmentLabel.NEUTRAL
    assert result["degraded"] is True
    assert result["error"] == "nli_model_unavailable_or_failed"
