"""Search use case: orchestrates providers, composition, scoring, and caching.

Flow per request:
1. Cache check (Redis) — identical normalized requests within the TTL are
   served without recomputation.
2. Validate origin/destination against the seeded city network.
3. For each candidate date (departure date +/- ``flexible_days``), fan out to
   all providers concurrently: direct segments, departures from the origin
   (hub discovery), hub-to-hub mid legs, and second legs towards the
   destination. Connection legs are also fetched for the *next* day so
   overnight transfers are found.
4. Compose direct, one-stop, and two-stop journeys (pure algorithm).
5. Filter by budget / max duration, score with the strategy matching the
   requested preference, sort best-first, truncate to ``MAX_RESULTS``.
6. Persist journeys to Redis (for GET /journey/{id}), audit the search in
   Postgres, cache the result.

Provider failures are isolated: a provider that raises or exceeds the
timeout contributes no segments instead of failing the whole search.
Prices are per passenger; the budget filter compares per-passenger totals.
"""

import asyncio
import logging
import uuid
from collections.abc import Awaitable, Mapping, Sequence
from datetime import date, datetime, timedelta, timezone

from app.algorithms.route_composer import CompositionConfig, compose_journeys
from app.algorithms.scoring import ScoringStrategy, apply_score
from app.integrations.base import TransportProvider
from app.models.enums import SearchPreference
from app.repositories.city_repository import CityRepository
from app.repositories.journey_repository import JourneyRepository
from app.repositories.search_record_repository import SearchRecordRepository
from app.schemas.journey import Journey
from app.schemas.search import SearchRequest, SearchResult
from app.schemas.segment import RouteSegment
from app.services.exceptions import UnknownLocationError
from app.utils.hashing import search_request_cache_key

logger = logging.getLogger(__name__)

MAX_RESULTS = 50


