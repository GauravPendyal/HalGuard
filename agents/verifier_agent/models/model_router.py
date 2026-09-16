"""
HalluciGuard Model Router — Intelligent Runtime Model Selection.

Determines the optimal model combination for each verification request
based on domain, claim complexity, hardware availability, latency budget,
and confidence requirements.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Literal

from .domain_intelligence import DomainProfile, get_domain_intelligence_registry
from .model_manager import get_model_manager

logger = logging.getLogger("halluciguard.model_router")

LatencyBudget = Literal["interactive", "balanced", "thorough"]

# ---------------------------------------------------------------------------
# Fast / lightweight model alternatives for constrained budgets
# ---------------------------------------------------------------------------
_FAST_EMBEDDING = "sentence-transformers/all-MiniLM-L6-v2"
_FAST_RERANKER = "cross-encoder/ms-marco-MiniLM-L-6-v2"
_FAST_NLI = "cross-encoder/nli-deberta-v3-base"
_QUALITY_NLI = "cross-encoder/nli-deberta-v3-base"
_QUALITY_RERANKER = "BAAI/bge-reranker-large"


@dataclass(frozen=True)
class ModelRoutingDecision:
    """Immutable record of all models and strategies selected for a request."""

    domain: str
    adapter: str
    embedding_model: str
    dense_model: str
    sparse_model: str
    retriever: str
    cross_encoder: str
    reranker_model: str
    nli_model: str
    sentence_transformer: str
    entity_recognition_model: str
    classification_model: str
    retrieval_strategy: str
    evidence_ranking_strategy: str
    confidence_strategy: str
    chunking_strategy: str
    device: str
    use_gpu: bool
    # New fields for enhanced routing metadata
    claim_complexity: str = "standard"
    latency_budget: str = "balanced"
    routing_reason: str = ""


class ModelRouter:
    """Chooses domain-specific models and strategies for a verification claim."""

    def __init__(self) -> None:
        self.registry = get_domain_intelligence_registry()
        self.model_manager = get_model_manager()

    def profile_for(self, domain: str) -> DomainProfile:
        """Retrieve the DomainProfile for a given domain."""
        return self.registry.get_profile(domain)

    # ------------------------------------------------------------------
    # Claim complexity estimation
    # ------------------------------------------------------------------
    @staticmethod
    def estimate_complexity(claim_text: str) -> str:
        """
        Estimate claim complexity as ``simple``, ``standard``, or ``complex``.

        Heuristics:
          - Length > 200 chars OR multiple sentences → complex
          - Contains numeric comparisons, percentages, dates → complex
          - Length < 60 chars and single sentence → simple
          - Otherwise → standard
        """
        if not claim_text:
            return "standard"

        sentence_count = len(re.split(r"[.!?]+", claim_text.strip()))
        has_numbers = bool(re.search(r"\d+\.?\d*\s*(%|percent|million|billion)", claim_text, re.I))
        has_comparisons = bool(re.search(r"(more than|less than|greater|compared to|versus|vs\.)", claim_text, re.I))
        has_temporal = bool(re.search(r"(since|before|after|between|during|in \d{4})", claim_text, re.I))

        complexity_signals = sum([
            len(claim_text) > 200,
            sentence_count > 2,
            has_numbers,
            has_comparisons,
            has_temporal,
        ])

        if complexity_signals >= 3:
            return "complex"
        if complexity_signals == 0 and len(claim_text) < 60:
            return "simple"
        return "standard"

    # ------------------------------------------------------------------
    # Main routing logic
    # ------------------------------------------------------------------
    def route(
        self,
        domain: str,
        claim_text: str = "",
        language: str = "en",
        latency_budget: LatencyBudget = "balanced",
        confidence_level: float = 0.0,
    ) -> ModelRoutingDecision:
        """
        Produce a ``ModelRoutingDecision`` tailored to the incoming request.

        Selection criteria:
          1. Domain profile provides base model assignments.
          2. Claim complexity determines retrieval depth.
          3. Hardware availability constrains model size.
          4. Latency budget trades off quality for speed.
          5. Low confidence triggers model escalation (larger models).
        """
        profile = self.profile_for(domain)
        models = profile.models
        device = self.model_manager.device
        use_gpu = device == "cuda"
        complexity = self.estimate_complexity(claim_text)

        # Start with profile defaults
        embedding = models.embedding_model
        dense = models.dense_model
        reranker = models.reranker
        cross_encoder = models.cross_encoder
        nli = models.nli_model

        routing_reasons: list[str] = [
            f"domain={profile.domain}",
            f"complexity={complexity}",
        ]

        # ----- Latency budget adjustments -----
        if latency_budget == "interactive":
            if not use_gpu:
                # CPU + interactive → use fastest models
                embedding = _FAST_EMBEDDING
                dense = _FAST_EMBEDDING
                reranker = _FAST_RERANKER
                cross_encoder = _FAST_RERANKER
                nli = _FAST_NLI
                routing_reasons.append("downgraded_for_cpu_interactive")
            else:
                # GPU + interactive → keep domain embedding, fast reranker
                reranker = _FAST_RERANKER
                cross_encoder = _FAST_RERANKER
                routing_reasons.append("fast_reranker_for_interactive")

        elif latency_budget == "thorough":
            # Thorough → use highest quality models available
            if use_gpu:
                nli = _QUALITY_NLI
                reranker = _QUALITY_RERANKER
                cross_encoder = _QUALITY_RERANKER
                routing_reasons.append("quality_models_for_thorough")
            else:
                # CPU thorough → keep domain defaults but use quality NLI
                routing_reasons.append("cpu_thorough_defaults")

        # ----- Confidence-driven escalation -----
        if confidence_level > 0 and confidence_level < 0.4 and latency_budget != "interactive":
            # Low confidence from previous attempt → escalate to stronger models
            nli = _QUALITY_NLI if use_gpu else _FAST_NLI
            reranker = _QUALITY_RERANKER
            cross_encoder = _QUALITY_RERANKER
            routing_reasons.append(
                f"escalated_models_due_to_low_confidence={confidence_level:.2f}"
            )

        # ----- Complexity adjustments -----
        if complexity == "complex" and latency_budget != "interactive":
            # Complex claims benefit from stronger NLI
            if use_gpu and nli != _QUALITY_NLI:
                nli = _QUALITY_NLI
                routing_reasons.append("complex_claim_escalated_nli")

        logger.info(
            "Model routing decision: domain=%s, complexity=%s, budget=%s, reasons=%s",
            profile.domain,
            complexity,
            latency_budget,
            "; ".join(routing_reasons),
        )

        return ModelRoutingDecision(
            domain=profile.domain,
            adapter=profile.adapter,
            embedding_model=embedding,
            dense_model=dense,
            sparse_model=models.sparse_model,
            retriever=models.retriever,
            cross_encoder=cross_encoder,
            reranker_model=reranker,
            nli_model=nli,
            sentence_transformer=models.sentence_transformer,
            entity_recognition_model=models.entity_recognition_model,
            classification_model=models.classification_model,
            retrieval_strategy=profile.retrieval_strategy,
            evidence_ranking_strategy=profile.evidence_ranking_strategy,
            confidence_strategy=profile.confidence_strategy,
            chunking_strategy=profile.chunking_strategy,
            device=device,
            use_gpu=use_gpu,
            claim_complexity=complexity,
            latency_budget=latency_budget,
            routing_reason="; ".join(routing_reasons),
        )
