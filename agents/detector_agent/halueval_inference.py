"""
HaluEval Inference Module.

Loads the fine-tuned HaluEval detector model from disk and provides
a simple predict() interface for the DetectorAgent.
"""

import inspect
import os
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    HAS_TORCH = True
except ImportError:
    torch = None
    AutoModelForSequenceClassification = None
    AutoTokenizer = None
    HAS_TORCH = False

logger = logging.getLogger(__name__)


# Default model artifact path — updated to final versioned directory
DEFAULT_MODEL_PATH = "artifacts/halueval-detector-final"
FALLBACK_MODEL_PATH = "artifacts/halueval-detector"

# Import the canonical formatter — single source of truth
from agents.detector_agent.halueval_dataset import format_detector_input


def _looks_like_local_path(value: str) -> bool:
    """Return True when a model reference should be validated as a filesystem path."""
    path = Path(value).expanduser()
    if path.exists():
        return True
    if value.startswith((".", "/", "~", "\\")):
        return True
    if os.name == "nt" and len(value) > 1 and value[1] == ":":
        return True
    return False


def validate_halueval_model_reference(model_ref: str) -> str:
    """Validate and normalize a HaluEval model reference.

    Local model directories must contain the standard Hugging Face files created
    by ``halueval_trainer.py``. Non-path values are treated as Hugging Face Hub
    model identifiers and are left for ``transformers.from_pretrained`` to
    validate at load time. This keeps the production path real while supporting
    externally hosted artifacts without committing model binaries to Git.
    """
    if not model_ref or not model_ref.strip():
        raise ValueError(
            "HALUEVAL_MODEL_PATH is empty; set it to a local model directory or Hugging Face model id."
        )

    if model_ref.startswith("hf://"):
        return model_ref.removeprefix("hf://")

    if not _looks_like_local_path(model_ref):
        return model_ref

    resolved = Path(model_ref).expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(
            f"HaluEval detector model directory not found at: {resolved}\n"
            "Set HALUEVAL_MODEL_PATH to a valid fine-tuned model directory, "
            "or train/download the artifact with:\n"
            "  python -m agents.detector_agent.halueval_trainer --output-dir artifacts/halueval-detector-final"
        )
    if not resolved.is_dir():
        raise FileNotFoundError(
            f"HaluEval detector model path is not a directory: {resolved}"
        )

    required_any_weight = ["model.safetensors", "pytorch_model.bin"]
    missing = [name for name in ("config.json",) if not (resolved / name).exists()]
    if not any((resolved / name).exists() for name in required_any_weight):
        missing.append("model.safetensors or pytorch_model.bin")
    if not any((resolved / name).exists() for name in ("tokenizer.json", "vocab.txt")):
        missing.append("tokenizer.json or vocab.txt")
    if missing:
        raise FileNotFoundError(
            f"Invalid HaluEval detector model directory: {resolved}\n"
            f"Missing required Hugging Face artifact(s): {', '.join(missing)}\n"
            "Regenerate the model with agents.detector_agent.halueval_trainer or point HALUEVAL_MODEL_PATH to the complete artifact."
        )
    return str(resolved)


@dataclass
class InferenceResult:
    """Raw inference output from the HaluEval model."""

    hallucination_probability: float
    confidence_score: float
    predicted_label: int  # 0 = NO_HALLUCINATION, 1 = HALLUCINATION
    predicted_label_name: str