class SearchService:
    def __init__(
        self,
        providers: Sequence[TransportProvider],
        city_repository: CityRepository,
        journey_repository: JourneyRepository,
        search_record_repository: SearchRecordRepository,
        scoring_strategies: Mapping[SearchPreference, ScoringStrategy],
        composition_config: CompositionConfig | None = None,
        provider_timeout_seconds: float = 8.0,
    ) -> None:
        self._providers = list(providers)
        self._cities = city_repository
        self._journeys = journey_repository
        self._search_records = search_record_repository
        self._scoring_strategies = dict(scoring_strategies)
        self._composition_config = composition_config or CompositionConfig()
        self._provider_timeout = provider_timeout_seconds

    async def search(self, request: SearchRequest) -> SearchResult:
        cache_key = search_request_cache_key(request)
        cached = await self._journeys.get_cached_search_result(cache_key)
        if cached is not None:
            logger.info("Cache hit for %s -> %s", request.origin, request.destination)
            return cached

        await self._validate_locations(request)

        date_batches = await asyncio.gather(
            *(
                self._compose_candidates(request, departure_date)
                for departure_date in self._candidate_dates(request)
            )
        )
        candidates = [journey for batch in date_batches for journey in batch]

        strategy = self._scoring_strategies[request.preference]
        accepted = [
            apply_score(journey, strategy)
            for journey in candidates
            if self._passes_filters(journey, request)
        ]
        accepted.sort(key=lambda journey: journey.score or 0.0, reverse=True)
        accepted = accepted[:MAX_RESULTS]

        result = SearchResult(
            search_id=uuid.uuid4(),
            request=request,
            journeys=accepted,
            total_results=len(accepted),
            searched_at=datetime.now(timezone.utc),
        )

        await self._journeys.save_journeys(accepted)
        await self._journeys.cache_search_result(cache_key, result)
        await self._search_records.create(request, result_count=len(accepted))

        logger.info(
            "Search %s -> %s on %s (%s): %d journeys",
            request.origin,
            request.destination,
            request.departure_date,
            request.preference.value,
            len(accepted),
        )
        return result

    async def _validate_locations(self, request: SearchRequest) -> None:
        for location in (request.origin, request.destination):
            if await self._cities.get_by_name(location) is None:
                raise UnknownLocationError(location)

    @staticmethod
    def _candidate_dates(request: SearchRequest) -> list[date]:
        today = date.today()
        return [
            candidate
            for offset in range(-request.flexible_days, request.flexible_days + 1)
            if (candidate := request.departure_date + timedelta(days=offset)) >= today
        ]

    async def _compose_candidates(
        self, request: SearchRequest, departure_date: date
    ) -> list[Journey]:
        destination_key = request.destination.strip().lower()
        # Connections may roll past midnight: fetch onward legs for the next
        # day too, so an evening arrival can catch a morning departure.
        connection_dates = [departure_date, departure_date + timedelta(days=1)]

        direct_segments, departures = await asyncio.gather(
            self._fetch_segments(
                request.origin, request.destination, [departure_date]
            ),
            self._fetch_departures(request.origin, [departure_date]),
        )
        first_leg_segments = [
            segment
            for segment in departures
            if segment.destination.city_name.lower() != destination_key
        ]

        first_hubs = sorted(
            {segment.destination.city_name.lower() for segment in first_leg_segments}
        )
        mid_leg_batches = await asyncio.gather(
            *(self._fetch_departures(hub, connection_dates) for hub in first_hubs)
        )
        mid_legs_by_city: dict[str, list[RouteSegment]] = {}
        for hub, batch in zip(first_hubs, mid_leg_batches):
            legs = [
                segment
                for segment in batch
                if segment.destination.city_name.lower() != destination_key
            ]
            if legs:
                mid_legs_by_city[hub] = legs

        second_hubs = sorted(
            set(first_hubs)
            | {
                segment.destination.city_name.lower()
                for legs in mid_legs_by_city.values()
                for segment in legs
            }
        )
        second_leg_batches = await asyncio.gather(
            *(
                self._fetch_segments(hub, request.destination, connection_dates)
                for hub in second_hubs
            )
        )
        second_legs_by_city = {
            hub: segments
            for hub, segments in zip(second_hubs, second_leg_batches)
            if segments
        }

        return compose_journeys(
            direct_segments=direct_segments,
            first_leg_segments=first_leg_segments,
            second_legs_by_city=second_legs_by_city,
            mid_legs_by_city=mid_legs_by_city,
            config=self._composition_config,
        )

    async def _fetch_segments(
        self, origin: str, destination: str, dates: Sequence[date]
    ) -> list[RouteSegment]:
        batches = await asyncio.gather(
            *(
                self._safe_provider_call(
                    provider.search_segments(origin, destination, day),
                    provider,
                )
                for provider in self._providers
                for day in dates
            )
        )
        return [segment for batch in batches for segment in batch]

    async def _fetch_departures(
        self, origin: str, dates: Sequence[date]
    ) -> list[RouteSegment]:
        batches = await asyncio.gather(
            *(
                self._safe_provider_call(
                    provider.search_departures(origin, day), provider
                )
                for provider in self._providers
                for day in dates
            )
        )
        return [segment for batch in batches for segment in batch]

    async def _safe_provider_call(
        self,
        call: Awaitable[list[RouteSegment]],
        provider: TransportProvider,
    ) -> list[RouteSegment]:
        """Isolate provider failures: a broken provider yields no segments."""
        try:
            return await asyncio.wait_for(call, timeout=self._provider_timeout)
        except Exception:
            logger.warning(
                "Provider %s failed; search continues without it",
                type(provider).__name__,
                exc_info=True,
            )
            return []

    @staticmethod
    def _passes_filters(journey: Journey, request: SearchRequest) -> bool:
        if request.max_budget is not None and journey.total_price > request.max_budget:
            return False
        if (
            request.max_total_duration_minutes is not None
            and journey.total_duration_minutes > request.max_total_duration_minutes
        ):
            return False
        return True
