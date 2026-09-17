from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class SqliteCache:
    """SQLite cache for verification results with algorithm-versioned keys."""

    # Bump when retrieval/NLI/scoring semantics change so stale decisions are
    # never silently reused after an algorithm upgrade.
    CACHE_SCHEMA_VERSION = "verifier-v2.2"

    def __init__(self, db_path: str = "verification_cache.db", ttl_seconds: int = 86400) -> None:
        self.db_path = db_path
        self.ttl_seconds = ttl_seconds

    async def init_db(self) -> None:
        """Initialize the database table if it doesn't exist."""
        try:
            import os

            import aiosqlite

            parent = os.path.dirname(os.path.abspath(self.db_path))
            if parent:
                os.makedirs(parent, exist_ok=True)

            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    CREATE TABLE IF NOT EXISTS verification_cache (
                        cache_key TEXT PRIMARY KEY,
                        payload TEXT,
                        timestamp TEXT,
                        domain TEXT
                    )
                    """
                )
                await db.commit()
        except ImportError:
            logging.warning("aiosqlite not installed. SqliteCache will fail.")
        except Exception as exc:
            logging.error("Error initializing cache DB: %s", exc)

    def _normalize_key(self, domain: str, query: str) -> str:
        """Generate a deterministic versioned cache key preserving query semantics."""
        normalized = " ".join((query or "").lower().split())
        key_input = f"{self.CACHE_SCHEMA_VERSION}:{domain.lower().strip()}:{normalized}"
        return hashlib.sha256(key_input.encode("utf-8")).hexdigest()

    def is_enabled(self) -> bool:
        """Check if verifier cache is enabled via env var or settings."""
        import os
        env_val = os.getenv("VERIFIER_CACHE_ENABLED", "").lower().strip()
        if env_val in ("false", "0", "off", "no"):
            return False
        if env_val in ("true", "1", "on", "yes"):
            return True
        try:
            from config.settings import get_settings
            return get_settings().verifier_cache_enabled
        except Exception:
            return True

    async def _ensure_db_initialized(self) -> None:
        """Ensure the table exists before executing queries."""
        if not getattr(self, "_db_initialized", False):
            await self.init_db()
            self._db_initialized = True

    async def get(self, domain: str, query: str) -> Optional[Dict[str, Any]]:
        """Retrieve a cached result if it hasn't expired."""
        if not self.is_enabled():
            return None
        await self._ensure_db_initialized()
        key = self._normalize_key(domain, query)
        try:
            import aiosqlite

            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    "SELECT payload, timestamp FROM verification_cache WHERE cache_key = ?",
                    (key,),
                ) as cursor:
                    row = await cursor.fetchone()

                if not row:
                    return None

                payload_json, timestamp_str = row
                cached_time = datetime.fromisoformat(timestamp_str)
                now = datetime.now(timezone.utc)
                if (now - cached_time).total_seconds() > self.ttl_seconds:
                    await self.invalidate(domain, query)
                    return None

                return json.loads(payload_json)
        except Exception as exc:
            logging.error("Cache get error: %s", exc)
            return None

    async def set(self, domain: str, query: str, payload: Dict[str, Any]) -> None:
        """Store a result in the cache."""
        if not self.is_enabled():
            return
        await self._ensure_db_initialized()
        key = self._normalize_key(domain, query)
        timestamp = datetime.now(timezone.utc).isoformat()
        payload_str = json.dumps(payload)

        try:
            import aiosqlite

            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    INSERT INTO verification_cache (cache_key, payload, timestamp, domain)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(cache_key) DO UPDATE SET
                        payload=excluded.payload,
                        timestamp=excluded.timestamp,
                        domain=excluded.domain
                    """,
                    (key, payload_str, timestamp, domain),
                )
                await db.commit()
        except Exception as exc:
            logging.error("Cache set error: %s", exc)

    async def invalidate(self, domain: str, query: str) -> None:
        """Remove a specific entry from the current cache version."""
        key = self._normalize_key(domain, query)
        try:
            import aiosqlite

            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("DELETE FROM verification_cache WHERE cache_key = ?", (key,))
                await db.commit()
        except Exception as exc:
            logging.error("Cache invalidate error: %s", exc)

    async def cleanup_expired(self) -> int:
        """Remove all expired entries from the cache."""
        try:
            import aiosqlite

            count = 0
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    "SELECT cache_key, timestamp FROM verification_cache"
                ) as cursor:
                    rows = await cursor.fetchall()

                now = datetime.now(timezone.utc)
                to_delete = []
                for key, timestamp_str in rows:
                    cached_time = datetime.fromisoformat(timestamp_str)
                    if (now - cached_time).total_seconds() > self.ttl_seconds:
                        to_delete.append((key,))

                if to_delete:
                    await db.executemany(
                        "DELETE FROM verification_cache WHERE cache_key = ?", to_delete
                    )
                    await db.commit()
                    count = len(to_delete)

            return count
        except Exception as exc:
            logging.error("Cache cleanup error: %s", exc)
            return 0

    async def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            import aiosqlite

            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    "SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM verification_cache"
                ) as cursor:
                    row = await cursor.fetchone()
                    count, oldest, newest = row if row else (0, None, None)

            return {
                "total_entries": count,
                "oldest_entry": oldest,
                "newest_entry": newest,
            }
        except Exception as exc:
            logging.error("Cache stats error: %s", exc)
            return {"total_entries": 0}
