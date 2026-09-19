from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict

from .schemas import (
    ClaimReport,
    CorrectionRequest,
    CorrectionResult,
    DetectorResult,
    Evidence,
    JudgeResult,
    MemoryResult,
    ReverificationResult,
    VerifierResult,
)

AgentStatus = Literal["started", "completed", "failed", "skipped", "scheduled"]
TerminalStatus = Literal[
    "accepted", "corrected", "rejected", "partial_success", "failed", "human_review", "fallback"
]


class AgentError(TypedDict, total=False):
    """Typed dictionary representing an agent execution error."""
    node: str
    type: str
    message: str
    timestamp: str
    retryable: bool


class ExecutionEvent(TypedDict, total=False):
    """Typed dictionary representing a single execution event in the trace."""
    execution_id: str
    node: str
    status: AgentStatus
    timestamp: str
    latency_ms: int
    retry_count: int
    details: dict[str, Any]


class HalluciGuardState(TypedDict, total=False):
    """Main state dictionary for the HalluciGuard verification pipeline."""
    # Request / Base LLM draft
    execution_id: str
    request_id: str
    user_query: str
    llm_response: str
    draft_response: str
    draft_answer: str
    generation_mode: str  # "normal" or "stress_test"
    conversation_history: list[dict[str, str]]
    generation: dict[str, Any]
    base_llm: dict[str, Any]
    domain: str
    created_at: str
    updated_at: str

    # Canonical Shared Contracts (Phase 1+)
    detector_result: DetectorResult | dict[str, Any]
    verifier_result: VerifierResult | dict[str, Any]
    judge_result: JudgeResult | dict[str, Any]
    correction_request: CorrectionRequest | dict[str, Any]
    correction_result: CorrectionResult | dict[str, Any]
    reverification_result: ReverificationResult | dict[str, Any]
    memory_result: MemoryResult | dict[str, Any]

    # Shared inter-agent contract (Legacy / Backward-compatibility)
    detector: dict[str, Any]
    route: str
    claims: list[dict[str, Any]]
    hallucination_probability: float
    confidence: float
    verification_status: str
    draft_verification_status: str
    original_verification_status: str
    correction_status: str
    reverification_status: str
    persisted_fact_ids: list[str]
    verifier: dict[str, Any]
    judge_pairs: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    retrieved_evidence: list[dict[str, Any]]
    ranked_evidence: list[dict[str, Any]]
    nli_results: list[dict[str, Any]]
    judge: dict[str, Any]
    judge_decision: str
    answer_status: str
    correction_required: bool
    corrector: dict[str, Any]
    extracted_claims: list[dict[str, Any]]
    memory: dict[str, Any]
    memory_context: dict[str, Any]
    knowledge_graph_context: dict[str, Any]

    # Active and disabled agents reporting
    active_agents: list[str]
    disabled_agents: dict[str, dict[str, str | bool]] | list[str]

    # Control plane
    final_response: str
    terminal_status: TerminalStatus
    retry_count: int
    max_retries: int
    correction_attempt_count: int
    reverification_attempt_count: int
    final_routing_decision: str
    current_node: str
    errors: list[AgentError]
    error: str

    # Inter-agent event bus messages
    inter_agent_bus: list[dict[str, Any]]

    # Observability / audit
    trace: list[ExecutionEvent]
    audit: dict[str, Any]


def utc_now() -> str:
    """Return the current UTC timestamp as an ISO format string."""
    return datetime.now(timezone.utc).isoformat()


def start_timer() -> float:
    """Start a performance timer and return the start time."""
    return time.perf_counter()


def elapsed_ms(start: float) -> int:
    """Calculate elapsed time in milliseconds from a start time."""
    return int((time.perf_counter() - start) * 1000)


def add_trace(
    state: HalluciGuardState,
    node: str,
    status: AgentStatus,
    *,
    latency_ms: int | None = None,
    **details: Any,
) -> list[ExecutionEvent]:
    """Add an execution event to the state's trace and return the updated trace list."""
    trace = list(state.get("trace", []))
    event: ExecutionEvent = {
        "execution_id": state.get("execution_id", state.get("request_id", "")),
        "node": node,
        "status": status,
        "timestamp": utc_now(),
        "retry_count": int(state.get("retry_count", 0)),
        "details": details,
    }
    if latency_ms is not None:
        event["latency_ms"] = latency_ms
    trace.append(event)
    return trace


def add_error(
    state: HalluciGuardState, node: str, exc: BaseException, *, retryable: bool = False
) -> list[AgentError]:
    """Add an error event to the state's error list and return the updated list."""
    errors = list(state.get("errors", []))
    errors.append(
        {
            "node": node,
            "type": type(exc).__name__,
            "message": str(exc),
            "timestamp": utc_now(),
            "retryable": retryable,
        }
    )
    return errors


def add_bus_message(
    state: HalluciGuardState,
    source_agent: str,
    target_agent: str,
    message_type: str,
    payload: dict[str, Any],
    status: str = "processed",
) -> list[dict[str, Any]]:
    """Add an inter-agent bus message to the state and return the updated bus message list."""
    bus_messages = list(state.get("inter_agent_bus", []))
    bus_messages.append(
        {
            "message_id": f"msg-{len(bus_messages) + 1}",
            "execution_id": state.get("execution_id", state.get("request_id", "")),
            "source_agent": source_agent,
            "target_agent": target_agent,
            "message_type": message_type,
            "payload": payload,
            "timestamp": utc_now(),
            "status": status,
        }
    )
    return bus_messages
