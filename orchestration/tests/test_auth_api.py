import json
import os
import sys
import tempfile
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "test-only-jwt-secret-with-more-than-32-characters")
os.environ.setdefault(
    "AUTH_DB_PATH",
    os.path.join(tempfile.gettempdir(), f"halluciguard-auth-tests-{os.getpid()}.db"),
)

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from orchestration.api import app
from orchestration.auth import (
    authenticate_user,
    decode_jwt_token,
    get_user_by_token,
    register_user,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "auth_endpoints" in data


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "active_agents" in data


def test_register_and_login_flow(client):
    unique_email = f"test_{os.urandom(4).hex()}@example.com"
    password = "securePassword123!"
    name = "Test Engineer"

    # 1. Register
    reg_res = client.post(
        "/auth/register",
        json={"email": unique_email, "password": password, "name": name},
    )
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["status"] == "success"
    assert "access_token" in reg_data
    token = reg_data["access_token"]
    assert reg_data["user"]["email"] == unique_email
    assert reg_data["user"]["name"] == name

    # 2. Decode JWT
    payload = decode_jwt_token(token)
    assert payload["email"] == unique_email
    assert payload["name"] == name

    # 3. /auth/me with valid Bearer token
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == unique_email

    # 4. Login with registered credentials
    login_res = client.post(
        "/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["status"] == "success"
    assert "access_token" in login_data

    # 5. Login with invalid password
    bad_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401


def test_auth_me_requires_valid_token(client):
    res_no_auth = client.get("/auth/me")
    assert res_no_auth.status_code == 401

    res_invalid_token = client.get(
        "/auth/me", headers={"Authorization": "Bearer invalid.fake.token"}
    )
    assert res_invalid_token.status_code == 401


def test_authenticated_history_persistence(client):
    unique_email = f"hist_{os.urandom(4).hex()}@example.com"
    password = "securePassword123!"

    # Register user
    reg_res = client.post(
        "/auth/register",
        json={"email": unique_email, "password": password, "name": "History User"},
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify initially empty history
    h_res = client.get("/api/history", headers=headers)
    assert h_res.status_code == 200
    assert h_res.json()["history"] == []

    # Save a verification record
    mock_result = {
        "execution_id": f"exec-{os.urandom(4).hex()}",
        "verification_status": "verified",
        "verifier": {
            "overall_evidence_confidence": 0.95,
            "claim_evidence": [{"verdict": "verified"}],
        },
    }
    save_res = client.post(
        "/api/history",
        json={"query": "Vitamin C prevents scurvy", "result": mock_result},
        headers=headers,
    )
    assert save_res.status_code == 200

    # Retrieve history
    h_res2 = client.get("/api/history", headers=headers)
    assert h_res2.status_code == 200
    history = h_res2.json()["history"]
    assert len(history) == 1
    assert history[0]["query"] == "Vitamin C prevents scurvy"
    assert history[0]["verdict"] == "verified"

    # Delete history
    del_res = client.delete("/api/history", headers=headers)
    assert del_res.status_code == 200

    h_res3 = client.get("/api/history", headers=headers)
    assert h_res3.json()["history"] == []
