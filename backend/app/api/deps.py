"""FastAPI dependency wiring (composition root for request-scoped services)."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.algorithms.scoring import build_scoring_strategies
from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.redis import get_redis
from app.integrations import (
    MockBusProvider,
    MockFlightProvider,
    MockTrainProvider,
    TransportProvider,
)
from app.repositories import (
    CityRepository,
    JourneyRepository,
    SearchRecordRepository,
)
from app.services import JourneyService, LocationService, SearchService

# Providers and scoring strategies are stateless: build once per process.
_providers: list[TransportProvider] = [
    MockFlightProvider(),
    MockBusProvider(),
    MockTrainProvider(),
]
_scoring_strategies = build_scoring_strategies()


def get_journey_repository() -> JourneyRepository:
    settings = get_settings()
    return JourneyRepository(
        redis=get_redis(),
        journey_ttl_seconds=settings.journey_ttl_seconds,
        search_cache_ttl_seconds=settings.search_cache_ttl_seconds,
    )


def get_search_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    journey_repository: Annotated[JourneyRepository, Depends(get_journey_repository)],
) -> SearchService:
    return SearchService(
        providers=_providers,
        city_repository=CityRepository(session),
        journey_repository=journey_repository,
        search_record_repository=SearchRecordRepository(session),
        scoring_strategies=_scoring_strategies,
        provider_timeout_seconds=get_settings().provider_timeout_seconds,
    )


def get_journey_service(
    journey_repository: Annotated[JourneyRepository, Depends(get_journey_repository)],
) -> JourneyService:
    return JourneyService(journey_repository=journey_repository)


def get_location_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> LocationService:
    return LocationService(city_repository=CityRepository(session))
