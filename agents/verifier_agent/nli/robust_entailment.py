from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from schemas.models import EntailmentLabel
from models.model_manager import get_model_manager

logger = logging.getLogger(__name__)


def _canonical_label(
    raw_label: Any, id2label: Optional[Dict[Any, str]] = None
) -> Optional[str]:
    label = str(raw_label or "").strip().lower()
    if "entail" in label or label in {"supports", "support"}:
        return "entailment"
    if "contradict" in label or "refute" in label or label in {"refutes", "refutation"}:
        return "contradiction"
    if "neutral" in label:
        return "neutral"
    if label.startswith("label_"):
        try:
            index = int(label.split("_", 1)[1])
        except (ValueError, IndexError):
            return None
        mapped = id2label.get(index) if id2label else None
        if mapped is None and id2label:
            mapped = id2label.get(str(index))
        if mapped:
            return _canonical_label(mapped, None)
        return {0: "contradiction", 1: "entailment", 2: "neutral"}.get(index)
    return None


def _flatten_predictions(raw: Any) -> List[Dict[str, Any]]:
    if raw is None:
        return []
    if isinstance(raw, dict):
        return [raw]
    if not isinstance(raw, list):
        return []
    if raw and isinstance(raw[0], dict):
        return raw
    flattened: List[Dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            flattened.append(item)
        elif isinstance(item, list):
            flattened.extend(x for x in item if isinstance(x, dict))
    return flattened


def _normalize_scores(
    items: List[Dict[str, Any]],
    id2label: Optional[Dict[Any, str]] = None,
) -> Dict[str, float]:
    scores = {"entailment": 0.0, "contradiction": 0.0, "neutral": 0.0}
    for item in items:
        label = _canonical_label(item.get("label"), id2label)
        if label is None:
            continue
        try:
            score = max(0.0, float(item.get("score", 0.0)))
        except (TypeError, ValueError):
            continue
        scores[label] = max(scores[label], score)
    total = sum(scores.values())
    if total > 0:
        scores = {key: value / total for key, value in scores.items()}
    return scores


def _decision(scores: Dict[str, float]) -> Dict[str, Any]:
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_label, top_score = ordered[0]
    second_score = ordered[1][1]
    label = (
        EntailmentLabel.NEUTRAL
        if top_score < 0.45 or (top_score - second_score) < 0.05
        else EntailmentLabel(top_label)
    )
    return {
        "label": label,
        "entailment_score": round(scores["entailment"], 6),
        "contradiction_score": round(scores["contradiction"], 6),
        "neutral_score": round(scores["neutral"], 6),
    }


class NLIEngine:
    """Production-safe NLI wrapper with explicit label mapping and alignment."""

    def __init__(self, model_name: str = "cross-encoder/nli-deberta-v3-base") -> None:
        self.model_name = model_name
        self.pipeline = None
        self._is_available = True

        # --- §15 engine-level execution diagnostics (real-execution-only proof) ---
        # This is the canonical pipeline NLI engine (see nli/__init__.py). It mirrors
        # nli/entailment.py's diagnostics so the pipeline can build a ModelExecutionTrace
        # (§26) and certification can fail-closed on fallback (§28). The decision logic
        # below (_normalize_scores/_decision, batch alignment) is intentionally unchanged.
        self.last_status: str = "not_run"  # executed | degraded | unavailable | not_run
        self.last_inference_executed: bool = False
        self.last_degraded: bool = False
        self.last_device: str = "unknown"
        self.last_latency_ms: int = 0
        self.last_batch_size: int = 0

    def _reset_run_diagnostics(self) -> None:
        self.last_status = "not_run"
        self.last_inference_executed = False
        self.last_degraded = False
        self.last_latency_ms = 0
        self.last_batch_size = 0

    def is_loaded(self) -> bool:
        """True iff the NLI pipeline is loaded and usable."""
        return self.pipeline is not None and self._is_available

    def _detect_device(self) -> str:
        """Best-effort device read from the loaded HF pipeline (never raises)."""
        pipe = self.pipeline
        if pipe is None:
            return "unknown"
        try:
            dev = getattr(pipe, "device", None)
            if dev is not None:
                return str(dev)
        except Exception:
            pass
        model = getattr(pipe, "model", None)
        try:
            dev = getattr(model, "device", None)
            if dev is not None:
                return str(dev)
        except Exception:
            pass
        return "unknown"

    def diagnostics(self) -> dict:
        """Return the last-run execution proof for tracing/certification (§15/§26)."""
        return {
            "component": "deberta_nli",
            "model": self.model_name,
            "loaded": self.is_loaded(),
            "inference_executed": self.last_inference_executed,
            "degraded": self.last_degraded,
            "status": self.last_status,
            "device": self.last_device,
            "latency_ms": self.last_latency_ms,
            "batch_size": self.last_batch_size,
        }

    def _load_model(self) -> None:
        if self.pipeline is not None or not self._is_available:
            return
        try:
            self.pipeline = get_model_manager().load_nli_model(self.model_name)
        except Exception as exc:
            logger.warning(
                "NLI model unavailable (%s); using degraded neutral result", exc
            )
            self._is_available = False

    def _get_id2label(self) -> Optional[Dict[Any, str]]:
        model = getattr(self.pipeline, "model", None)
        config = getattr(model, "config", None)
        return getattr(config, "id2label", None)

    @staticmethod
    def _neutral() -> Dict[str, Any]:
        return {
            "label": EntailmentLabel.NEUTRAL,
            "entailment_score": 0.0,
            "contradiction_score": 0.0,
            "neutral_score": 1.0,
            "degraded": True,
            "error": "nli_model_unavailable_or_failed",
        }

    def _get_max_length(self) -> int:
        """Dynamically determine maximum sequence length supported by active model/pipeline."""
        max_len = 512
        if self.pipeline is not None:
            tokenizer = getattr(self.pipeline, "tokenizer", None)
            if tokenizer is not None:
                t_max = getattr(tokenizer, "model_max_length", None)
                if isinstance(t_max, int) and 0 < t_max < 100_000:
                    max_len = t_max
            model = getattr(self.pipeline, "model", None)
            if model is not None and hasattr(model, "config"):
                m_max = getattr(model.config, "max_position_embeddings", None)
                if isinstance(m_max, int) and 0 < m_max < 100_000:
                    max_len = min(max_len, m_max)
        return max_len

    def _get_special_tokens_count(self, tokenizer: Any) -> int:
        """Count special tokens required for a premise-hypothesis pair (e.g., [CLS]...[SEP]...[SEP])."""
        if hasattr(tokenizer, "num_special_tokens_to_add"):
            try:
                return tokenizer.num_special_tokens_to_add(pair=True)
            except Exception:
                pass
        return 3

    def _encode_tokens(self, tokenizer: Any, text: str) -> List[int]:
        """Tokenize text into token IDs without special tokens and without emitting length warnings."""
        if not text:
            return []
        tok_logger = logging.getLogger("transformers.tokenization_utils_base")
        prev_level = tok_logger.level
        try:
            tok_logger.setLevel(logging.ERROR)
            return tokenizer.encode(text, add_special_tokens=False)
        finally:
            tok_logger.setLevel(prev_level)

    def _chunk_evidence(self, claim: str, evidence: str) -> List[str]:
        """
        Split long evidence into token-aware chunks bounded by the model's max sequence limit.
        Budget reservation accounts for claim tokens, special tokens, and a safety margin.
        """
        if not evidence or not evidence.strip():
            return [evidence or ""]

        tokenizer = getattr(self.pipeline, "tokenizer", None)
        if tokenizer is None:
            # When tokenizer is absent (e.g. mock test pipeline), treat as single item
            return [evidence]

        max_seq_len = self._get_max_length()
        num_special = self._get_special_tokens_count(tokenizer)
        # Reserve overhead for pair special tokens + small safety margin
        overhead = num_special + 3

        claim_tokens = self._encode_tokens(tokenizer, claim or "")
        claim_len = len(claim_tokens)
        max_evidence_tokens = max_seq_len - claim_len - overhead

        if max_evidence_tokens < 16:
            # The claim alone exhausts the sequence length budget. Under requirement 8,
            # we cannot alter or drop the claim. Fail safely to trigger degraded neutral.
            raise ValueError(
                f"Claim length ({claim_len} tokens) leaves insufficient budget for evidence within max sequence length {max_seq_len}"
            )

        ev_tokens = self._encode_tokens(tokenizer, evidence)
        if len(ev_tokens) <= max_evidence_tokens:
            return [evidence]

        # Long evidence: chunk with 20% overlap stride so boundary facts are not severed
        stride = max(16, int(max_evidence_tokens * 0.8))
        chunks: List[str] = []
        start_idx = 0
        total_ev_tokens = len(ev_tokens)

        while start_idx < total_ev_tokens:
            end_idx = min(start_idx + max_evidence_tokens, total_ev_tokens)
            tok_slice = ev_tokens[start_idx:end_idx]
            chunk_str = tokenizer.decode(tok_slice, skip_special_tokens=True).strip()
            if chunk_str:
                # Re-verify token length in case decoding boundary words expanded token count
                re_tokens = self._encode_tokens(tokenizer, chunk_str)
                if len(re_tokens) > max_evidence_tokens:
                    excess = len(re_tokens) - max_evidence_tokens
                    tok_slice = tok_slice[:-excess] if excess < len(tok_slice) else tok_slice[:1]
                    chunk_str = tokenizer.decode(tok_slice, skip_special_tokens=True).strip()
                chunks.append(chunk_str)
            if end_idx >= total_ev_tokens:
                break
            start_idx += stride

        return chunks or [evidence]

    def _aggregate_chunk_results(
        self, chunk_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Conservatively aggregate multi-chunk classification results for a single evidence item.
        Preserves decisive contradictions or entailments without diluting through naive averaging.
        """
        if not chunk_results:
            return self._neutral()
        if len(chunk_results) == 1:
            return chunk_results[0]

        valid_results = [r for r in chunk_results if not r.get("degraded", False)]
        if not valid_results:
            return self._neutral()

        max_contra = max(r.get("contradiction_score", 0.0) for r in valid_results)
        max_entail = max(r.get("entailment_score", 0.0) for r in valid_results)

        # High-confidence contradiction dominating entailment by at least the 0.05 margin
        if max_contra >= 0.50 and (max_contra - max_entail) >= 0.05:
            c_score = round(max_contra, 6)
            e_score = round(min(max_entail, max(0.0, 1.0 - c_score)), 6)
            n_score = round(max(0.0, 1.0 - c_score - e_score), 6)
            return {
                "label": EntailmentLabel.CONTRADICTION,
                "entailment_score": e_score,
                "contradiction_score": c_score,
                "neutral_score": n_score,
            }

        # High-confidence entailment dominating contradiction by at least the 0.05 margin
        if max_entail >= 0.50 and (max_entail - max_contra) >= 0.05:
            e_score = round(max_entail, 6)
            c_score = round(min(max_contra, max(0.0, 1.0 - e_score)), 6)
            n_score = round(max(0.0, 1.0 - e_score - c_score), 6)
            return {
                "label": EntailmentLabel.ENTAILMENT,
                "entailment_score": e_score,
                "contradiction_score": c_score,
                "neutral_score": n_score,
            }

        # Sub-threshold, conflicting, or neutral chunks: conservative neutral
        e_score = round(min(max_entail, 0.44), 6)
        c_score = round(min(max_contra, 0.44), 6)
        n_score = round(max(0.0, 1.0 - e_score - c_score), 6)
        return {
            "label": EntailmentLabel.NEUTRAL,
            "entailment_score": e_score,
            "contradiction_score": c_score,
            "neutral_score": n_score,
        }

    def classify(
        self, claim: str, evidence: str, model_name: str | None = None
    ) -> Dict[str, Any]:
        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self.pipeline = None
            self._is_available = True
        self._load_model()
        if not self._is_available or self.pipeline is None:
            return self._neutral()
        try:
            chunks = self._chunk_evidence(claim, evidence)
            if not chunks:
                chunks = [evidence or ""]

            if len(chunks) == 1:
                chunk = chunks[0]
                try:
                    raw = self.pipeline(
                        {"text": chunk or "", "text_pair": claim or ""},
                        truncation=True,
                        max_length=self._get_max_length(),
                    )
                except TypeError:
                    raw = self.pipeline({"text": chunk or "", "text_pair": claim or ""})
                scores = _normalize_scores(_flatten_predictions(raw), self._get_id2label())
                return _decision(scores) if sum(scores.values()) > 0 else self._neutral()

            # Multi-chunk evidence
            flat_items = [{"text": c or "", "text_pair": claim or ""} for c in chunks]
            try:
                raw_batch = self.pipeline(
                    flat_items,
                    truncation=True,
                    max_length=self._get_max_length(),
                )
            except TypeError:
                raw_batch = self.pipeline(flat_items)

            if not isinstance(raw_batch, list) or len(raw_batch) != len(flat_items):
                raise ValueError("NLI output length mismatch for chunked evidence")

            id2label = self._get_id2label()
            chunk_results = []
            for raw_item in raw_batch:
                scores = _normalize_scores(_flatten_predictions(raw_item), id2label)
                res = _decision(scores) if sum(scores.values()) > 0 else self._neutral()
                chunk_results.append(res)
            return self._aggregate_chunk_results(chunk_results)
        except Exception as exc:
            logger.warning("NLI classification failed: %s", exc)
            return self._neutral()

    def predict(self, claim: str, evidence: str) -> EntailmentLabel:
        return self.classify(claim, evidence)["label"]

    def batch_classify(
        self,
        claim: str,
        evidences: List[str],
        model_name: str | None = None,
    ) -> List[Dict[str, Any]]:
        # §15/§26 execution proof: reset first so an empty call reads "not_run".
        self._reset_run_diagnostics()
        if not evidences:
            return []
        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self.pipeline = None
            self._is_available = True
        self._load_model()
        if not self._is_available or self.pipeline is None:
            self.last_status = "unavailable"
            self.last_degraded = True
            self.last_inference_executed = False
            return [self._neutral() for _ in evidences]
        try:
            flat_items: List[Dict[str, str]] = []
            chunk_to_ev_idx: List[int] = []

            for ev_idx, ev in enumerate(evidences):
                chunks = self._chunk_evidence(claim, ev)
                if not chunks:
                    chunks = [ev or ""]
                for chunk in chunks:
                    flat_items.append({"text": chunk or "", "text_pair": claim or ""})
                    chunk_to_ev_idx.append(ev_idx)

            _t0 = time.perf_counter()
            try:
                raw_batch = self.pipeline(
                    flat_items,
                    truncation=True,
                    max_length=self._get_max_length(),
                )
            except TypeError:
                raw_batch = self.pipeline(flat_items)
            self.last_latency_ms = int((time.perf_counter() - _t0) * 1000)

            if not isinstance(raw_batch, list) or len(raw_batch) != len(flat_items):
                raise ValueError("NLI batch output is not aligned with input batch")

            id2label = self._get_id2label()
            ev_chunk_results: List[List[Dict[str, Any]]] = [[] for _ in range(len(evidences))]
            for flat_idx, raw_item in enumerate(raw_batch):
                scores = _normalize_scores(_flatten_predictions(raw_item), id2label)
                res = _decision(scores) if sum(scores.values()) > 0 else self._neutral()
                ev_idx = chunk_to_ev_idx[flat_idx]
                ev_chunk_results[ev_idx].append(res)

            outputs: List[Dict[str, Any]] = []
            for ev_idx in range(len(evidences)):
                agg = self._aggregate_chunk_results(ev_chunk_results[ev_idx])
                outputs.append(agg)

            # Real DeBERTa inference succeeded — record execution proof.
            self.last_status = "executed"
            self.last_inference_executed = True
            self.last_degraded = False
            self.last_device = self._detect_device()
            self.last_batch_size = len(evidences)
            return outputs
        except Exception as exc:
            logger.warning("Batched NLI failed; retrying individually: %s", exc)
            self.last_status = "degraded"
            self.last_degraded = True
            self.last_inference_executed = False
            return [
                self.classify(claim, evidence, model_name=self.model_name)
                for evidence in evidences
            ]
