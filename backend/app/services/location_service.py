"""Reference-data use cases (cities, airports)."""

from app.repositories.city_repository import CityRepository
from app.schemas.location import CityRead


class LocationService:
    def __init__(self, city_repository: CityRepository) -> None:
        self._cities = city_repository

    async def list_cities(self) -> list[CityRead]:
        return [
            CityRead.model_validate(city) for city in await self._cities.list_all()
        ]
