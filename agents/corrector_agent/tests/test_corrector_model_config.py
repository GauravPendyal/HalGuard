"""Tests for Corrector OpenRouter model configuration, hierarchy, retry behavior, and failure semantics.

Covers Task 1 requirements:
    10.A Explicit valid Corrector model configuration is selected.
    10.B Model configuration precedence is deterministic and does not inherit Base LLM model.
    10.C Invalid/unavailable model produces a clear failure.
    10.D HTTP 404 is not retried unnecessarily.
    10.E Corrector failure remains UNRESOLVED/FAILED rather than COMPLETED.
    10.F Original sentence is preserved after failed generation.
    10.G Existing successful Corrector behavior remains intact.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest

ROOT_DIR = str(Path(__file__).resolve().parents[3])
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from agents.corrector_agent.corrector import CorrectorAgent
from agents.corrector_agent.corrector.config import (
    DEFAULT_CORRECTOR_OPENROUTER_MODEL,
    CorrectorConfig,
)
from orchestration.schemas import (
    CorrectionRequest,
    ExecutionStatus,
    ValidationStatus,
)
from services.openrouter_corrector import (
    OpenRouterCorrectorGenerator,
    OpenRouterModelNotFoundError,
)


class TestCorrectorModelConfigurationPrecedence:
    """Requirement 10.A & 10.B: Configuration precedence is explicit and deterministic."""

    def test_default_model_is_project_default(self, monkeypatch: pytest.MonkeyPatch):
        """When no env var or explicit config is passed, use documented project default."""
        monkeypatch.delenv("HG_CORRECTOR_OPENROUTER_MODEL", raising=False)
        monkeypatch.setenv("OPENROUTER_MODEL", "arbitrary/base-model-that-must-not-be-used")
        monkeypatch.setenv("HALLUCIGUARD_LLM_MODEL", "another/base-model")

        gen = OpenRouterCorrectorGenerator()
        assert gen.model == DEFAULT_CORRECTOR_OPENROUTER_MODEL
        assert gen.model == "qwen/qwen-2.5-7b-instruct"
        # Must not accidentally inherit the base LLM model!
        assert gen.model != "arbitrary/base-model-that-must-not-be-used"
        assert gen.model != "another/base-model"

    def test_config_object_openrouter_model(self, monkeypatch: pytest.MonkeyPatch):
        """Explicit config.openrouter_model takes precedence over project default."""
        monkeypatch.delenv("HG_CORRECTOR_OPENROUTER_MODEL", raising=False)
        cfg = CorrectorConfig(openrouter_model="custom/corrector-model-from-cfg")

        gen = OpenRouterCorrectorGenerator(config=cfg)
        assert gen.model == "custom/corrector-model-from-cfg"

    def test_explicit_constructor_model_overrides_config(self, monkeypatch: pytest.MonkeyPatch):
        """Explicit constructor argument overrides config.openrouter_model."""
        monkeypatch.delenv("HG_CORRECTOR_OPENROUTER_MODEL", raising=False)
        cfg = CorrectorConfig(openrouter_model="from-config")

        gen = OpenRouterCorrectorGenerator(model="from-constructor", config=cfg)
        assert gen.model == "from-constructor"

    def test_env_var_overrides_all(self, monkeypatch: pytest.MonkeyPatch):
        """HG_CORRECTOR_OPENROUTER_MODEL environment variable has highest precedence."""
        monkeypatch.setenv("HG_CORRECTOR_OPENROUTER_MODEL", "from-env-var")
        cfg = CorrectorConfig(openrouter_model="from-config")

        gen = OpenRouterCorrectorGenerator(model="from-constructor", config=cfg)
        assert gen.model == "from-env-var"

    def test_corrector_config_from_env_loads_openrouter_model(self, monkeypatch: pytest.MonkeyPatch):
        """CorrectorConfig.from_env() reads HG_CORRECTOR_OPENROUTER_MODEL."""
        monkeypatch.setenv("HG_CORRECTOR_OPENROUTER_MODEL", "qwen/custom-corrector")
        cfg = CorrectorConfig.from_env()
        assert cfg.openrouter_model == "qwen/custom-corrector"


class TestOpenRouterRetryBehavior:
    """Requirement 10.C, 10.D & Goal 7: 404 is not retried; transient errors are bounded."""

    def test_http_404_fails_immediately_without_retry(self, monkeypatch: pytest.MonkeyPatch):
        """HTTP 404 indicates an unavailable/invalid model. It must fail immediately without retrying."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-fake")
        # Clear the env override so the explicit constructor model is used (documented precedence).
        monkeypatch.delenv("HG_CORRECTOR_OPENROUTER_MODEL", raising=False)
        gen = OpenRouterCorrectorGenerator(model="nonexistent/model")

        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = '{"error": {"message": "No endpoints found for nonexistent/model"}}'

        with patch("httpx.post", return_value=mock_resp) as mock_post:
            with pytest.raises(OpenRouterModelNotFoundError) as exc_info:
                gen.generate("System prompt", "User prompt")

            assert "404" in str(exc_info.value)
            assert "nonexistent/model" in str(exc_info.value)
            # CRITICAL: 404 must be called EXACTLY ONCE — no retries!
            assert mock_post.call_count == 1

    def test_http_401_fails_immediately_without_retry(self, monkeypatch: pytest.MonkeyPatch):
        """HTTP 401 indicates invalid auth credentials and must fail immediately without retrying."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-bad-key")
        gen = OpenRouterCorrectorGenerator()

        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = '{"error": {"message": "Invalid API key"}}'

        with patch("httpx.post", return_value=mock_resp) as mock_post:
            with pytest.raises(RuntimeError) as exc_info:
                gen.generate("System prompt", "User prompt")

            assert "authentication failed" in str(exc_info.value).lower()
            assert mock_post.call_count == 1

    def test_transient_503_retries_and_succeeds(self, monkeypatch: pytest.MonkeyPatch):
        """HTTP 503 is a transient error. Generator retries and succeeds when subsequent attempt returns 200."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-fake")
        gen = OpenRouterCorrectorGenerator()

        resp_503 = MagicMock()
        resp_503.status_code = 503

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.raise_for_status = MagicMock()
        resp_200.json.return_value = {
            "choices": [{"message": {"content": '{"status": "repaired"}'}}]
        }

        with patch("httpx.post", side_effect=[resp_503, resp_200]) as mock_post, \
             patch("time.sleep") as mock_sleep:
            content = gen.generate("System prompt", "User prompt")
            assert content == '{"status": "repaired"}'
            assert mock_post.call_count == 2
            assert mock_sleep.call_count == 1

    def test_transient_500_exhausts_retries(self, monkeypatch: pytest.MonkeyPatch):
        """HTTP 500 retries up to bounded max_retries then raises clear error."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-fake")
        gen = OpenRouterCorrectorGenerator()
        # default max_retries is 2 -> total 3 attempts

        resp_500 = MagicMock()
        resp_500.status_code = 500

        with patch("httpx.post", return_value=resp_500) as mock_post, \
             patch("time.sleep"):
            with pytest.raises(RuntimeError) as exc_info:
                gen.generate("System prompt", "User prompt")

            assert "persisted after 3 attempts" in str(exc_info.value)
            assert mock_post.call_count == 3

    def test_api_key_never_leaked_in_exceptions(self, monkeypatch: pytest.MonkeyPatch):
        """Sensitive API key is never exposed in exception messages (Requirement 8)."""
        secret_key = "sk-or-v1-SUPER-SECRET-KEY-12345"
        monkeypatch.setenv("OPENROUTER_API_KEY", secret_key)
        gen = OpenRouterCorrectorGenerator()

        # Simulate exception containing the secret key
        with patch("httpx.post", side_effect=httpx.ConnectError(f"Failed to connect using {secret_key}")), \
             patch("time.sleep"):
            with pytest.raises(RuntimeError) as exc_info:
                gen.generate("System prompt", "User prompt")

            assert secret_key not in str(exc_info.value)


class TestPipelineFailureSemantics:
    """Requirement 10.E, 10.F, 10.G: Pipeline preserves original text on generation failure."""

    def test_404_generation_failure_results_in_unresolved_and_original_preserved(
        self,
        monkeypatch: pytest.MonkeyPatch,
        valid_correction_request: CorrectionRequest,
    ):
        """When OpenRouter returns 404:
        - Generation fails
        - Pipeline terminates with UNRESOLVED or FAILED status (never COMPLETED)
        - Validation status is not VALID
        - Original sentence is preserved
        """
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-fake")
        gen = OpenRouterCorrectorGenerator(model="invalid/model-404")

        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = '{"error": {"message": "No endpoints found for invalid/model-404"}}'

        with patch("httpx.post", return_value=mock_resp):
            agent = CorrectorAgent(generator=gen)
            result = agent.correct(valid_correction_request)

            # Contract verification:
            assert result.status in (
                ExecutionStatus.TERMINATED_UNRESOLVED,
                ExecutionStatus.FAILED,
                ExecutionStatus.DEGRADED,
            )
            assert result.status != ExecutionStatus.COMPLETED
            assert result.validation_status != ValidationStatus.VALID

            # Original text is preserved; hallucination is NOT accepted
            assert result.corrected_text == valid_correction_request.original_response
            assert len(result.changed_claims) == 1
            assert result.changed_claims[0]["action"] == "unresolved"
            assert result.changed_claims[0]["corrected"] == ""

    def test_successful_openrouter_generation_produces_completed_correction(
        self,
        monkeypatch: pytest.MonkeyPatch,
        valid_correction_request: CorrectionRequest,
    ):
        """When OpenRouter returns valid JSON correction conforming to evidence:
        - Generation succeeds
        - Pipeline produces COMPLETED and VALID result
        - Corrected sentence is spliced in
        """
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-fake")
        gen = OpenRouterCorrectorGenerator()

        # Strict JSON output format expected by Corrector parser:
        good_candidate_json = '{"sentence_id": "S2", "corrected_sentence": "Python was created by Guido van Rossum."}'

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": good_candidate_json}}]
        }

        with patch("httpx.post", return_value=mock_resp):
            agent = CorrectorAgent(generator=gen)
            result = agent.correct(valid_correction_request)

            assert result.status == ExecutionStatus.COMPLETED
            assert result.validation_status == ValidationStatus.VALID
            assert "Guido van Rossum" in result.corrected_text
            assert "Elon Musk" not in result.corrected_text
            assert len(result.changed_claims) == 1
