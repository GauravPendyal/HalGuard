"""
HalluciGuard Authentication and User Persistence Module.

Provides:
  1. PBKDF2-HMAC-SHA256 password hashing with salt.
  2. JWT creation and validation using server-side secret (HS256).
  3. SQLite-backed persistent user repository and history store.
  4. Scoped history persistence per authenticated user.
"""
from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import uuid
from datetime import timezone
from typing import Any, Dict, List, Optional, Tuple

import jwt
import requests

# Path configuration
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.abspath(
    os.environ.get("AUTH_DB_PATH", os.path.join(PROJECT_ROOT, "data", "halluciguard_users.db"))
)
DATA_DIR = os.path.dirname(DB_PATH)

# JWT configuration — server-side only secret, with no checked-in fallback.
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "").strip()
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be configured with at least 32 characters")
    return secret


def _get_db_connection() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_auth_db() -> None:
    """Initialize database tables for users and authenticated verification history."""
    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                picture TEXT,
                auth_provider TEXT DEFAULT 'local',
                created_at TEXT NOT NULL
            )
            """
        )
        # Migrate existing users table if columns are missing
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN picture TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'")
        except sqlite3.OperationalError:
            pass

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                query TEXT NOT NULL,
                verdict TEXT,
                confidence REAL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id)"
        )
        conn.commit()

    finally:
        conn.close()


def _hash_password(password: str, salt: str) -> str:
    """Compute PBKDF2-HMAC-SHA256 password hash."""
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()


def create_jwt_token(
    user_id: str, email: str, name: str, picture: Optional[str] = None
) -> str:
    """Generate a signed JWT token containing user identity and expiration."""
    now = datetime.datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)).timestamp()),
    }
    if picture:
        payload["picture"] = picture
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """Decode and validate a signed JWT token."""
    try:
        return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as exc:
        raise ValueError(f"Invalid token: {exc}")


def register_user(email: str, password: str, name: Optional[str] = None) -> Tuple[Dict[str, Any], str]:
    """Register a new user and return (user_dict, access_token)."""
    email_clean = email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise ValueError("Valid email address is required")
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")

    display_name = (name or "").strip() or email_clean.split("@")[0]
    user_id = str(uuid.uuid4())
    salt = secrets.token_hex(16)
    pwd_hash = _hash_password(password, salt)
    now = datetime.datetime.now(timezone.utc).isoformat()

    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email_clean,))
        if cursor.fetchone():
            raise ValueError("An account with this email already exists")

        cursor.execute(
            """
            INSERT INTO users (id, email, name, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, email_clean, display_name, salt, pwd_hash, now),
        )
        conn.commit()
    finally:
        conn.close()

    token = create_jwt_token(user_id, email_clean, display_name)
    user_dict = {
        "id": user_id,
        "sub": user_id,
        "email": email_clean,
        "name": display_name,
        "created_at": now,
    }
    return user_dict, token


def authenticate_user(email: str, password: str) -> Tuple[Dict[str, Any], str]:
    """Validate credentials and return (user_dict, access_token)."""
    email_clean = email.strip().lower()
    if not email_clean or not password:
        raise ValueError("Email and password are required")

    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, name, password_salt, password_hash, created_at FROM users WHERE email = ?",
            (email_clean,),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Invalid email or password")

        salt = row["password_salt"]
        expected_hash = row["password_hash"]
        actual_hash = _hash_password(password, salt)

        if not hmac.compare_digest(actual_hash.encode("utf-8"), expected_hash.encode("utf-8")):
            raise ValueError("Invalid email or password")

        user_id = row["id"]
        display_name = row["name"]
        created_at = row["created_at"]
    finally:
        conn.close()

    token = create_jwt_token(user_id, email_clean, display_name)
    user_dict = {
        "id": user_id,
        "sub": user_id,
        "email": email_clean,
        "name": display_name,
        "picture": None,
        "created_at": created_at,
    }
    return user_dict, token