class HaluEvalInference:
    """Loads and runs inference using the fine-tuned HaluEval detector model."""

    def __init__(
        self,
        model_path: Optional[str] = None,
        max_length: int = 384,
        device: Optional[str] = None,
    ):
        self.model_path = model_path or self._resolve_model_path()
        self.max_length = max_length

        # Auto-detect device
        if device is None:
            self.device = "cuda" if (HAS_TORCH and torch and torch.cuda.is_available()) else "cpu"
        else:
            self.device = device

        self._tokenizer: Optional[AutoTokenizer] = None
        self._model: Optional[AutoModelForSequenceClassification] = None
        self._loaded = False

    def _resolve_model_path(self) -> str:
        """Try to find the model artifacts directory."""
        candidates = [
            DEFAULT_MODEL_PATH,
            FALLBACK_MODEL_PATH,
            os.path.join(os.path.dirname(__file__), "..", "..", DEFAULT_MODEL_PATH),
            os.path.join(os.path.dirname(__file__), "..", "..", FALLBACK_MODEL_PATH),
        ]

        env_path = os.environ.get("HALUEVAL_MODEL_PATH")
        if env_path:
            resolved = validate_halueval_model_reference(env_path)
            logger.info(
                "Resolved HaluEval model reference from HALUEVAL_MODEL_PATH: %s",
                resolved,
            )
            return resolved

        for candidate in candidates:
            try:
                resolved = validate_halueval_model_reference(candidate)
            except FileNotFoundError:
                continue
            logger.info("Resolved HaluEval model reference: %s", resolved)
            return resolved

        return os.path.abspath(DEFAULT_MODEL_PATH)

    def load(self) -> None:
        """Load model and tokenizer from disk."""
        if self._loaded:
            return

        if not HAS_TORCH or AutoTokenizer is None or AutoModelForSequenceClassification is None:
            raise RuntimeError(
                "torch and transformers are required to load HaluEval model. "
                "Please install torch and transformers."
            )

        self.model_path = validate_halueval_model_reference(self.model_path)

        logger.info(f"Loading HaluEval model from: {self.model_path}")
        print(f"[HaluEval] Loading model from: {self.model_path}")
        print(f"[HaluEval] Device: {self.device}")


        self._tokenizer = AutoTokenizer.from_pretrained(self.model_path)
        self._model = AutoModelForSequenceClassification.from_pretrained(
            self.model_path
        )
        self._model.to(self.device)
        self._model.eval()
        self._loaded = True

        print(f"[HaluEval] Model loaded successfully.")

    def predict(
        self,
        user_query: str,
        llm_response: str,
        context: Optional[str] = None,
    ) -> InferenceResult:
        """Run inference on a query-response pair.

        Args:
            user_query:   The user's original question.
            llm_response: The LLM's generated response.
            context:      Optional reference context. If provided, the model
                          uses it to ground the hallucination detection.
                          Production path (no context) is fully supported.

        Returns:
            InferenceResult with hallucination_probability, confidence_score,
            predicted_label, and predicted_label_name.
        """
        if not self._loaded:
            self.load()

        # Use the canonical formatter — same as training
        text = format_detector_input(user_query, llm_response, context)

        inputs = self._tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_length,
            padding=True,
        )

        accepted_inputs = set(inspect.signature(self._model.forward).parameters)
        inputs = {
            k: v.to(self.device)
            for k, v in inputs.items()
            if k in accepted_inputs
        }

        with torch.no_grad():
            logits = self._model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)

        no_halluc_prob = probs[0][0].item()
        halluc_prob = probs[0][1].item()
        predicted_label = 1 if halluc_prob > no_halluc_prob else 0
        label_name = "HALLUCINATION" if predicted_label == 1 else "NO_HALLUCINATION"

        return InferenceResult(
            hallucination_probability=round(halluc_prob, 6),
            confidence_score=round(1.0 - halluc_prob, 6),
            predicted_label=predicted_label,
            predicted_label_name=label_name,
        )

    def is_loaded(self) -> bool:
        """Check if the model is currently loaded."""
        return self._loaded


if __name__ == "__main__":
    """Quick standalone test."""
    engine = HaluEvalInference()
    engine.load()

    test_cases = [
        ("What is the capital of France?", "The capital of France is Paris."),
        ("What is the capital of France?", "The capital of France is Tokyo, Japan."),
        (
            "Who wrote Romeo and Juliet?",
            "Romeo and Juliet was written by William Shakespeare.",
        ),
        (
            "Who wrote Romeo and Juliet?",
            "Romeo and Juliet was written by Albert Einstein in 1920.",
        ),
    ]

    for query, response in test_cases:
        result = engine.predict(query, response)
        print(f"\nQuery: {query}")
        print(f"Response: {response}")
        print(f"  hallucination_probability = {result.hallucination_probability:.4f}")
        print(f"  confidence_score          = {result.confidence_score:.4f}")
        print(f"  prediction                = {result.predicted_label_name}")
