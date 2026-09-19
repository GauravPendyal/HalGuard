"""
HalluciGuard Verifier — Hardening Regression Suite (§39).

Every bug discovered and every real-execution guarantee added during the
verifier-v2 stabilization pass is pinned here so it can never silently regress.
Each test names the spec section and the concrete failure mode it defends
against.

Design constraints (§34 "do not delete existing tests"; hermetic):
  * NO torch / transformers / network / GPU are required. Model execution is
    simulated with tiny fakes, and the fail-soft paths are exercised by forcing
    the components into their "unavailable" state.
  * The certification helpers (api.certification) are stdlib-only, so those
    tests run in any environment — including a sandbox without pydantic.
  * The pydantic/model-dependent tests skip cleanly where those deps are absent
    and run for real on the Windows validation machine.

Bugs / guarantees covered:
  §6   Detector cannot let a failed load masquerade as real ML inference
       (detector_model_loaded / detector_inference_executed / detector_degraded).
  §13  BGE reranker fallback is flagged, never presented as a real BGE score.
  §15  DeBERTa NLI exposes engine-level execution proof on every call.
  §26  ModelExecutionTrace + RetrievalTrace carry the proof blocks; and the
       RelationCheckTrace flat-schema bug (Pydantic silently dropped the data).
  §28  Certification mode fails closed on detector/BGE/NLI fallback and on
       mock/empty/malformed evidence — and is a strict no-op when disabled.
  §30  The result cache is disabled whenever certification mode is on.
"""
from __future__ import annotations

