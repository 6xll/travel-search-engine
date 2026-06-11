"""Data access for City reference entities."""

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.city import City


class CityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_name(self, name: str) -> City | None:
        statement = select(City).where(func.lower(City.name) == name.strip().lower())
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def list_all(self) -> Sequence[City]:
        result = await self._session.execute(select(City).order_by(City.name))
        return result.scalars().all()

    async def count(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(City))
        return result.scalar_one()

    def add(self, city: City) -> None:
        self._session.add(city)
