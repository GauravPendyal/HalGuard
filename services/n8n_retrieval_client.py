"""
HalluciGuard — n8n Retrieval Service V2 Client.

Connects the Python HalluciGuard verification engine to the n8n Retrieval Service V2
as an external evidence retrieval boundary.

Architectural Guarantees:
  1. n8n is purely a RETRIEVAL SERVICE, not the authoritative verifier.
  2. All n8n output is normalized into standard HalluciGuard `Passage` models.
  3. adapter_score is preserved as source_confidence_hint; BGE reranking runs in Python.
  4. Any verdict/confidence fields from n8n are retained purely as diagnostics (legacy_n8n_output).
  5. Timeouts and network errors fail gracefully without crashing LangGraph.
  6. Supports both AUTH_MODE='header' (default, X-API-Key or custom header) and AUTH_MODE='none'.
"""
from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

# Ensure verifier_agent is in sys.path for schema imports
VERIFIER_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "agents", "verifier_agent")
)
if VERIFIER_DIR not in sys.path:
    sys.path.insert(0, VERIFIER_DIR)

from schemas.models import Passage
from schemas.retrieval_trace import N8NTrace

logger = logging.getLogger(__name__)


@dataclass
class N8NRetrievalResult:
    """Standardized response from the n8n Retrieval Client."""
    success: bool
    passages: List[Passage] = field(default_factory=list)
    trace: Optional[N8NTrace] = None
    raw_response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    http_status: Optional[int] = None


