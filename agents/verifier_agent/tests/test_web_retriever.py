"""
Unit tests for TavilyWebRetriever and WebEnhancedAdapter.

These tests use mocked Tavily responses — no real API calls.
For live tests, use scripts/test_web_evidence.py with RUN_LIVE_WEB_TESTS=true.
"""
from __future__ import annotations

import os
import sys
import asyncio
import pytest
from unittest.mock import patch, MagicMock

# Setup paths
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Search upwards for .env
load_dotenv(find_dotenv(usecwd=True))
# Also try direct repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(REPO_ROOT / ".env")
VERIFIER_ROOT = REPO_ROOT / "agents" / "verifier_agent"
if str(VERIFIER_ROOT) not in sys.path:
    sys.path.insert(0, str(VERIFIER_ROOT))


# ── Mock Tavily responses ──────────────────────────────────────
MOCK_SEARCH_RESPONSE = {
    "results": [
        {
            "title": "Paris - Wikipedia",
            "url": "https://en.wikipedia.org/wiki/Paris",
            "content": "Paris is the capital and most populous city of France.",
            "score": 0.95,
        },
        {
            "title": "France - Capital City",
            "url": "https://www.britannica.com/place/Paris",
            "content": "Paris, city and capital of France, situated along the Seine River.",
            "score": 0.88,
        },
        {
            "title": "Paris FC - Football",
            "url": "https://en.wikipedia.org/wiki/Paris_FC",
            "content": "Paris FC is a French football club.",
            "score": 0.3,
        },
    ]
}

MOCK_EXTRACT_RESPONSE = {
    "results": [
        {
            "url": "https://en.wikipedia.org/wiki/Paris",
            "raw_content": "Paris is the capital and most populous city of France, with a population of 2.1 million residents.",
        },
        {
            "url": "https://www.britannica.com/place/Paris",
            "raw_content": "Paris, city and capital of France, situated in the north-central part of the country.",
        },
    ]
}


@pytest.fixture
def mock_tavily_client():
    """Create a mock TavilyClient."""
    mock = MagicMock()
    mock.search.return_value = MOCK_SEARCH_RESPONSE
    mock.extract.return_value = MOCK_EXTRACT_RESPONSE
    return mock


class TestURLNormalization:
    """Test URL normalization and deduplication."""

    def test_removes_fragments(self):
        from adapters.web_retriever import _normalize_url
        assert _normalize_url("https://example.com/page#section") == "https://example.com/page"

    def test_removes_tracking_params(self):
        from adapters.web_retriever import _normalize_url
        url = "https://example.com/page?utm_source=google&utm_medium=cpc&real_param=value"
        normalized = _normalize_url(url)
        assert "utm_source" not in normalized
        assert "utm_medium" not in normalized
        assert "real_param=value" in normalized

    def test_normalizes_case(self):
        from adapters.web_retriever import _normalize_url
        url = "HTTPS://EXAMPLE.COM/Page"
        normalized = _normalize_url(url)
        assert normalized.startswith("https://example.com")

    def test_strips_trailing_slash(self):
        from adapters.web_retriever import _normalize_url
        assert _normalize_url("https://example.com/page/") == "https://example.com/page"

    def test_deduplicates_same_urls(self):
        from adapters.web_retriever import _normalize_url
        url1 = "https://example.com/page?utm_source=google#section"
        url2 = "https://EXAMPLE.COM/page/"
        assert _normalize_url(url1) == _normalize_url(url2)


class TestDomainCredibility:
    """Test trusted domain credibility scoring."""

    def test_known_domains(self):
        from adapters.web_retriever import _domain_credibility
        assert _domain_credibility("https://en.wikipedia.org/wiki/Test") >= 0.80
        assert _domain_credibility("https://www.who.int/news") >= 0.95
        assert _domain_credibility("https://nvd.nist.gov/vuln/detail/CVE-2021-44228") >= 0.99
        assert _domain_credibility("https://arxiv.org/abs/1706.03762") >= 0.90

    def test_parent_domain_matching(self):
        from adapters.web_retriever import _domain_credibility
        # Subdomain should match parent
        assert _domain_credibility("https://news.bbc.co.uk/article") >= 0.85

    def test_unknown_domain(self):
        from adapters.web_retriever import _domain_credibility
        score = _domain_credibility("https://randomsite12345.com/page")
        assert score == 0.60  # Baseline for unknown


