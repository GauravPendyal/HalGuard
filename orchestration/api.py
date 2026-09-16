from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv

# Ensure local .env is loaded in development and production
load_dotenv()

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from services.base_llm_service import BaseLLMService

from .auth import (
    authenticate_google_user,
    authenticate_user,
    clear_user_history,
    get_user_by_token,
    get_user_history,
    register_user,
    save_user_history,
)
from .graph import run_verification
from .runtime_validation import validate_orchestration_startup

logger = logging.getLogger(__name__)


class ConversationTurnRequest(BaseModel):
    """One bounded, unprivileged turn of user-visible conversation context."""
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20_000)


class VerificationRequest(BaseModel):
    """Request model for the verification endpoint."""
    user_query: str = Field(min_length=1, max_length=20_000, description="The user's prompt or question to verify.")
    generation_mode: Literal["normal", "stress_test"] = Field(default="normal", description="'normal' or 'stress_test'.")
    llm_response: Optional[str] = Field(default=None, max_length=50_000, description="Optional pre-supplied draft response.")
    conversation_history: List[ConversationTurnRequest] = Field(default_factory=list, max_length=30, description="Optional conversation context.")
    domain: str = Field(default="general", min_length=1, max_length=64, description="Verification domain (e.g. general, biomedical, finance).")
    request_id: Optional[str] = Field(default=None, max_length=128, description="Optional caller correlation ID.")


class RegisterRequest(BaseModel):
    """Request model for user registration."""
    email: str = Field(min_length=3, description="User email address")
    password: str = Field(min_length=8, description="User password (min 8 characters)")
    name: Optional[str] = Field(default=None, description="User display name")


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: str = Field(min_length=3, description="User email address")
    password: str = Field(min_length=1, description="User password")


class GoogleAuthRequest(BaseModel):
    """Request model for Google OAuth authentication."""
    credential: str = Field(min_length=10, description="Google OAuth ID Token JWT")


class SaveHistoryRequest(BaseModel):
    """Request model for saving verification history."""
    query: str = Field(min_length=1, description="User query text")
    result: Dict[str, Any] = Field(description="Verification result JSON payload")


app = FastAPI(
    title="HalluciGuard Verification Engine",
    version="2.0.0",
    description="Production LangGraph supervisor orchestrating OpenRouter, Detector, Verifier, Judge, Corrector, Re-verifier, and Memory with JWT authentication.",
)

def _cors_origins() -> List[str]:
    configured = os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip() and "*" not in origin]


# Same-origin deployment uses the Next.js proxy. These exact origins support local
# development and explicitly configured separate frontend deployments.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX") or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)


def _get_auth_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Extract and validate the authenticated user from the Authorization header.

    Args:
        authorization: The Authorization header value (expected format: "Bearer <token>").

    Returns:
        A dictionary containing user information if authentication succeeds, or None if the
        token is missing, malformed, or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        return None
    try:
        return get_user_by_token(token)
    except Exception:
        return None


