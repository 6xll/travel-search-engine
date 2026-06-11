"""Data access for Airport reference entities."""

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.airport import Airport


class AirportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_iata_code(self, iata_code: str) -> Airport | None:
        statement = select(Airport).where(
            func.upper(Airport.iata_code) == iata_code.strip().upper()
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def list_all(self) -> Sequence[Airport]:
        result = await self._session.execute(select(Airport).order_by(Airport.iata_code))
        return result.scalars().all()

    def add(self, airport: Airport) -> None:
        self._session.add(airport)
