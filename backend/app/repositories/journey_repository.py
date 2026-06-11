"""Redis-backed storage for composed journeys and search-result caching.

Journeys are ephemeral domain objects assembled at search time; they live in
Redis under their UUID (with TTL) so ``GET /journey/{id}`` can serve them
without persisting every candidate itinerary to Postgres.
"""

import uuid
from collections.abc import Sequence

from redis.asyncio import Redis

from app.schemas.journey import Journey
from app.schemas.search import SearchResult

_JOURNEY_KEY_PREFIX = "journey:"


class JourneyRepository:
    def __init__(
        self, redis: Redis, journey_ttl_seconds: int, search_cache_ttl_seconds: int
    ) -> None:
        self._redis = redis
        self._journey_ttl = journey_ttl_seconds
        self._search_cache_ttl = search_cache_ttl_seconds

    async def save_journeys(self, journeys: Sequence[Journey]) -> None:
        if not journeys:
            return
        async with self._redis.pipeline(transaction=False) as pipeline:
            for journey in journeys:
                pipeline.set(
                    f"{_JOURNEY_KEY_PREFIX}{journey.id}",
                    journey.model_dump_json(),
                    ex=self._journey_ttl,
                )
            await pipeline.execute()

    async def get_journey(self, journey_id: uuid.UUID) -> Journey | None:
        payload = await self._redis.get(f"{_JOURNEY_KEY_PREFIX}{journey_id}")
        if payload is None:
            return None
        return Journey.model_validate_json(payload)

    async def cache_search_result(self, cache_key: str, result: SearchResult) -> None:
        await self._redis.set(
            cache_key, result.model_dump_json(), ex=self._search_cache_ttl
        )

    async def get_cached_search_result(self, cache_key: str) -> SearchResult | None:
        payload = await self._redis.get(cache_key)
        if payload is None:
            return None
        return SearchResult.model_validate_json(payload)
