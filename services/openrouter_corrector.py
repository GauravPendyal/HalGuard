"""Server-side OpenRouter generator adapter for the evidence-bound Corrector."""
from __future__ import annotations

import os
import time
from typing import Optional

import httpx

from agents.corrector_agent.corrector.config import (
    DEFAULT_CORRECTOR_OPENROUTER_MODEL,
    CorrectorConfig,
)
from agents.corrector_agent.corrector.model_client import Generator
from services.base_llm_service import BaseLLMConfig


class OpenRouterModelNotFoundError(RuntimeError):
    """Raised when the specified model or endpoint returns 404 (non-retryable configuration failure)."""
    pass


class OpenRouterCorrectorGenerator(Generator):
    """Generate one strictly structured correction candidate through OpenRouter.

    The Corrector's existing parser, evidence-alignment checks, bounded retries,
    deterministic reconstruction, re-verifier, and final Judge remain in charge.
    This adapter replaces unavailable local model weights with an evidence-grounded
    OpenRouter model call.
    """

    kind = "openrouter_grounded_corrector"

    def __init__(
        self,
        model: Optional[str] = None,
        *,
        config: Optional[CorrectorConfig] = None,
    ) -> None:
        base = BaseLLMConfig()
        self.api_key = (
            os.environ.get("HG_CORRECTOR_API_KEY")
            or os.environ.get("OPENROUTER_API_KEY")
            or base.api_key
        )
        self.base_url = (
            os.environ.get("HG_CORRECTOR_BASE_URL")
            or os.environ.get("OPENROUTER_BASE_URL")
            or base.base_url
        ).rstrip("/")

        # Deterministic hierarchy:
        # 1. HG_CORRECTOR_OPENROUTER_MODEL env var
        # 2. explicit model passed to constructor
        # 3. config.openrouter_model if config provided
        # 4. DEFAULT_CORRECTOR_OPENROUTER_MODEL
        # (Does NOT inherit Base LLM model unless explicitly configured)
        env_model = os.environ.get("HG_CORRECTOR_OPENROUTER_MODEL", "").strip()
        if env_model:
            self.model = env_model
        elif model and model.strip():
            self.model = model.strip()
        elif config and getattr(config, "openrouter_model", None):
            self.model = config.openrouter_model.strip()
        else:
            self.model = DEFAULT_CORRECTOR_OPENROUTER_MODEL

        self.timeout = float(
            os.environ.get(
                "HG_CORRECTOR_TIMEOUT_SECONDS",
                os.environ.get("OPENROUTER_TIMEOUT_SECONDS", "30"),
            )
        )
        self.max_tokens = int(
            os.environ.get(
                "HG_CORRECTOR_MAX_NEW_TOKENS",
                str(getattr(config, "max_new_tokens", 256)),
            )
        )
        self.max_retries = int(os.environ.get("HG_CORRECTOR_NETWORK_RETRIES", "2"))
        self.http_referer = base.http_referer
        self.x_title = base.x_title
        self.provider_name = "openrouter"
        self.last_status: str | None = None

    def _sanitize_error(self, message: str) -> str:
        """Strip sensitive credentials from error messages."""
        if self.api_key and self.api_key in message:
            return message.replace(self.api_key, "[REDACTED]")
        return message

    def generate(self, system_text: str, prompt_text: str) -> str:
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
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

        attempts = 0
        max_attempts = max(1, self.max_retries + 1)
        format_retry_done = False

        while attempts < max_attempts:
            attempts += 1
            try:
                response = httpx.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                )
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempts < max_attempts:
                    time.sleep(0.5 * attempts)
                    continue
                raise RuntimeError(
                    self._sanitize_error(
                        f"OpenRouter network/timeout error after {attempts} attempts: {type(exc).__name__}"
                    )
                ) from exc

            self.last_status = f"HTTP {response.status_code}"

            # 404: Configuration error / invalid model identifier. Non-retryable.
            if response.status_code == 404:
                raise OpenRouterModelNotFoundError(
                    f"OpenRouter model '{self.model}' not found (HTTP 404). "
                    f"Ensure HG_CORRECTOR_OPENROUTER_MODEL is configured with a valid available model."
                )

            # 401 / 403: Authentication or authorization failure. Non-retryable.
            if response.status_code in (401, 403):
                raise RuntimeError(
                    f"OpenRouter authentication failed ({self.last_status}). Check API credentials."
                )

            # 400: Format fallback if model does not support response_format
            if response.status_code == 400 and not format_retry_done and "response_format" in payload:
                payload.pop("response_format", None)
                format_retry_done = True
                # retry immediately with popped response_format without consuming network retry
                attempts -= 1
                continue

            # 429 / 5xx: Transient error. Retry with bounded backoff
            if response.status_code in (429, 500, 502, 503, 504):
                if attempts < max_attempts:
                    time.sleep(0.5 * attempts)
                    continue
                raise RuntimeError(
                    f"OpenRouter transient error ({self.last_status}) persisted after {attempts} attempts"
                )

            # Other 4xx client errors: raise immediately without retrying
            if 400 <= response.status_code < 500:
                raise RuntimeError(
                    f"OpenRouter client error ({self.last_status})"
                )

            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(self._sanitize_error(f"OpenRouter HTTP error: {self.last_status}")) from exc

            try:
                data = response.json()
            except Exception as exc:
                raise RuntimeError(f"OpenRouter returned malformed JSON: {exc}") from exc

            choices = data.get("choices") or []
            content = ((choices[0] if choices else {}).get("message") or {}).get("content")
            if not isinstance(content, str) or not content.strip():
                raise RuntimeError("OpenRouter returned no correction content")
            return content.strip()

        raise RuntimeError(f"OpenRouter request exhausted retries ({self.last_status})")
