"""Idempotent reference-data seeding from the mock network.

Runs at application startup so cities and airports exist in Postgres for
location validation. Skips silently when data is already present.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.mock_data import CITIES
from app.models.airport import Airport
from app.models.city import City
from app.repositories.city_repository import CityRepository

logger = logging.getLogger(__name__)


async def seed_reference_data(session: AsyncSession) -> None:
    repository = CityRepository(session)
    if await repository.count() > 0:
        logger.debug("Reference data already seeded; skipping")
        return

    for mock_city in CITIES.values():
        city = City(
            name=mock_city.name,
            country_code=mock_city.country_code,
            timezone=mock_city.timezone,
            latitude=mock_city.latitude,
            longitude=mock_city.longitude,
        )
        session.add(city)
        session.add(
            Airport(
                iata_code=mock_city.airport_iata,
                name=mock_city.airport_name,
                city=city,
            )
        )

    await session.commit()
    logger.info("Seeded %d cities with airports", len(CITIES))