def _require_auth_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = _get_auth_user(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ── Authentication Endpoints ──────────────────────────────────────────

@app.post("/auth/register")
async def auth_register(req: RegisterRequest) -> Dict[str, Any]:
    """Register a new user account and return an access token."""
    try:
        user_dict, token = register_user(
            email=req.email,
            password=req.password,
            name=req.name,
        )
        return {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "user": user_dict,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Registration service failed") from exc


@app.post("/auth/login")
async def auth_login(req: LoginRequest) -> Dict[str, Any]:
    """Authenticate a user with email and password and return an access token."""
    try:
        user_dict, token = authenticate_user(
            email=req.email,
            password=req.password,
        )
        return {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "user": user_dict,
        }
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Login service failed") from exc


@app.post("/auth/google")
@app.post("/api/v1/auth/google")
async def auth_google(req: GoogleAuthRequest) -> Dict[str, Any]:
    """Authenticate a user via Google OAuth and return an access token."""
    try:
        user_dict, token = authenticate_google_user(req.credential)
        return {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "user": user_dict,
        }
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Google authentication failed") from exc


@app.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get the currently authenticated user's information."""
    user = _require_auth_user(authorization)
    return {
        "status": "success",
        "user": user,
    }


@app.post("/auth/logout")
async def auth_logout() -> Dict[str, Any]:
    """Log out the current user (client-side token removal)."""
    return {"status": "success", "message": "Successfully signed out"}


# ── Authenticated History Endpoints ────────────────────────────────────

@app.get("/api/history")
async def get_history(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Get the authenticated user's verification history."""
    user = _require_auth_user(authorization)
    items = get_user_history(user["id"], limit=limit)
    return {"status": "success", "history": items}


@app.post("/api/history")
async def save_history(
    req: SaveHistoryRequest,
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Save a verification result to the authenticated user's history."""
    user = _require_auth_user(authorization)
    saved = save_user_history(user["id"], req.query, req.result)
    return {"status": "success", "record": saved}


@app.delete("/api/history")
async def delete_history(
    history_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Delete verification history for the authenticated user."""
    user = _require_auth_user(authorization)
    clear_user_history(user["id"], history_id=history_id)
    return {"status": "success", "message": "History cleared"}


# ── System Endpoints ──────────────────────────────────────────────────

@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint providing API information and available endpoints."""
    return {
        "service": "HalluciGuard Verification Engine API",
        "status": "online",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "verify_endpoint": "/verify",
        "auth_endpoints": {
            "register": "/auth/register",
            "login": "/auth/login",
            "me": "/auth/me",
            "logout": "/auth/logout",
        },
        "frontend_url": "https://halluciguard-ai.vercel.app",
    }


@app.get("/health")
async def health(deep: bool = False) -> Dict[str, Any]:
    """Health check endpoint with optional deep component validation."""
    if not deep:
        return {
            "status": "healthy",
            "backend_status": "healthy",
            "environment": os.environ.get("HALLUCIGUARD_ENV", "production"),
            "engine": "langgraph_production_supervisor",
            "active_agents": [
                "base_llm",
                "detector",
                "verifier",
                "judge",
                "corrector",
                "reverifier",
                "memory",
            ],
            "disabled_agents": [],
        }

    validation = validate_orchestration_startup()
    try:
        base_llm = (await BaseLLMService().health(check_network=True)).model_dump()
    except Exception as exc:
        base_llm = {"available": False, "provider": "openrouter", "error": str(exc)}

    llm_ready = all(
        base_llm.get(field) is True
        for field in ("provider_configured", "model_configured", "key_configured", "endpoint_reachable")
    )
    return {
        "status": "healthy" if validation.get("ok") and llm_ready else "degraded",
        "backend_status": "healthy" if validation.get("ok") and llm_ready else "degraded",
        "environment": os.environ.get("HALLUCIGUARD_ENV", "production"),
        "engine": "langgraph_production_supervisor",
        "active_agents": [
            "base_llm",
            "detector",
            "verifier",
            "judge",
            "corrector",
            "reverifier",
            "memory",
        ],
        "disabled_agents": [],
        "base_llm": base_llm,
        "detector": validation.get("detector", {}),
        "verifier": validation.get("verifier", {}),
        "judge": validation.get("judge", {}),
        "corrector": validation.get("corrector", {}),
        "reverifier": validation.get("reverifier", {}),
        "memory": validation.get("memory", {}),
        "runtime_validation": validation,
    }


def _total_latency_ms(result: Dict[str, Any]) -> int:
    """
    Calculate the total pipeline latency by summing all trace event latencies.

    Args:
        result: The verification result dictionary containing trace events.

    Returns:
        The total latency in milliseconds across all traced agent nodes.
    """
    return sum(
        int(event.get("latency_ms", 0) or 0) for event in result.get("trace", [])
    )


def _final_verifier_view(result: Dict[str, Any]) -> Dict[str, Any]:
    """Return claim data for the answer that is actually delivered to the user."""
    legacy = dict(result.get("verifier") or {})
    reverification = result.get("reverification_result") or {}
    canonical = reverification.get("verifier_result") or result.get("verifier_result") or {}
    if canonical:
        legacy["claim_evidence"] = canonical.get("claim_reports", [])
        legacy["overall_evidence_confidence"] = canonical.get("overall_confidence", 0.0)
        legacy["query_id"] = canonical.get("query_id", legacy.get("query_id"))
        legacy["domain"] = canonical.get("domain", legacy.get("domain"))
    return legacy


async def _execute_verification(
    request: VerificationRequest, authorization: Optional[str] = None
) -> Dict[str, Any]:
    """
    Execute the full verification pipeline and return a structured response.

    Args:
        request: The verification request containing user query, generation mode, and optional LLM response.
        authorization: Optional Authorization header for authenticated users (enables auto-save to history).

    Returns:
        A dictionary containing the verification result with execution metadata, agent outputs,
        trace events, and final response.

    Raises:
        HTTPException: If the verification pipeline encounters an unrecoverable error.
    """
    try:
        result = await run_verification(
            user_query=request.user_query,
            llm_response=request.llm_response or "",
            domain=request.domain,
            request_id=request.request_id,
            generation_mode=request.generation_mode,
            conversation_history=[turn.model_dump() for turn in request.conversation_history],
        )
        verifier_view = _final_verifier_view(result)
        claims_ev = verifier_view.get("claim_evidence", [])
        if claims_ev:
            has_c = any("contradict" in str(c.get("verdict", "")).lower() or "hallucinat" in str(c.get("verdict", "")).lower() for c in claims_ev)
            has_v = any(str(c.get("verdict", "")).lower() in ("verified", "supported", "verdictlabel.verified") or (str(c.get("verdict", "")).lower().startswith("verif") and "unverif" not in str(c.get("verdict", "")).lower()) for c in claims_ev)
            has_conf = any("conflict" in str(c.get("verdict", "")).lower() for c in claims_ev)
            derived_status = "contradicted" if has_c else "conflicted" if has_conf else "verified" if has_v else "unverified"
        else:
            derived_status = result.get("verification_status", "unverified")

        resp = {
            "execution_id": result.get("execution_id"),
            "request_id": result.get("request_id"),
            "generation": (result.get("base_llm") or {}).get("model"),
            "draft_response": result.get("draft_response") or result.get("llm_response"),
            "final_response": result.get("final_response") or result.get("draft_response", result.get("llm_response")),
            "terminal_status": result.get("terminal_status") or "human_review",
            "verification_status": derived_status,
            "total_latency_ms": _total_latency_ms(result),
            "detector": result.get("detector"),
            "verifier": verifier_view,
            "memory": result.get("memory"),
            "active_agents": result.get("active_agents") or [
                "base_llm",
                "detector",
                "verifier",
                "judge",
                "corrector",
                "reverifier",
                "memory",
            ],
            "disabled_agents": result.get("disabled_agents") if result.get("disabled_agents") is not None else [],
            "judge": result.get("judge") or result.get("judge_result"),
            "corrector": result.get("corrector") or result.get("correction_result"),
            "reverification": result.get("reverification_result"),
            "judge_result": result.get("judge_result"),
            "correction_result": result.get("correction_result"),
            "reverification_result": result.get("reverification_result"),
            "memory_result": result.get("memory_result"),
            "retry_count": result.get("retry_count", 0),
            "correction_attempt_count": result.get("correction_attempt_count", 0),
            "reverification_attempt_count": result.get("reverification_attempt_count", 0),
            "errors": result.get("errors", []),
            "inter_agent_bus": result.get("inter_agent_bus", []),
            "trace": result.get("trace", []),
            "audit": result.get("audit", {}),
        }

        # Auto-save history if caller is authenticated
        if authorization:
            user = _get_auth_user(authorization)
            if user:
                try:
                    save_user_history(user["id"], request.user_query, resp)
                except Exception:
                    logger.exception("Failed to persist verification history")

        return resp
    except Exception as exc:
        logger.exception("Verification pipeline failed")
        raise HTTPException(
            status_code=500,
            detail="Verification engine failed. Please retry or check service health.",
        ) from exc


@app.post("/verify")
async def verify(
    request: VerificationRequest,
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Main verification endpoint that orchestrates the full pipeline."""
    return await _execute_verification(request, authorization=authorization)


@app.post("/api/v1/verify")
async def verify_v1(
    request: VerificationRequest,
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """API v1 verification endpoint (alias for /verify)."""
    return await _execute_verification(request, authorization=authorization)
