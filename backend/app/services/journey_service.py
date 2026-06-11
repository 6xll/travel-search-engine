"""Journey retrieval use case."""

import uuid

from app.repositories.journey_repository import JourneyRepository
from app.schemas.journey import Journey


class JourneyService:
    def __init__(self, journey_repository: JourneyRepository) -> None:
        self._journeys = journey_repository

    async def get_journey(self, journey_id: uuid.UUID) -> Journey | None:
        return await self._journeys.get_journey(journey_id)