def authenticate_google_user(credential: str) -> Tuple[Dict[str, Any], str]:
    """Validate Google OAuth ID token, sync or create user, and return (user_dict, access_token)."""
    if not credential:
        raise ValueError("Google credential token is required")

    # Verify ID token via Google's tokeninfo service
    try:
        resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=10,
        )
    except Exception as exc:
        raise ValueError("Could not reach Google OAuth validation service") from exc

    if resp.status_code != 200:
        raise ValueError("Google token validation failed")

    google_data = resp.json()

    # Validate audience matches our Google Client ID
    aud = google_data.get("aud")
    azp = google_data.get("azp")
    if not GOOGLE_CLIENT_ID:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured")
    if aud != GOOGLE_CLIENT_ID:
        raise ValueError("Google token audience mismatch")
    if azp and azp != GOOGLE_CLIENT_ID:
        raise ValueError("Google token authorized-party mismatch")

    issuer = google_data.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("Google token issuer mismatch")
    if str(google_data.get("email_verified", "")).lower() not in {"true", "1"}:
        raise ValueError("Google account email is not verified")

    email = (google_data.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Google token did not provide a valid email address")

    name = (google_data.get("name") or google_data.get("given_name") or email.split("@")[0]).strip()
    picture = google_data.get("picture")
    now = datetime.datetime.now(timezone.utc).isoformat()

    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, name, picture, created_at FROM users WHERE email = ?",
            (email,),
        )
        row = cursor.fetchone()

        if row:
            user_id = row["id"]
            # Update picture or name if changed
            cursor.execute(
                "UPDATE users SET picture = coalesce(?, picture), name = coalesce(?, name) WHERE id = ?",
                (picture, name, user_id),
            )
            conn.commit()
            created_at = row["created_at"]
        else:
            user_id = str(uuid.uuid4())
            salt = secrets.token_hex(16)
            pwd_hash = _hash_password(secrets.token_urlsafe(32), salt)
            cursor.execute(
                """
                INSERT INTO users (id, email, name, password_salt, password_hash, picture, auth_provider, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, email, name, salt, pwd_hash, picture, "google", now),
            )
            conn.commit()
            created_at = now
    finally:
        conn.close()

    token = create_jwt_token(user_id, email, name, picture=picture)
    user_dict = {
        "id": user_id,
        "sub": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "created_at": created_at,
    }
    return user_dict, token


def get_user_by_token(token: str) -> Dict[str, Any]:
    """Validate JWT token and fetch the corresponding user profile."""
    payload = decode_jwt_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Token missing subject identifier")

    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, picture, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("User not found")
        return {
            "id": row["id"],
            "sub": row["id"],
            "email": row["email"],
            "name": row["name"],
            "picture": row["picture"] if "picture" in row.keys() else payload.get("picture"),
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


def save_user_history(
    user_id: str, query: str, result_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Save a completed verification result to the user's persistent history."""
    history_id = str(result_dict.get("execution_id") or uuid.uuid4())
    now = datetime.datetime.now(timezone.utc).isoformat()
    claims = (result_dict.get("verifier", {}) or {}).get("claim_evidence", [])
    claim_verdict = ""
    if claims and isinstance(claims, list) and len(claims) > 0:
        cv = claims[0].get("verdict")
        if cv:
            claim_verdict = getattr(cv, "value", str(cv))

    verdict = str(
        claim_verdict
        or (result_dict.get("verification_status") if str(result_dict.get("verification_status")).lower() in ("verified", "contradicted", "conflicted", "unverified") else "")
        or "unverified"
    ).lower()
    confidence = float(
        (result_dict.get("verifier", {}) or {}).get("overall_evidence_confidence", 0.0) or 0.0
    )
    result_json = json.dumps(result_dict)

    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO user_history (id, user_id, query, verdict, confidence, result_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (history_id, user_id, query, verdict, confidence, result_json, now),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "id": history_id,
        "user_id": user_id,
        "query": query,
        "verdict": verdict,
        "confidence": confidence,
        "created_at": now,
    }


def get_user_history(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve history records for a specific authenticated user."""
    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, query, verdict, confidence, result_json, created_at
            FROM user_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        rows = cursor.fetchall()
        items = []
        for r in rows:
            try:
                res_obj = json.loads(r["result_json"])
            except Exception:
                res_obj = None
            items.append(
                {
                    "id": r["id"],
                    "query": r["query"],
                    "verdict": r["verdict"],
                    "confidence": r["confidence"],
                    "result": res_obj,
                    "created_at": r["created_at"],
                }
            )
        return items
    finally:
        conn.close()


def clear_user_history(user_id: str, history_id: Optional[str] = None) -> bool:
    """Clear all history or a single history item for a user."""
    conn = _get_db_connection()
    try:
        cursor = conn.cursor()
        if history_id:
            cursor.execute(
                "DELETE FROM user_history WHERE user_id = ? AND id = ?",
                (user_id, history_id),
            )
        else:
            cursor.execute("DELETE FROM user_history WHERE user_id = ?", (user_id,))
        conn.commit()
        return True
    finally:
        conn.close()


init_auth_db()
