"""Corrector Agent configuration (Phase 2).

Central, dependency-light configuration for the production Corrector pipeline.

Only a subset of these fields is exercised in Step 1 (Contracts + Adapter).
Fields for later steps are declared here with safe defaults and annotated with
the step that activates them. Nothing in this module loads a model, touches the
filesystem, or produces any side effect at import time.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

__all__ = ["CorrectorConfig", "DEFAULT_CORRECTOR_OPENROUTER_MODEL"]

DEFAULT_CORRECTOR_OPENROUTER_MODEL: str = "qwen/qwen-2.5-7b-instruct"


def _env_str(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw in (None, ""):
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw in (None, ""):
        return default
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw in (None, ""):
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class CorrectorConfig:
    """Immutable Corrector configuration.

    Defaults are safe for Step 1 (no field below is required for the canonical
    input/output boundary). Later steps activate the annotated fields.
    """

    # --- Retry / validation (activated in Step 5) ---
    max_retries: int = 2
    evidence_alignment_threshold: float = 0.5
    # Step 5: minimal-edit is a SOFT signal. A candidate whose similarity to the
    # ORIGINAL sentence falls below this is over-rewriting rather than repairing.
    # NOTE: distinct from benchmark_engine's `minimal_edit_score`, which measures
    # similarity to the GOLD sentence and is uncomputable at runtime.
    minimal_edit_min_similarity: float = 0.25
    # Step 5: a candidate more than this many times the original's length is
    # expanding, not correcting.
    max_expansion_ratio: float = 2.5
    # Step 5: when True, acceptance REQUIRES a real injected EntailmentScorer.
    # With no scorer available the candidate is not accepted (fails closed).
    require_entailment_check: bool = False
    # Step 5: reject candidates carrying more than one sentence.
    enforce_single_sentence: bool = True

    # --- Claim-to-text targeting (activated in Step 2) ---
    token_overlap_threshold: float = 0.4
    # Step 2: the best token-overlap candidate must beat the runner-up by at
    # least this margin, otherwise the match is treated as AMBIGUOUS and the
    # claim fails safe. This margin — not the threshold — is what makes
    # last-resort token matching "sufficiently unambiguous".
    token_overlap_margin: float = 0.15
    # Step 2: claims shorter than this (in tokens) are never token-matched;
    # short claims overlap too many sentences to disambiguate safely.
    min_claim_tokens_for_overlap: int = 3

    # --- Prompt / context budgeting (activated in Step 4) ---
    max_prompt_tokens: int = 3072
    max_new_tokens: int = 256

    # --- Model loading / generation (activated in Steps 4 & 6) ---
    model_path: str = "./training/qwen1.5b-corrector-lora-merged"
    base_model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"
    # SAFETY: never silently fall back to an unrelated base model and report
    # success. When the fine-tuned model/adapter is unavailable the Corrector
    # returns an explicit degraded state (see adapter.build_model_unavailable_result).
    allow_base_model_fallback: bool = False
    deterministic: bool = True
    openrouter_model: str = DEFAULT_CORRECTOR_OPENROUTER_MODEL

    @classmethod
    def from_env(cls) -> "CorrectorConfig":
        """Build a config from ``HG_CORRECTOR_*`` environment overrides."""
        return cls(
            max_retries=_env_int("HG_CORRECTOR_MAX_RETRIES", cls.max_retries),
            evidence_alignment_threshold=_env_float(
                "HG_CORRECTOR_EVIDENCE_ALIGNMENT_THRESHOLD",
                cls.evidence_alignment_threshold,
            ),
            minimal_edit_min_similarity=_env_float(
                "HG_CORRECTOR_MINIMAL_EDIT_MIN_SIMILARITY",
                cls.minimal_edit_min_similarity,
            ),
            max_expansion_ratio=_env_float(
                "HG_CORRECTOR_MAX_EXPANSION_RATIO", cls.max_expansion_ratio
            ),
            require_entailment_check=_env_bool(
                "HG_CORRECTOR_REQUIRE_ENTAILMENT_CHECK",
                cls.require_entailment_check,
            ),
            enforce_single_sentence=_env_bool(
                "HG_CORRECTOR_ENFORCE_SINGLE_SENTENCE",
                cls.enforce_single_sentence,
            ),
            token_overlap_threshold=_env_float(
                "HG_CORRECTOR_TOKEN_OVERLAP_THRESHOLD", cls.token_overlap_threshold
            ),
            token_overlap_margin=_env_float(
                "HG_CORRECTOR_TOKEN_OVERLAP_MARGIN", cls.token_overlap_margin
            ),
            min_claim_tokens_for_overlap=_env_int(
                "HG_CORRECTOR_MIN_CLAIM_TOKENS_FOR_OVERLAP",
                cls.min_claim_tokens_for_overlap,
            ),
            max_prompt_tokens=_env_int(
                "HG_CORRECTOR_MAX_PROMPT_TOKENS", cls.max_prompt_tokens
            ),
            max_new_tokens=_env_int("HG_CORRECTOR_MAX_NEW_TOKENS", cls.max_new_tokens),
            model_path=_env_str("HG_CORRECTOR_MODEL_PATH", cls.model_path),
            base_model_name=_env_str(
                "HG_CORRECTOR_BASE_MODEL_NAME", cls.base_model_name
            ),
            allow_base_model_fallback=_env_bool(
                "HG_CORRECTOR_ALLOW_BASE_MODEL_FALLBACK", cls.allow_base_model_fallback
            ),
            deterministic=_env_bool("HG_CORRECTOR_DETERMINISTIC", cls.deterministic),
            openrouter_model=_env_str(
                "HG_CORRECTOR_OPENROUTER_MODEL", cls.openrouter_model
            ),
        )