class N8NRetrievalClient:
    """Async HTTP Client for n8n Retrieval Service V2."""

    def __init__(
        self,
        webhook_url: Optional[str] = None,
        health_url: Optional[str] = None,
        auth_mode: Optional[str] = None,
        header_name: Optional[str] = None,
        webhook_secret: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ) -> None:
        self.webhook_url = (
            webhook_url
            or os.environ.get(
                "N8N_RETRIEVAL_WEBHOOK_URL",
                "https://manju200609.app.n8n.cloud/webhook/halluciguard-verify-v2",
            )
        ).strip()
        self.health_url = (
            health_url
            or os.environ.get(
                "N8N_HEALTH_WEBHOOK_URL",
                "https://manju200609.app.n8n.cloud/webhook/halluciguard-health",
            )
        ).strip()
        self.auth_mode = (
            auth_mode
            or os.environ.get("N8N_AUTH_MODE", "header")
        ).strip().lower()
        self.header_name = (
            header_name
            or os.environ.get("N8N_HEADER_NAME", "X-API-Key")
        ).strip()
        self.webhook_secret = (
            webhook_secret
            or os.environ.get("N8N_WEBHOOK_SECRET", "")
        ).strip()
        
        env_timeout = os.environ.get("N8N_TIMEOUT_SECONDS")
        self.timeout_seconds = (
            float(timeout_seconds)
            if timeout_seconds is not None
            else (float(env_timeout) if env_timeout else 60.0)
        )

    def _build_headers(self) -> Dict[str, str]:
        """Construct request headers respecting the configured AUTH_MODE and header name."""
        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "User-Agent": "HalluciGuard-Verifier/2.0 (n8n-client)",
        }
        if self.auth_mode == "header" and self.webhook_secret:
            headers[self.header_name] = self.webhook_secret
        return headers

    def _get_timeout(self) -> httpx.Timeout:
        """Create granular timeouts with read timeout >= 45s for deep retrieval workflows."""
        read_to = max(45.0, self.timeout_seconds)
        return httpx.Timeout(
            timeout=max(self.timeout_seconds, read_to),
            connect=min(10.0, self.timeout_seconds),
            read=read_to,
            write=10.0,
            pool=10.0,
        )

    async def check_health(self) -> Dict[str, Any]:
        """Query n8n health webhook endpoint with authentication headers."""
        start_time = time.time()
        headers = self._build_headers()
        try:
            async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
                resp = await client.get(self.health_url, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)
                
                is_ok = 200 <= resp.status_code < 300
                result: Dict[str, Any] = {
                    "healthy": is_ok,
                    "status_code": resp.status_code,
                    "latency_ms": latency_ms,
                    "url": self.health_url,
                }
                try:
                    result["data"] = resp.json()
                except Exception:
                    result["text"] = resp.text[:200]
                return result
        except Exception as exc:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.warning("n8n health check failed: %s", exc)
            return {
                "healthy": False,
                "status_code": None,
                "latency_ms": latency_ms,
                "url": self.health_url,
                "error": f"{type(exc).__name__}: {str(exc)}",
            }

    @staticmethod
    def _normalize_item_to_passage(item: Dict[str, Any], idx: int) -> Optional[Passage]:
        """Convert an individual raw evidence dictionary to a standard Passage model."""
        if not isinstance(item, dict) or not item:
            return None

        raw_title = str(item.get("title") or item.get("source_title") or "").strip()
        source = str(item.get("source") or item.get("source_type") or item.get("source_id") or "n8n_retrieval").strip()
        url = str(item.get("url") or item.get("link") or "").strip()
        snippet = str(item.get("snippet") or item.get("content") or item.get("text") or item.get("extract") or "").strip()
        pub_date = str(item.get("published_at") or item.get("publication_date") or item.get("date") or "unknown").strip()
        source_id = str(item.get("source_id") or f"{source}_{idx+1}").strip()

        if not snippet and not raw_title and not url:
            return None

        title = raw_title or f"Evidence Passage {idx+1}"

        # adapter_score is an upstream heuristic (token overlap / rank), NOT a BGE score.
        raw_score = item.get("adapter_score") or item.get("score") or item.get("confidence") or 0.70
        try:
            adapter_score = float(raw_score)
        except (ValueError, TypeError):
            adapter_score = 0.70

        return Passage(
            title=title,
            source=source,
            url=url,
            publication_date=pub_date,
            snippet=snippet,
            source_id=source_id,
            relevance_score=0.0,  # Explicitly 0.0 so Python BGE Reranker computes the true relevance
            source_confidence_hint=round(max(0.0, min(1.0, adapter_score)), 4),
        )

    def normalize_evidence_payload(
        self,
        data: Any,
        request_id: str,
        retrieval_mode: str,
        latency_ms: int,
    ) -> N8NRetrievalResult:
        """Validate and normalize arbitrary n8n JSON response into typed Passage models and N8NTrace."""
        raw_evidence: List[Any] = []
        legacy_verdict: Optional[Dict[str, Any]] = None
        counts_dict: Optional[Dict[str, Any]] = None
        perf_dict: Optional[Dict[str, Any]] = None
        primary_trace_dict: Optional[Dict[str, Any]] = None
        tavily_trace_dict: Optional[Dict[str, Any]] = None
        stage_traces_list: List[Dict[str, Any]] = []
        workflow_ver: str = "2.0.0"
        resp_req_id: str = request_id
        tavily_called: bool = False

        if isinstance(data, list):
            raw_evidence = data
        elif isinstance(data, dict):
            resp_req_id = str(data.get("request_id") or request_id)
            workflow_ver = str(data.get("workflow_version") or "2.0.0")
            
            # V2 nested metadata pass-through
            counts_dict = data.get("counts") if isinstance(data.get("counts"), dict) else None
            perf_dict = data.get("performance") if isinstance(data.get("performance"), dict) else None
            
            retrieval_obj = data.get("retrieval") if isinstance(data.get("retrieval"), dict) else {}
            if isinstance(retrieval_obj.get("primary"), dict):
                primary_trace_dict = retrieval_obj["primary"]
            if isinstance(retrieval_obj.get("tavily"), dict):
                tavily_trace_dict = retrieval_obj["tavily"]
                tavily_called = bool(tavily_trace_dict.get("called", False))

            if isinstance(data.get("trace"), list):
                stage_traces_list = data["trace"]

            # Capture legacy/diagnostic verdict fields if present (V2 emits authoritative_verdict: null)
            if any(k in data for k in ("verdict", "confidence", "support", "contradiction", "authoritative_verdict")):
                legacy_verdict = {
                    k: data[k]
                    for k in ("verdict", "confidence", "support", "contradiction", "authoritative_verdict", "note")
                    if k in data and data[k] is not None
                }

            if isinstance(data.get("evidence"), list):
                raw_evidence = data["evidence"]
            elif isinstance(data.get("passages"), list):
                raw_evidence = data["passages"]
            elif isinstance(data.get("results"), list):
                raw_evidence = data["results"]
            elif isinstance(data.get("data"), list):
                raw_evidence = data["data"]
            elif isinstance(data.get("data"), dict) and isinstance(data["data"].get("evidence"), list):
                raw_evidence = data["data"]["evidence"]
            else:
                # Single object evidence
                if data.get("snippet") or data.get("content") or data.get("title"):
                    raw_evidence = [data]
        else:
            return N8NRetrievalResult(
                success=False,
                passages=[],
                error=f"Malformed n8n response: expected JSON object or array, got {type(data).__name__}",
            )

        passages: List[Passage] = []
        primary_sources: List[str] = []

        for idx, item in enumerate(raw_evidence):
            if isinstance(item, dict):
                passage = self._normalize_item_to_passage(item, idx)
                if passage:
                    passages.append(passage)
                    if passage.source and passage.source not in primary_sources:
                        primary_sources.append(passage.source)

        if not tavily_called:
            tavily_called = any("tavily" in s.lower() or "web" in s.lower() for s in primary_sources)

        eff_latency = (
            perf_dict.get("total_latency_ms")
            if (perf_dict and isinstance(perf_dict.get("total_latency_ms"), (int, float)) and perf_dict["total_latency_ms"] > 0)
            else latency_ms
        )

        trace = N8NTrace(
            called=True,
            workflow_version=workflow_ver,
            request_id=resp_req_id,
            latency_ms=int(eff_latency),
            retrieval_mode=retrieval_mode,
            primary_sources=primary_sources,
            tavily_called=tavily_called,
            evidence_count=len(passages),
            counts=counts_dict,
            performance=perf_dict,
            primary_trace=primary_trace_dict,
            tavily_trace=tavily_trace_dict,
            stage_traces=stage_traces_list,
            error=None,
            legacy_n8n_output=legacy_verdict,
        )

        return N8NRetrievalResult(
            success=True,
            passages=passages,
            trace=trace,
            raw_response=data if isinstance(data, dict) else {"items": data},
        )

    async def retrieve_evidence(
        self,
        claim: str,
        domain: Optional[str] = "general",
        retrieval_mode: str = "hybrid",
        force_tavily: bool = False,
        max_results: int = 5,
        request_id: Optional[str] = None,
    ) -> N8NRetrievalResult:
        """
        Execute POST request to n8n Retrieval Webhook and return normalized evidence passages.
        
        Guaranteed to not raise unhandled exceptions; returns controlled N8NRetrievalResult.
        """
        req_id = request_id or str(uuid.uuid4())
        eff_domain = domain or "general"
        
        # Effective mode calculation
        eff_mode = "tavily_only" if force_tavily else (retrieval_mode or "hybrid")

        payload = {
            "claim": claim,
            "domain": eff_domain,
            "retrieval_mode": eff_mode,
            "force_tavily": force_tavily,
            "max_results": max_results,
            "request_id": req_id,
        }

        headers = self._build_headers()
        start_time = time.time()

        logger.info(
            "[N8N Client] Dispatching retrieval request %s (mode=%s, domain=%s, auth=%s)",
            req_id,
            eff_mode,
            eff_domain,
            self.auth_mode,
        )

        try:
            async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                    headers=headers,
                )
                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code != 200:
                    err_msg = (
                        f"n8n webhook returned HTTP {response.status_code}: {response.text[:200]}"
                    )
                    logger.warning("[N8N Client] %s", err_msg)
                    return N8NRetrievalResult(
                        success=False,
                        passages=[],
                        http_status=response.status_code,
                        error=err_msg,
                        trace=N8NTrace(
                            called=True,
                            workflow_version="2.0.0",
                            request_id=req_id,
                            latency_ms=latency_ms,
                            retrieval_mode=eff_mode,
                            error=err_msg,
                        ),
                    )

                try:
                    data = response.json()
                except Exception as json_err:
                    err_msg = f"n8n response is not valid JSON: {str(json_err)}"
                    logger.error("[N8N Client] %s", err_msg)
                    return N8NRetrievalResult(
                        success=False,
                        passages=[],
                        http_status=response.status_code,
                        error=err_msg,
                        trace=N8NTrace(
                            called=True,
                            workflow_version="2.0.0",
                            request_id=req_id,
                            latency_ms=latency_ms,
                            retrieval_mode=eff_mode,
                            error=err_msg,
                        ),
                    )

                result = self.normalize_evidence_payload(
                    data=data,
                    request_id=req_id,
                    retrieval_mode=eff_mode,
                    latency_ms=latency_ms,
                )
                result.http_status = response.status_code
                return result

        except httpx.TimeoutException as te:
            latency_ms = int((time.time() - start_time) * 1000)
            err_msg = f"n8n retrieval timed out after {self.timeout_seconds}s: {type(te).__name__}"
            logger.error("[N8N Client] %s", err_msg)
            return N8NRetrievalResult(
                success=False,
                passages=[],
                error=err_msg,
                trace=N8NTrace(
                    called=True,
                    workflow_version="2.0.0",
                    request_id=req_id,
                    latency_ms=latency_ms,
                    retrieval_mode=eff_mode,
                    error=err_msg,
                ),
            )
        except Exception as exc:
            latency_ms = int((time.time() - start_time) * 1000)
            err_msg = f"n8n retrieval communication error: {type(exc).__name__} — {str(exc)[:200]}"
            logger.error("[N8N Client] %s", err_msg, exc_info=True)
            return N8NRetrievalResult(
                success=False,
                passages=[],
                error=err_msg,
                trace=N8NTrace(
                    called=True,
                    workflow_version="2.0.0",
                    request_id=req_id,
                    latency_ms=latency_ms,
                    retrieval_mode=eff_mode,
                    error=err_msg,
                ),
            )
