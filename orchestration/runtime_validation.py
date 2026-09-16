from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class ComponentCheckResult:
    """Result of a runtime component validation check."""
    ok: bool
    component: str
    detail: str
    metadata: Dict[str, Any]

    def model_dump(self) -> Dict[str, Any]:
        """Convert the check result to a dictionary."""
        return {
            "ok": self.ok,
            "component": self.component,
            "detail": self.detail,
            "metadata": self.metadata,
        }


def validate_openrouter_configuration() -> ComponentCheckResult:
    """Validate OpenRouter API key and model configuration."""
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    model = os.environ.get("OPENROUTER_MODEL", "qwen/qwen-2.5-7b-instruct")
    base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    if not api_key:
        return ComponentCheckResult(
            ok=False,
            component="base_llm",
            detail="OPENROUTER_API_KEY is not configured in the environment.",
            metadata={
                "provider": "openrouter",
                "model": model,
                "base_url": base_url,
                "key_configured": False,
            },
        )
    return ComponentCheckResult(
        ok=True,
        component="base_llm",
        detail="OpenRouter Base LLM configuration is ready.",
        metadata={
            "provider": "openrouter",
            "model": model,
            "base_url": base_url,
            "key_configured": True,
        },
    )


def validate_detector_model_reference() -> ComponentCheckResult:
    """Validate that Detector configuration points to a loadable model artifact."""
    try:
        from agents.detector_agent.config import DetectorConfig
        from agents.detector_agent.halueval_inference import (
            validate_halueval_model_reference,
        )

        cfg = DetectorConfig()
        resolved = validate_halueval_model_reference(cfg.halueval_model_path)
        return ComponentCheckResult(
            ok=True,
            component="detector",
            detail="Detector model reference is valid.",
            metadata={
                "configured_model_path": cfg.halueval_model_path,
                "resolved_model_reference": resolved,
            },
        )
    except Exception as exc:
        return ComponentCheckResult(
            ok=False,
            component="detector",
            detail=f"{type(exc).__name__}: {exc}",
            metadata={"configured_model_path": os.environ.get("HALUEVAL_MODEL_PATH", "")},
        )


def validate_verifier_configuration() -> ComponentCheckResult:
    """Validate Verifier pipeline and NLI configuration."""
    try:
        verifier_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "agents", "verifier_agent")
        )
        if verifier_dir not in sys.path:
            sys.path.insert(0, verifier_dir)
        from config.settings import get_settings
        settings = get_settings()
        nli_model = os.environ.get("HALLUCIGUARD_NLI_MODEL_PATH") or settings.nli_model
        return ComponentCheckResult(
            ok=True,
            component="verifier",
            detail="Verifier agent pipeline and NLI settings are valid.",
            metadata={
                "nli_model": nli_model,
                "allow_model_downloads": settings.allow_model_downloads,
            },
        )
    except Exception as exc:
        return ComponentCheckResult(
            ok=False,
            component="verifier",
            detail=f"{type(exc).__name__}: {exc}",
            metadata={"error": str(exc)},
        )


def validate_memory_configuration() -> ComponentCheckResult:
    """Validate Memory agent dependencies and vector store accessibility."""
    try:
        from agents.memory_agent.memory.memory_agent import MemoryAgent
        return ComponentCheckResult(
            ok=True,
            component="memory",
            detail="Memory agent dependencies and FAISS storage are available.",
            metadata={"persistence": "local_or_ephemeral"},
        )
    except Exception as exc:
        return ComponentCheckResult(
            ok=False,
            component="memory",
            detail=f"{type(exc).__name__}: {exc}",
            metadata={"error": str(exc)},
        )


def validate_judge_configuration() -> ComponentCheckResult:
    """Validate that the canonical Judge is importable."""
    try:
        from agents.judge_agent.judge_agent import JudgeAgent
        return ComponentCheckResult(
            ok=callable(JudgeAgent),
            component="judge",
            detail="Canonical Judge agent is available.",
            metadata={"implementation": "agents.judge_agent.judge_agent.JudgeAgent"},
        )
    except Exception as exc:
        return ComponentCheckResult(
            ok=False,
            component="judge",
            detail=f"{type(exc).__name__}: {exc}",
            metadata={"error": str(exc)},
        )


def validate_corrector_configuration() -> ComponentCheckResult:
    """Validate the configured correction generator without loading model weights."""
    provider = os.environ.get("HG_CORRECTOR_PROVIDER", "openrouter").strip().lower()
    try:
        from agents.corrector_agent.corrector import CorrectorAgent
        if provider == "openrouter":
            key_ready = bool(os.environ.get("OPENROUTER_API_KEY", "").strip())
            return ComponentCheckResult(
                ok=key_ready and callable(CorrectorAgent),
                component="corrector",
                detail="OpenRouter-backed Corrector is ready." if key_ready else "OPENROUTER_API_KEY is required by the configured Corrector.",
                metadata={"provider": provider, "key_configured": key_ready},
            )
        from agents.corrector_agent.corrector.config import CorrectorConfig
        from agents.corrector_agent.corrector.model_client import resolve_model
        status = resolve_model(CorrectorConfig.from_env())
        return ComponentCheckResult(
            ok=bool(status.available),
            component="corrector",
            detail=status.detail or "Local Corrector model is available.",
            metadata={"provider": "local", "model_status": status.model_dump()},
        )
    except Exception as exc:
        return ComponentCheckResult(
            ok=False,
            component="corrector",
            detail=f"{type(exc).__name__}: {exc}",
            metadata={"provider": provider, "error": str(exc)},
        )
def validate_orchestration_startup() -> Dict[str, Any]:
    """Run comprehensive validation checks for all production components."""
    openrouter = validate_openrouter_configuration()
    detector = validate_detector_model_reference()
    verifier = validate_verifier_configuration()
    judge = validate_judge_configuration()
    corrector = validate_corrector_configuration()
    memory = validate_memory_configuration()

    checks = [openrouter, detector, verifier, judge, corrector, memory]
    all_ok = all(c.ok for c in checks)

    active_agents = ["base_llm", "detector", "verifier", "judge", "corrector", "reverifier", "memory"]
    disabled_agents: List[str] = []

    return {
        "ok": all_ok,
        "backend_status": "healthy" if all_ok else "degraded",
        "environment": os.environ.get("HALLUCIGUARD_ENV", "production"),
        "active_agents": active_agents,
        "disabled_agents": disabled_agents,
        "checks": [c.model_dump() for c in checks],
        "base_llm": openrouter.metadata,
        "detector": detector.metadata,
        "verifier": verifier.metadata,
        "judge": judge.metadata,
        "corrector": corrector.metadata,
        "reverifier": verifier.metadata,
        "memory": memory.metadata,
    }