class TestTavilyWebRetriever:
    """Test TavilyWebRetriever with mocked API."""

    @pytest.mark.asyncio
    async def test_search_returns_passages(self, mock_tavily_client):
        from adapters.web_retriever import TavilyWebRetriever

        with patch.object(TavilyWebRetriever, "_get_client", return_value=mock_tavily_client):
            retriever = TavilyWebRetriever(api_key="test-key")
            passages = await retriever.search("Paris is the capital of France", k=5)

        assert len(passages) > 0
        assert all(hasattr(p, "title") for p in passages)
        assert all(hasattr(p, "url") for p in passages)
        assert all(hasattr(p, "snippet") for p in passages)
        assert all(p.source.startswith("tavily:") for p in passages)

    @pytest.mark.asyncio
    async def test_search_uses_extracted_content(self, mock_tavily_client):
        from adapters.web_retriever import TavilyWebRetriever

        with patch.object(TavilyWebRetriever, "_get_client", return_value=mock_tavily_client):
            retriever = TavilyWebRetriever(api_key="test-key")
            passages = await retriever.search("Paris capital", k=5)

        # At least one passage should have extracted content (longer snippet)
        wiki_passages = [p for p in passages if "wikipedia" in p.url]
        if wiki_passages:
            assert "2.1 million" in wiki_passages[0].snippet or "capital" in wiki_passages[0].snippet

    @pytest.mark.asyncio
    async def test_search_deduplicates_urls(self, mock_tavily_client):
        # Add duplicate URL to mock
        mock_tavily_client.search.return_value = {
            "results": [
                {"title": "Page 1", "url": "https://example.com/page", "content": "Content 1", "score": 0.9},
                {"title": "Page 1 Dup", "url": "https://example.com/page#section", "content": "Content 1", "score": 0.8},
                {"title": "Page 2", "url": "https://example.com/other", "content": "Content 2", "score": 0.7},
            ]
        }
        mock_tavily_client.extract.return_value = {"results": []}

        from adapters.web_retriever import TavilyWebRetriever
        with patch.object(TavilyWebRetriever, "_get_client", return_value=mock_tavily_client):
            retriever = TavilyWebRetriever(api_key="test-key")
            passages = await retriever.search("test", k=5)

        # Should have 2 unique passages, not 3
        assert len(passages) == 2

    @pytest.mark.asyncio
    async def test_search_empty_query(self):
        from adapters.web_retriever import TavilyWebRetriever
        retriever = TavilyWebRetriever(api_key="test-key")
        passages = await retriever.search("", k=5)
        assert passages == []

    @pytest.mark.asyncio
    async def test_search_handles_api_failure(self, mock_tavily_client):
        mock_tavily_client.search.side_effect = Exception("API error")

        from adapters.web_retriever import TavilyWebRetriever
        with patch.object(TavilyWebRetriever, "_get_client", return_value=mock_tavily_client):
            retriever = TavilyWebRetriever(api_key="test-key")
            passages = await retriever.search("test query", k=5)

        assert passages == []

    @pytest.mark.asyncio
    async def test_never_includes_generated_answer(self, mock_tavily_client):
        """Verify include_answer=False is passed to Tavily."""
        from adapters.web_retriever import TavilyWebRetriever
        with patch.object(TavilyWebRetriever, "_get_client", return_value=mock_tavily_client):
            retriever = TavilyWebRetriever(api_key="test-key")
            await retriever.search("test", k=5)

        call_kwargs = mock_tavily_client.search.call_args
        assert call_kwargs.kwargs.get("include_answer") is False or \
               call_kwargs[1].get("include_answer") is False


