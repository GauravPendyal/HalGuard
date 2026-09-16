"""
HalluciGuard Configuration — Pydantic Settings with Environment Variable Loading.

All application-wide configuration is managed through this module.
Settings are loaded from ``.env`` file and/or environment variables.
"""
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # -- API Keys (optional — system works without these) --
    alpha_vantage_key: Optional[str] = None
    openfda_key: Optional[str] = None
    nvd_api_key: Optional[str] = None
    semantic_scholar_key: Optional[str] = None
    courtlistener_key: Optional[str] = None
    sec_user_agent: str = "HalluciGuard/2.0 compliance@halluciguard.ai"

    # -- Feature flags --
    mock_mode: bool = False
    allow_model_downloads: bool = False
    enable_domain_classifier: bool = False
    enable_confidence_calibration: bool = True

    # -- Certification mode (§28/§29/§30) --
    # OFF by default: normal production stays resilient / fail-soft.
    # When ON (env CERTIFICATION_MODE=true): detector/BGE/NLI fallback and
    # mock/empty/malformed evidence become CONTROLLED FAILURES instead of being
    # silently certified, and the cache is bypassed so a cached result can never
    # be presented as proof that the models executed this run.
    certification_mode: bool = False
    # env CACHE_ENABLED — independent kill-switch for the verifier result cache.
    cache_enabled: bool = True

    # -- Model selections --
    nli_model: str = "cross-encoder/nli-deberta-v3-base"
    reranker_model: str = "BAAI/bge-reranker-large"
    embedding_model: str = "BAAI/bge-m3"
    zero_shot_model: str = "facebook/bart-large-mnli"

    # -- Model runtime --
    max_cached_models: int = 8
    gpu_memory_threshold_mb: int = 512
    default_latency_budget: str = "balanced"

    # -- Cache --
    cache_ttl: int = 86400
    verifier_cache_enabled: bool = True

    # -- Retrieval quality gate --
    # Minimum number of passages with BGE relevance above relevance_threshold to consider primary evidence sufficient
    min_relevant_passages: int = 1
    # Minimum BGE relevance score for the top passage to consider primary evidence sufficient
    min_top_relevance: float = 0.30
    # BGE relevance score threshold: passages below this are considered not relevant
    relevance_threshold: float = 0.25
    # Maximum number of primary passages to assess (performance limit)
    max_primary_passages: int = 10
    # Relevance gate for evidence classification: passages with BGE below this are IRRELEVANT
    evidence_relevance_gate: float = 0.20
    # Default retrieval mode: hybrid (primary + fallback), primary_only, tavily_only
    default_retrieval_mode: str = "hybrid"
    # Bounded BGE candidates scored at retrieval quality gate (before Tavily decision)
    gate_max_candidates: int = 5
    gate_use_bge: bool = True

    # -- n8n Retrieval Service V2 --
    n8n_retrieval_enabled: bool = False
    n8n_retrieval_webhook_url: str = "https://manjusogala.app.n8n.cloud/webhook/halluciguard-verify-v2"
    n8n_health_webhook_url: str = "https://manjusogala.app.n8n.cloud/webhook/halluciguard-health"
    n8n_auth_mode: str = "header"  # "header" (default) or "none"
    n8n_header_name: str = "X-API-Key"
    n8n_webhook_secret: Optional[str] = None
    n8n_timeout_seconds: float = 60.0

    # -- Server --
    verifier_port: int = 8002
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
