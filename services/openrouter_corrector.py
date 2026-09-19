"""Server-side OpenRouter generator adapter for the evidence-bound Corrector."""
from __future__ import annotations

import os
import httpx

from agents.corrector_agent.corrector.model_client import Generator
from services.base_llm_service import BaseLLMConfig


class OpenRouterCorrectorGenerator(Generator):
    """Generate one strictly structured correction candidate through OpenRouter.

    The Corrector's existing parser, evidence-alignment checks, bounded retries,
    deterministic reconstruction, re-verifier, and final Judge remain in charge.
    This adapter only replaces unavailable local model weights.
    """

    kind = "openrouter_grounded_corrector"

    def __init__(self) -> None:
        base = BaseLLMConfig()
        self.api_key = base.api_key
        self.base_url = base.base_url.rstrip("/")
        self.model = os.environ.get("HG_CORRECTOR_OPENROUTER_MODEL", base.model)
        self.timeout = float(os.environ.get("HG_CORRECTOR_TIMEOUT_SECONDS", "30"))
        self.max_tokens = int(os.environ.get("HG_CORRECTOR_MAX_NEW_TOKENS", "256"))
        self.http_referer = base.http_referer
        self.x_title = base.x_title
        self.provider_name = "openrouter"
        self.last_status: str | None = None

    def generate(self, system_text: str, prompt_text: str) -> str:
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if self.http_referer:
            headers["HTTP-Referer"] = self.http_referer
        if self.x_title:
            headers["X-Title"] = self.x_title
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_text},
                {"role": "user", "content": prompt_text},
            ],
            "temperature": 0,
            "max_tokens": self.max_tokens,
            "response_format": {"type": "json_object"},
        }
        response = httpx.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=self.timeout,
        )
        # Some OpenRouter models reject the optional response_format field. The
        # Corrector still enforces strict JSON parsing and evidence alignment,
        # so retry once without that provider hint when it is unsupported.
        if response.status_code == 400:
            payload.pop("response_format", None)
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=self.timeout,
            )
        self.last_status = f"HTTP {response.status_code}"
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices") or []
        content = ((choices[0] if choices else {}).get("message") or {}).get("content")
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("OpenRouter returned no correction content")
        return content.strip()