import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
VERIFIER_DIR = os.path.join(PROJECT_ROOT, "agents", "verifier_agent")
for _p in (PROJECT_ROOT, VERIFIER_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# --- Dependency-light certification helpers (always importable) -------------
from api.certification import (  # noqa: E402
    CertificationError,
    certification_enabled_from_env,
    enforce_detector,
    enforce_nli,
    enforce_reranker,
    enforce_retrieval_evidence,
)

# --- Pydantic / model-dependent imports (guarded) ---------------------------
try:
    from schemas.models import Passage
    from schemas.retrieval_trace import (
        ModelExecutionTrace,
        RelationCheckTrace,
        RetrievalTrace,
    )
    from rerankers.cross_encoder import CrossEncoderReranker
    from nli.entailment import NLIEngine

    _HAS_MODELS = True
    _MODELS_ERR = ""
except Exception as _e:  # pragma: no cover - environment dependent
    _HAS_MODELS = False
    _MODELS_ERR = repr(_e)

try:
    from agents.detector_agent.detector import DetectorAgent
    from agents.detector_agent.models import DetectionResult, NextAction, RiskLevel

    _HAS_DETECTOR = True
    _DETECTOR_ERR = ""
except Exception as _e:  # pragma: no cover - environment dependent
    _HAS_DETECTOR = False
    _DETECTOR_ERR = repr(_e)

try:
    from api.pipeline import VerificationPipeline
    from config.settings import get_settings

    _HAS_PIPELINE = True
    _PIPELINE_ERR = ""
except Exception as _e:  # pragma: no cover - environment dependent
    _HAS_PIPELINE = False
    _PIPELINE_ERR = repr(_e)

needs_models = pytest.mark.skipif(not _HAS_MODELS, reason=f"model deps unavailable: {_MODELS_ERR}")
needs_detector = pytest.mark.skipif(not _HAS_DETECTOR, reason=f"detector deps unavailable: {_DETECTOR_ERR}")
needs_pipeline = pytest.mark.skipif(not _HAS_PIPELINE, reason=f"pipeline deps unavailable: {_PIPELINE_ERR}")


# ===========================================================================
# Test doubles (no torch / no network)
# ===========================================================================
class _FakeCrossEncoder:
    """Stand-in for a loaded BGE CrossEncoder. ``predict`` returns fixed scores."""

    def __init__(self, scores, device: str = "cpu", raise_on_predict: bool = False):
        self._scores = list(scores)
        self._target_device = device
        self._raise = raise_on_predict

    def predict(self, pairs, batch_size=16):  # noqa: D401 - mimics sentence-transformers
        if self._raise:
            raise RuntimeError("simulated BGE inference failure")
        return list(self._scores)


class _FakeNLIPipeline:
    """Stand-in for a loaded HF text-classification pipeline (top_k=None)."""

    def __init__(self, per_item_rows, device: str = "cpu", raise_on_call: bool = False):
        self._rows = per_item_rows
        self.device = device
        self._raise = raise_on_call

    def __call__(self, batch):
        if self._raise:
            raise RuntimeError("simulated NLI inference failure")
        # One list-of-label-dicts per input pair.
        return [list(self._rows) for _ in batch]


class _FakeInferenceResult:
    def __init__(self, hp: float, cs: float):
        self.hallucination_probability = hp
        self.confidence_score = cs


class _FakeHaluEvalInference:
    """Stand-in for HaluEvalInference with a controllable ``_loaded`` flag."""

    def __init__(self, loaded: bool, model_path: str = "artifacts/halueval-detector-final"):
        self._loaded = loaded
        self.model_path = model_path

    def is_loaded(self) -> bool:
        return self._loaded

    def load(self) -> None:  # no-op; load is bypassed in tests
        pass

    def predict(self, user_query: str, llm_response: str) -> _FakeInferenceResult:
        # A "hallucinated" verdict so risk routing is also exercised.
        return _FakeInferenceResult(hp=0.72, cs=0.28)


class _StubPassage:
    """Minimal duck-typed passage for the (pydantic-free) evidence checks."""

    def __init__(self, url="", source="", title="", snippet=""):
        self.url = url
        self.source = source
        self.title = title
        self.snippet = snippet


def _make_passage(snippet: str, relevance: float) -> "Passage":
    return Passage(
        title="t",
        source="s",
        url="https://real.example-source.org/a",
        publication_date="2024-01-01",
        snippet=snippet,
        relevance_score=relevance,
    )


# ===========================================================================
# §28 Certification helpers — fail-closed when enabled, no-op when disabled
# (stdlib-only: these run in every environment)
# ===========================================================================
class TestCertificationEnvFlag:
    def test_enabled_true_tokens(self, monkeypatch):
        for tok in ("1", "true", "TRUE", "Yes", "on"):
            monkeypatch.setenv("CERTIFICATION_MODE", tok)
            assert certification_enabled_from_env() is True

    def test_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("CERTIFICATION_MODE", raising=False)
        assert certification_enabled_from_env() is False
        monkeypatch.setenv("CERTIFICATION_MODE", "false")
        assert certification_enabled_from_env() is False


class TestEnforceReranker:
    def test_degraded_fails_closed(self):
        with pytest.raises(CertificationError) as ei:
            enforce_reranker({"status": "degraded", "degraded": True}, enabled=True)
        assert ei.value.stage == "bge_reranker"

    def test_unavailable_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_reranker({"status": "unavailable", "degraded": True}, enabled=True)

    def test_executed_but_degraded_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_reranker({"status": "executed", "degraded": True}, enabled=True)

    def test_executed_clean_passes(self):
        enforce_reranker({"status": "executed", "degraded": False}, enabled=True)

    def test_not_run_is_allowed(self):
        # No passages to rerank is owned by the evidence check, not this one.
        enforce_reranker({"status": "not_run", "degraded": False}, enabled=True)

    def test_noop_when_disabled(self):
        # Even a degraded reranker must not raise when certification is OFF.
        enforce_reranker({"status": "degraded", "degraded": True}, enabled=False)


class TestEnforceNLI:
    def test_degraded_with_evidence_fails_closed(self):
        with pytest.raises(CertificationError) as ei:
            enforce_nli({"status": "degraded", "inference_executed": False}, enabled=True, evidence_present=True)
        assert ei.value.stage == "deberta_nli"

    def test_unavailable_with_evidence_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_nli({"status": "unavailable", "inference_executed": False}, enabled=True, evidence_present=True)

    def test_not_executed_with_evidence_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_nli({"status": "executed", "inference_executed": False}, enabled=True, evidence_present=True)

    def test_executed_with_evidence_passes(self):
        enforce_nli({"status": "executed", "inference_executed": True}, enabled=True, evidence_present=True)

    def test_no_evidence_is_noop(self):
        # A legitimate UNVERIFIED (no evidence) must not be failed by NLI cert.
        enforce_nli({"status": "unavailable", "inference_executed": False}, enabled=True, evidence_present=False)

    def test_noop_when_disabled(self):
        enforce_nli({"status": "degraded", "inference_executed": False}, enabled=False, evidence_present=True)


class TestEnforceDetector:
    def test_degraded_fails_closed(self):
        with pytest.raises(CertificationError) as ei:
            enforce_detector({"detector_degraded": True, "detector_inference_executed": False}, enabled=True)
        assert ei.value.stage == "detector"

    def test_not_executed_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_detector({"detector_degraded": False, "detector_inference_executed": False}, enabled=True)

    def test_real_inference_passes(self):
        enforce_detector({"detector_degraded": False, "detector_inference_executed": True}, enabled=True)

    def test_noop_when_disabled(self):
        enforce_detector({"detector_degraded": True, "detector_inference_executed": False}, enabled=False)


class TestEnforceRetrievalEvidence:
    def test_mock_mode_fails_closed(self):
        with pytest.raises(CertificationError) as ei:
            enforce_retrieval_evidence([_StubPassage(snippet="x")], enabled=True, mock_mode=True)
        assert ei.value.stage == "retrieval"

    def test_empty_evidence_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_retrieval_evidence([], enabled=True, mock_mode=False)

    def test_all_mock_evidence_fails_closed(self):
        passages = [
            _StubPassage(url="https://example.com/1", snippet="a"),
            _StubPassage(source="mock", snippet="b"),
        ]
        with pytest.raises(CertificationError):
            enforce_retrieval_evidence(passages, enabled=True, mock_mode=False)

    def test_malformed_empty_content_fails_closed(self):
        with pytest.raises(CertificationError):
            enforce_retrieval_evidence([_StubPassage(url="https://real.org", snippet="", title="")], enabled=True, mock_mode=False)

    def test_real_evidence_passes(self):
        passages = [_StubPassage(url="https://who.int/x", source="WHO", title="Aspirin", snippet="Aspirin relieves pain.")]
        enforce_retrieval_evidence(passages, enabled=True, mock_mode=False)

    def test_noop_when_disabled(self):
        enforce_retrieval_evidence([], enabled=False, mock_mode=True)


# ===========================================================================
# §6 Detector diagnostics — a failed load can't masquerade as real inference
# ===========================================================================
@needs_detector
class TestDetectorDiagnostics:
    def setup_method(self):
        self._saved_inf = DetectorAgent._SHARED_INFERENCE
        self._saved_loaded = DetectorAgent._SHARED_MODEL_LOADED

    def teardown_method(self):
        DetectorAgent._SHARED_INFERENCE = self._saved_inf
        DetectorAgent._SHARED_MODEL_LOADED = self._saved_loaded

    def _agent_with(self, inference) -> "DetectorAgent":
        DetectorAgent._SHARED_INFERENCE = inference
        DetectorAgent._SHARED_MODEL_LOADED = True  # bypass real load attempt
        agent = DetectorAgent()
        agent._inference = inference
        return agent

    def test_baseline_fallback_is_flagged_degraded(self):
        """Model not loaded → baseline heuristic → must be degraded / not-executed."""
        agent = self._agent_with(_FakeHaluEvalInference(loaded=False))
        res = agent.detect(user_query="Who is the father of Allu Arjun?", llm_response="His father is Chiranjeevi.")
        assert res.detector_model_loaded is False
        assert res.detector_inference_executed is False
        assert res.detector_degraded is True
        assert res.detector_model_source == "baseline-heuristic"
        assert res.model_source == "baseline-heuristic"

    def test_real_inference_is_flagged_executed(self):
        """Model loaded → real forward pass → executed / not-degraded with provenance."""
        agent = self._agent_with(_FakeHaluEvalInference(loaded=True, model_path="artifacts/halueval-detector-final"))
        res = agent.detect(user_query="Is aspirin a painkiller?", llm_response="Aspirin relieves mild to moderate pain.")
        assert res.detector_model_loaded is True
        assert res.detector_inference_executed is True
        assert res.detector_degraded is False
        assert res.detector_model_source == "artifacts/halueval-detector-final"
        # HP 0.72 >= 0.50 → HIGH → VERIFY (routing still works with diagnostics on).
        assert res.risk_level == RiskLevel.HIGH
        assert res.next_action == NextAction.VERIFY

    def test_default_result_edge_case_is_degraded(self):
        """Empty input short-circuits to the safe default, which must be degraded."""
        agent = self._agent_with(_FakeHaluEvalInference(loaded=False))
        res = agent.detect(user_query="", llm_response="anything")
        assert res.detector_inference_executed is False
        assert res.detector_degraded is True
        assert res.detector_model_source.startswith("default:")

    def test_diagnostic_fields_default_safe_on_bare_construction(self):
        """Additive fields must default safe so old callers/serialized data survive."""
        res = DetectionResult(
            confidence_score=0.9,
            hallucination_probability=0.1,
            risk_level=RiskLevel.LOW,
            next_action=NextAction.ACCEPT,
        )
        assert res.detector_model_loaded is False
        assert res.detector_inference_executed is False
        assert res.detector_degraded is False
        assert res.detector_model_source == ""


# ===========================================================================
# §13 BGE reranker — fallback is flagged, never presented as a real BGE score
# ===========================================================================
@needs_models
class TestRerankerDiagnostics:
    def test_unavailable_fallback_is_not_masqueraded(self):
        rr = CrossEncoderReranker()
        rr._is_available = False  # force fail-soft without touching torch
        passages = [_make_passage("some evidence text", relevance=0.42)]
        out = rr.rerank("a claim", passages, k=1)
        diag = rr.diagnostics()
        # The hybrid score is preserved as-is ...
        assert out[0].relevance_score == pytest.approx(0.42)
        # ... but it is explicitly marked as NOT a real BGE execution.
        assert diag["status"] == "unavailable"
        assert diag["inference_executed"] is False
        assert diag["degraded"] is True
        assert diag["component"] == "bge_reranker"

    def test_executed_records_real_inference(self):
        rr = CrossEncoderReranker()
        rr.model = _FakeCrossEncoder(scores=[0.9, 0.1], device="cpu")
        rr._is_available = True  # model present → _load_model() is a no-op
        passages = [_make_passage("relevant", 0.0), _make_passage("irrelevant", 0.0)]
        out = rr.rerank("a claim", passages, k=1)
        diag = rr.diagnostics()
        assert diag["status"] == "executed"
        assert diag["inference_executed"] is True
        assert diag["degraded"] is False
        assert diag["scored_count"] == 2
        assert diag["device"] == "cpu"
        # Top passage carries the REAL BGE score, not the hybrid prior.
        assert out[0].relevance_score == pytest.approx(0.9)

    def test_inference_exception_is_degraded_not_executed(self):
        rr = CrossEncoderReranker()
        rr.model = _FakeCrossEncoder(scores=[], raise_on_predict=True)
        rr._is_available = True
        passages = [_make_passage("text", 0.31)]
        out = rr.rerank("claim", passages, k=1)
        diag = rr.diagnostics()
        assert diag["status"] == "degraded"
        assert diag["inference_executed"] is False
        assert diag["degraded"] is True
        # Fallback preserves the hybrid order/score (still not a BGE score).
        assert out[0].relevance_score == pytest.approx(0.31)

    def test_diagnostics_reset_between_runs(self):
        rr = CrossEncoderReranker()
        rr.model = _FakeCrossEncoder(scores=[0.5])
        rr._is_available = True
        rr.rerank("c", [_make_passage("x", 0.0)], k=1)
        assert rr.diagnostics()["status"] == "executed"
        # A subsequent no-op call resets diagnostics (no stale "executed").
        assert rr.rerank("c", [], k=0) == []
        assert rr.diagnostics()["status"] == "not_run"


# ===========================================================================
# §15 DeBERTa NLI — engine-level execution proof on every batch call
# ===========================================================================
@needs_models
class TestNLIDiagnostics:
    def test_unavailable_is_flagged(self):
        eng = NLIEngine()
        eng._is_available = False
        results = eng.batch_classify("claim", ["ev one", "ev two"])
        diag = eng.diagnostics()
        assert diag["status"] == "unavailable"
        assert diag["inference_executed"] is False
        assert diag["degraded"] is True
        # Still returns per-item degraded neutrals (fail-soft), one per evidence.
        assert len(results) == 2
        assert all(r["degraded"] is True for r in results)

    def test_executed_records_real_inference(self):
        eng = NLIEngine()
        eng.pipeline = _FakeNLIPipeline(
            per_item_rows=[
                {"label": "entailment", "score": 0.8},
                {"label": "contradiction", "score": 0.1},
                {"label": "neutral", "score": 0.1},
            ],
            device="cpu",
        )
        eng._is_available = True  # pipeline present → _load_model() no-op
        results = eng.batch_classify("claim", ["ev one", "ev two"])
        diag = eng.diagnostics()
        assert diag["status"] == "executed"
        assert diag["inference_executed"] is True
        assert diag["degraded"] is False
        assert diag["batch_size"] == 2
        assert diag["device"] == "cpu"
        assert all(r["degraded"] is False for r in results)

    def test_inference_exception_is_degraded(self):
        eng = NLIEngine()
        eng.pipeline = _FakeNLIPipeline(per_item_rows=[], raise_on_call=True)
        eng._is_available = True
        results = eng.batch_classify("claim", ["ev"])
        diag = eng.diagnostics()
        assert diag["status"] == "degraded"
        assert diag["inference_executed"] is False
        assert diag["degraded"] is True
        assert len(results) == 1

    def test_empty_evidence_returns_not_run(self):
        eng = NLIEngine()
        eng._is_available = True
        assert eng.batch_classify("claim", []) == []
        assert eng.diagnostics()["status"] == "not_run"


# ===========================================================================
# §26 Trace contract — model-execution proof + RelationCheckTrace flat-schema fix
# ===========================================================================
@needs_models
class TestTraceContract:
    def test_relation_check_trace_flat_fields_round_trip(self):
        """REGRESSION: the old schema (claim_triple/evidence_triples/comparison_result)
        did not match the flat kwargs the pipeline sets, so Pydantic (extra='ignore')
        silently DROPPED them and this trace was always empty. Pin the flat schema."""
        rc = RelationCheckTrace(
            claim_subject="Allu Arjun",
            claim_relation="father",
            claim_object="Allu Aravind",
            evidence_subject="Allu Arjun",
            evidence_relation="father",
            evidence_object="Chiranjeevi",
            check_result="OBJECT_MISMATCH",
            combination_rule_applied="kinship_object_mismatch",
            details="claim object != evidence object",
        )
        assert rc.claim_subject == "Allu Arjun"
        assert rc.evidence_object == "Chiranjeevi"
        # Would still be the default "NO_TRIPLE_EXTRACTED" if the field were dropped.
        assert rc.check_result == "OBJECT_MISMATCH"
        dumped = rc.model_dump()
        assert dumped["check_result"] == "OBJECT_MISMATCH"
        assert dumped["combination_rule_applied"] == "kinship_object_mismatch"

    def test_relation_check_trace_default_when_unset(self):
        assert RelationCheckTrace().check_result == "NO_TRIPLE_EXTRACTED"

    def test_model_execution_trace_from_reranker_diag(self):
        rr = CrossEncoderReranker()
        rr._is_available = False
        rr.rerank("c", [_make_passage("x", 0.2)], k=1)
        met = ModelExecutionTrace(**rr.diagnostics())
        assert met.component == "bge_reranker"
        assert met.status == "unavailable"
        assert met.inference_executed is False
        assert met.degraded is True

    def test_model_execution_trace_from_nli_diag(self):
        eng = NLIEngine()
        eng._is_available = False
        eng.batch_classify("c", ["e"])
        met = ModelExecutionTrace(**eng.diagnostics())
        assert met.component == "deberta_nli"
        assert met.status == "unavailable"
        assert met.inference_executed is False

    def test_retrieval_trace_carries_execution_blocks(self):
        rt = RetrievalTrace()
        # Fields exist and default to None (additive, backward compatible).
        assert rt.reranker_execution is None
        assert rt.nli_execution is None
        met = ModelExecutionTrace(component="bge_reranker", status="executed", inference_executed=True)
        rt2 = RetrievalTrace(reranker_execution=met)
        assert rt2.reranker_execution.status == "executed"
        assert rt2.reranker_execution.inference_executed is True


# ===========================================================================
# §30 Cache is disabled whenever certification mode is on
# ===========================================================================
@needs_pipeline
class TestCertificationDisablesCache:
    def test_cache_disabled_under_certification(self, monkeypatch):
        monkeypatch.setenv("CERTIFICATION_MODE", "true")
        get_settings.cache_clear()
        try:
            pipeline = VerificationPipeline()
            assert pipeline.certification_mode is True
            assert pipeline.cache_enabled is False
        finally:
            get_settings.cache_clear()

    def test_cache_enabled_in_normal_mode(self, monkeypatch):
        monkeypatch.delenv("CERTIFICATION_MODE", raising=False)
        monkeypatch.delenv("CACHE_ENABLED", raising=False)
        monkeypatch.delenv("VERIFIER_CACHE_ENABLED", raising=False)
        get_settings.cache_clear()
        try:
            pipeline = VerificationPipeline()
            assert pipeline.certification_mode is False
            # Cache follows the normal verifier_cache_enabled default (True).
            assert pipeline.cache_enabled is True
        finally:
            get_settings.cache_clear()


if __name__ == "__main__":  # pragma: no cover
    sys.exit(pytest.main([__file__, "-v"]))
