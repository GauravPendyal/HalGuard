from __future__ import annotations

from orchestration.graph import (
    _corrector_route,
    _detector_route,
    _generate_route,
    _reverifier_route,
    _verifier_route,
    build_verification_graph,
)
from orchestration.state import add_trace


def test_graph_compiles():
    assert build_verification_graph() is not None


def test_state_trace_has_observability_fields():
    trace = add_trace(
        {"execution_id": "ex-1", "retry_count": 1},
        "detector",
        "completed",
        latency_ms=7,
    )
    assert trace[0]["execution_id"] == "ex-1"
    assert trace[0]["node"] == "detector"
    assert trace[0]["latency_ms"] == 7
    assert trace[0]["retry_count"] == 1


def test_generate_route_success():
    assert _generate_route({"llm_response": "Paris is the capital."}) == "detector"


def test_generate_route_failure():
    assert _generate_route({"route": "error", "llm_response": ""}) == "human_escalation"


def test_detector_explicit_fast_path_route():
    assert _detector_route({"route": "accept"}) == "accept"


def test_detector_high_routes_to_verifier():
    assert _detector_route({"route": "verify"}) == "verifier"


def test_detector_failure_routes_to_human_escalation():
    assert _detector_route({"route": "error"}) == "human_escalation"


def test_verifier_route_success():
    assert _verifier_route({"verification_status": "verified"}) == "judge"


def test_verifier_route_error():
    assert _verifier_route({"route": "error"}) == "human_escalation"


def test_verifier_route_agent_failed():
    assert _verifier_route({"verification_status": "agent_failed"}) == "human_escalation"


def test_judge_route_accept():
    from orchestration.graph import _judge_route
    assert _judge_route({"judge_decision": "ACCEPT"}) == "memory"


def test_judge_route_correct():
    from orchestration.graph import _judge_route
    assert _judge_route({"judge_decision": "CORRECT", "active_agents": ["corrector"]}) == "corrector"


def test_judge_route_correction_unavailable_fails_closed():
    from orchestration.graph import _judge_route
    assert _judge_route({"judge_decision": "CORRECT", "active_agents": []}) == "human_escalation"


def test_corrector_and_reverifier_fail_closed_routes():
    assert _corrector_route({"route": "error"}) == "human_escalation"
    assert _corrector_route({"correction_result": {"status": "completed"}}) == "reverifier"
    assert _reverifier_route({"route": "error"}) == "human_escalation"
    assert _reverifier_route({"reverification_result": {"status": "failed"}}) == "human_escalation"
    assert _reverifier_route({"reverification_result": {"status": "completed"}}) == "judge"


def test_judge_route_verify_again():
    from orchestration.graph import _judge_route
    assert _judge_route({"judge_decision": "VERIFY_AGAIN"}) == "verifier"


def test_judge_route_reject():
    from orchestration.graph import _judge_route
    assert _judge_route({"judge_decision": "REJECT"}) == "reject"
