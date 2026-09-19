from __future__ import annotations

import logging
import time
from typing import List, Dict, Any, Optional

from schemas.models import EntailmentLabel
from models.model_manager import get_model_manager

logger = logging.getLogger(__name__)


def _normalize_nli_scores(
    result_items: List[Dict[str, Any]],
    id2label: Optional[Dict[int, str]] = None,
) -> Dict[str, float]:
    """
    Dynamically maps raw HuggingFace classification outputs to standard NLI keys:
      - entailment
      - contradiction
      - neutral
    """
    scores = {"entailment": 0.0, "contradiction": 0.0, "neutral": 0.0}

    for item in result_items:
        raw_label = str(item.get("label", "")).lower()
        score = float(item.get("score", 0.0))

        if "entail" in raw_label or raw_label == "supports":
            scores["entailment"] = score
        elif "contradict" in raw_label or "refute" in raw_label:
            scores["contradiction"] = score
        elif "neutral" in raw_label:
            scores["neutral"] = score
        elif raw_label.startswith("label_"):
            try:
                idx = int(raw_label.split("_")[1])
                if id2label and idx in id2label:
                    canonical = str(id2label[idx]).lower()
                    if "entail" in canonical:
                        scores["entailment"] = score
                    elif "contradict" in canonical:
                        scores["contradiction"] = score
                    elif "neutral" in canonical:
                        scores["neutral"] = score
                else:
                    # Standard DeBERTa/RoBERTa MNLI mapping fallback: 0=contradiction, 1=entailment, 2=neutral
                    if idx == 0:
                        scores["contradiction"] = score
                    elif idx == 1:
                        scores["entailment"] = score
                    elif idx == 2:
                        scores["neutral"] = score
            except (ValueError, IndexError):
                logger.debug("Could not parse label index %s", raw_label)

    # Softmax normalization if sum > 0
    total = sum(scores.values())
    if total > 0 and abs(total - 1.0) > 0.01:
        scores = {k: v / total for k, v in scores.items()}

    return scores


