import logging
from typing import List, Dict
from .base import BaseModelWrapper
from models.model_manager import get_model_manager

logger = logging.getLogger(__name__)


class NLIWrapper(BaseModelWrapper):
    """
    Wrapper for Natural Language Inference models.

    Supports:
      - cross-encoder/nli-deberta-v3-base (default)
      - microsoft/deberta-v3-large
      - facebook/bart-large-mnli

    The underlying model is loaded as a HuggingFace ``text-classification``
    pipeline via :func:`ModelManager.load_nli_model`.
    """

    def __init__(self, model_id: str = "cross-encoder/nli-deberta-v3-base"):
        super().__init__(model_id)
        self._labels = ["contradiction", "entailment", "neutral"]

    def _load_internal(self) -> None:
        self._pipeline = get_model_manager().load_nli_model(self.model_id)

    def predict(self, premise: str, hypothesis: str) -> Dict[str, float]:
        """
        Predict NLI scores for a premise-hypothesis pair.

        Returns:
            Dict with keys ``entailment``, ``contradiction``, ``neutral``
            mapped to their probability scores.
        """
        self.ensure_loaded()
        fallback = {
            "entailment": 0.0,
            "contradiction": 0.0,
            "neutral": 1.0,
            "degraded": True,
        }
        if not self._is_available or self._pipeline is None:
            logger.warning(
                "Using degraded neutral scores for NLI because the real model is unavailable."
            )
            return fallback

        try:
            result = self._pipeline(
                {"text": premise, "text_pair": hypothesis},
                truncation=True,
                max_length=512,
            )
            if result and isinstance(result[0], list):
                result = result[0]

            scores: Dict[str, float] = {}
            for item in result:
                label = item["label"].lower()
                scores[label] = float(item["score"])

            # Ensure all standard keys exist
            for k in self._labels:
                if k not in scores:
                    scores[k] = scores.get(f"label_{self._labels.index(k)}", 0.0)

            return scores
        except Exception as e:
            logger.error(f"Error in NLI predict: {e}")
            return fallback

    def batch_predict(
        self, premise: str, hypotheses: List[str]
    ) -> List[Dict[str, float]]:
        """Batch predict for multiple hypotheses against a single premise."""
        self.ensure_loaded()
        if not self._is_available or self._pipeline is None:
            fallback = {
                "entailment": 0.0,
                "contradiction": 0.0,
                "neutral": 1.0,
                "degraded": True,
            }
            return [fallback] * len(hypotheses)

        try:
            batch = [{"text": premise, "text_pair": hyp} for hyp in hypotheses]
            raw_results = self._pipeline(batch, truncation=True, max_length=512)
            outputs: List[Dict[str, float]] = []
            for result in raw_results:
                rows = result if result and isinstance(result[0], dict) else result[0]
                scores = {item["label"].lower(): float(item["score"]) for item in rows}
                for k in self._labels:
                    if k not in scores:
                        scores[k] = 0.0
                outputs.append(scores)
            return outputs
        except Exception as e:
            logger.error(f"Error in batch NLI predict: {e}")
            return [self.predict(premise, hyp) for hyp in hypotheses]

    def classify(self, premise: str, hypothesis: str) -> str:
        """Returns the top label string."""
        scores = self.predict(premise, hypothesis)
        if not scores:
            return "neutral"
        return max(scores.items(), key=lambda x: x[1])[0]