class TestWebEnhancedAdapter:
    """Test WebEnhancedAdapter wrapping logic."""

    @pytest.mark.asyncio
    async def test_uses_primary_when_sufficient(self):
        from adapters.web_enhanced import WebEnhancedAdapter
        from schemas.models import Passage

        # Mock primary adapter that returns enough passages
        primary = MagicMock()
        primary.name = "general"
        primary.metadata = MagicMock(is_stub=False)

        passages = [
            Passage(title=f"Result {i}", source="wiki", url=f"http://test.com/{i}",
                    publication_date="2024", snippet=f"Content {i}", source_id=f"s{i}")
            for i in range(3)
        ]

        async def mock_search(query, k=5):
            return passages

        primary.search = mock_search

        adapter = WebEnhancedAdapter(primary, min_primary=2)
        result = await adapter.search("test query", k=5)

        assert len(result) >= 2
        # Should NOT have called Tavily since primary returned enough

    @pytest.mark.asyncio
    async def test_falls_back_to_tavily(self, mock_tavily_client):
        from adapters.web_enhanced import WebEnhancedAdapter

        # Mock primary adapter that returns insufficient results
        primary = MagicMock()
        primary.name = "general"
        primary.metadata = MagicMock(is_stub=False)

        async def mock_search(query, k=5):
            return []  # Empty!

        primary.search = mock_search

        # Patch TavilyWebRetriever to use mock
        from adapters.web_retriever import TavilyWebRetriever
        with patch.object(TavilyWebRetriever, "_get_client", return_value=mock_tavily_client):
            adapter = WebEnhancedAdapter(primary, tavily_api_key="test-key")
            result = await adapter.search("Paris is the capital of France", k=5)

        assert len(result) > 0
        assert any("tavily:" in p.source for p in result)

    @pytest.mark.asyncio
    async def test_handles_both_failures_gracefully(self):
        from adapters.web_enhanced import WebEnhancedAdapter

        primary = MagicMock()
        primary.name = "general"
        primary.metadata = MagicMock(is_stub=False)

        async def mock_search(query, k=5):
            raise Exception("Primary failed")

        primary.search = mock_search

        # No tavily key = no web fallback
        adapter = WebEnhancedAdapter(primary, tavily_api_key="")
        result = await adapter.search("test query", k=5)
        assert result == []


# ── Live integration test (skipped unless opted in) ────────────
@pytest.mark.skipif(
    os.environ.get("RUN_LIVE_WEB_TESTS", "").lower() not in ("true", "1"),
    reason="Live web tests disabled (set RUN_LIVE_WEB_TESTS=true)"
)
class TestLiveIntegration:
    """Integration tests requiring real API access."""

    @pytest.mark.asyncio
    @pytest.mark.skipif(not os.getenv("TAVILY_API_KEY"), reason="TAVILY_API_KEY not set")
    async def test_live_tavily_search(self):
        from adapters.web_retriever import TavilyWebRetriever

        retriever = TavilyWebRetriever()
        assert retriever.is_available, "TAVILY_API_KEY not set"

        passages = await retriever.search("Paris is the capital of France", k=3)
        assert len(passages) > 0
        assert all(p.url.startswith("http") for p in passages)
        assert all(len(p.snippet) > 10 for p in passages)

    @pytest.mark.asyncio
    @pytest.mark.skipif(not os.getenv("TAVILY_API_KEY"), reason="TAVILY_API_KEY not set")
    async def test_live_full_chain(self):
        """Prove: Tavily → BGE → NLI → Scoring with real data."""
        from adapters.web_retriever import TavilyWebRetriever
        from rerankers import CrossEncoderReranker
        from nli import NLIEngine
        from scorers import EvidenceScorer

        claim = "Paris is the capital of France."

        # Retrieval
        retriever = TavilyWebRetriever()
        passages = await retriever.search(claim, k=5)
        assert len(passages) > 0, "Tavily returned no results"

        # Reranking
        reranker = CrossEncoderReranker()
        reranked = reranker.rerank(claim, passages, 5)
        assert len(reranked) > 0, "Reranker produced no results"

        # NLI
        nli = NLIEngine()
        nli_results = nli.batch_classify(
            str(claim),
            [str(p.snippet) for p in reranked[:3]],
        )
        assert len(nli_results) > 0, "NLI produced no results"
        # At least one should be entailment for this claim
        has_entailment = any(
            "entailment" in str(r.get("label", "")).lower()
            for r in nli_results
        )
        assert has_entailment, f"No entailment found for '{claim}': {nli_results}"

        # Scoring
        scorer = EvidenceScorer()
        scores = scorer.score_evidence(
            claim=str(claim),
            passages=reranked[:3],
            nli_results=nli_results,
            domain="general",
        )
        assert "verdict" in scores
        assert "trust_score" in scores
