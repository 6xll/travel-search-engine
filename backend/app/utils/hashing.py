"""Deterministic hashing helpers.

Python's built-in ``hash`` is salted per process, so anything that must be
stable across restarts or containers (mock data seeds, cache keys) goes
through SHA-256 instead.
"""

import hashlib

from app.schemas.search import SearchRequest


def stable_seed(*parts: object) -> int:
    """Derive a deterministic 64-bit seed from arbitrary parts."""
    joined = "|".join(str(part) for part in parts)
    digest = hashlib.sha256(joined.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], byteorder="big")


def search_request_cache_key(request: SearchRequest) -> str:
    """Canonical Redis cache key for a normalized search request."""
    payload = request.model_dump_json()
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"search:cache:{digest}"