class NLIEngine:
    """Natural Language Inference engine for entailment classification."""

    def __init__(self, model_name: str = "cross-encoder/nli-deberta-v3-base") -> None:
        self.model_name = model_name
        self.pipeline = None
        self._is_available = True
        self._load_attempts = 0

        # --- §15 engine-level execution diagnostics (real-execution-only proof) ---
        # Per-item results already carry a `degraded` flag; these expose whether
        # the DeBERTa model actually loaded and a real forward pass ran on the
        # most recent call, so certification mode can fail-closed on fallback.
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

        if self._load_attempts >= 2:
            self._is_available = False
            return

        self._load_attempts += 1

        try:
            self.pipeline = get_model_manager().load_nli_model(self.model_name)
            self._load_attempts = 0
        except ImportError:
            logger.warning("transformers not installed. NLIEngine falling back.")
            self._is_available = False
        except Exception as e:
            logger.warning(
                f"Error loading NLI model {self.model_name}: {e}. Falling back."
            )
            if self._load_attempts >= 2:
                self._is_available = False

    def _get_id2label(self) -> Optional[Dict[int, str]]:
        if (
            self.pipeline
            and hasattr(self.pipeline, "model")
            and hasattr(self.pipeline.model, "config")
        ):
            return getattr(self.pipeline.model.config, "id2label", None)
        return None

    def _chunk_evidence(self, claim: str, evidence: str) -> List[str]:
        """Split long evidence into token-aware chunks <= model maximum sequence length."""
        if not evidence or not evidence.strip():
            return [evidence]

        max_seq_len = 512
        tokenizer = getattr(self.pipeline, "tokenizer", None)
        if tokenizer is not None:
            try:
                claim_tokens = len(tokenizer.encode(claim, add_special_tokens=False))
                # Reserve room for special tokens ([CLS], [SEP], [SEP]) + safety margin
                max_ev_tokens = max(64, max_seq_len - claim_tokens - 16)
                ev_tokens = tokenizer.encode(evidence, add_special_tokens=False)
                if len(ev_tokens) <= max_ev_tokens:
                    return [evidence]

                chunks = []
                stride = int(max_ev_tokens * 0.8)
                for start_idx in range(0, len(ev_tokens), stride):
                    chunk_toks = ev_tokens[start_idx : start_idx + max_ev_tokens]
                    chunk_str = tokenizer.decode(chunk_toks, skip_special_tokens=True).strip()
                    if chunk_str:
                        chunks.append(chunk_str)
                    if start_idx + max_ev_tokens >= len(ev_tokens):
                        break
                return chunks or [evidence]
            except Exception as e:
                logger.debug("Tokenizer-based chunking error: %s; falling back to text splitting", e)

        # Fallback text splitting by words (~4 chars per token)
        words = evidence.split()
        if len(words) <= 300:
            return [evidence]
        chunks = []
        chunk_size = 250
        stride = 200
        for i in range(0, len(words), stride):
            chunk = " ".join(words[i : i + chunk_size]).strip()
            if chunk:
                chunks.append(chunk)
            if i + chunk_size >= len(words):
                break
        return chunks or [evidence]

    @staticmethod
    def _aggregate_chunk_scores(chunk_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate multiple NLI chunk classifications for a single evidence passage."""
        if not chunk_scores:
            return {
                "label": EntailmentLabel.NEUTRAL,
                "entailment_score": 0.0,
                "contradiction_score": 0.0,
                "neutral_score": 1.0,
                "degraded": False,
            }
        if len(chunk_scores) == 1:
            return chunk_scores[0]

        max_contra = max(s["contradiction_score"] for s in chunk_scores)
        max_entail = max(s["entailment_score"] for s in chunk_scores)

        if max_contra > max_entail and max_contra >= 0.5:
            label = EntailmentLabel.CONTRADICTION
            c_score = round(max_contra, 6)
            e_score = round(min(max_entail, 1.0 - c_score), 6)
            n_score = round(max(0.0, 1.0 - c_score - e_score), 6)
        elif max_entail > max_contra and max_entail >= 0.5:
            label = EntailmentLabel.ENTAILMENT
            e_score = round(max_entail, 6)
            c_score = round(min(max_contra, 1.0 - e_score), 6)
            n_score = round(max(0.0, 1.0 - e_score - c_score), 6)
        else:
            best = max(chunk_scores, key=lambda s: max(s["entailment_score"], s["contradiction_score"]))
            return best

        return {
            "label": label,
            "entailment_score": e_score,
            "contradiction_score": c_score,
            "neutral_score": n_score,
            "degraded": any(s.get("degraded", False) for s in chunk_scores),
        }

    def classify(
        self, claim: str, evidence: str, model_name: str | None = None
    ) -> Dict[str, Any]:
        """
        Classify the entailment relationship between claim (Hypothesis) and evidence (Premise).
        Follows standard FEVER/SciFact ordering: Premise=evidence, Hypothesis=claim.
        Uses token-aware chunking for long evidence.
        """
        results = self.batch_classify(claim, [evidence], model_name=model_name)
        if results:
            return results[0]
        return {
            "label": EntailmentLabel.NEUTRAL,
            "entailment_score": 0.0,
            "contradiction_score": 0.0,
            "neutral_score": 1.0,
            "degraded": True,
            "error": "nli_no_output",
        }

    def predict(self, claim: str, evidence: str) -> EntailmentLabel:
        """Helper returning top EntailmentLabel."""
        res = self.classify(claim, evidence)
        return res["label"]

    def batch_classify(
        self,
        claim: str,
        evidences: List[str],
        model_name: str | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple evidence passages against a single claim with token-aware chunking.
        """
        self._reset_run_diagnostics()

        if not evidences:
            return []

        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self.pipeline = None
            self._is_available = True

        self._load_model()

        fallback = {
            "label": EntailmentLabel.NEUTRAL,
            "entailment_score": 0.0,
            "contradiction_score": 0.0,
            "neutral_score": 1.0,
            "degraded": True,
            "error": "nli_model_unavailable",
        }

        if not self._is_available or self.pipeline is None:
            logger.warning(
                "Returning degraded neutral results from batch_classify (model %s unavailable)",
                self.model_name,
            )
            self.last_status = "unavailable"
            self.last_degraded = True
            self.last_inference_executed = False
            return [dict(fallback) for _ in evidences]

        try:
            # Token-aware chunking map: evidence index -> list of chunk strings
            evidence_chunks_map: List[List[str]] = []
            flat_items: List[Dict[str, str]] = []
            chunk_to_ev_idx: List[int] = []

            for ev_idx, ev in enumerate(evidences):
                chunks = self._chunk_evidence(claim, ev)
                evidence_chunks_map.append(chunks)
                for chunk in chunks:
                    flat_items.append({"text": chunk, "text_pair": claim})
                    chunk_to_ev_idx.append(ev_idx)

            _t0 = time.perf_counter()
            # Enforce truncation=True and max_length=512 as an unbreachable safeguard
            try:
                raw_results = self.pipeline(flat_items, truncation=True, max_length=512)
            except TypeError:
                raw_results = self.pipeline(flat_items)
            self.last_latency_ms = int((time.perf_counter() - _t0) * 1000)
            id2label = self._get_id2label()

            # Normalize raw pipeline outputs per chunk
            ev_chunk_scores: List[List[Dict[str, Any]]] = [[] for _ in range(len(evidences))]
            for idx, result in enumerate(raw_results):
                rows = result if result and isinstance(result[0], dict) else result[0]
                scores = _normalize_nli_scores(rows, id2label)

                entailment = scores["entailment"]
                contradiction = scores["contradiction"]
                neutral = scores["neutral"]

                if entailment > contradiction and entailment > neutral:
                    label = EntailmentLabel.ENTAILMENT
                elif contradiction > entailment and contradiction > neutral:
                    label = EntailmentLabel.CONTRADICTION
                else:
                    label = EntailmentLabel.NEUTRAL

                chunk_score_dict = {
                    "label": label,
                    "entailment_score": entailment,
                    "contradiction_score": contradiction,
                    "neutral_score": neutral,
                    "degraded": False,
                }
                orig_ev_idx = chunk_to_ev_idx[idx]
                ev_chunk_scores[orig_ev_idx].append(chunk_score_dict)

            # Aggregate chunk scores per original evidence item
            outputs: List[Dict[str, Any]] = []
            for ev_idx in range(len(evidences)):
                aggregated = self._aggregate_chunk_scores(ev_chunk_scores[ev_idx])
                outputs.append(aggregated)

            self.last_status = "executed"
            self.last_inference_executed = True
            self.last_degraded = False
            self.last_device = self._detect_device()
            self.last_batch_size = len(evidences)
            return outputs
        except Exception as e:
            logger.warning(
                "Error during batched NLI classification with model %s: %s. Falling back.",
                self.model_name,
                e,
            )
            self.last_status = "degraded"
            self.last_degraded = True
            self.last_inference_executed = False
            return [dict(fallback) for _ in evidences]

