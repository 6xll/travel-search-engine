"""Data access for persisted search records."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_record import SearchRecord
from app.schemas.search import SearchRequest


class SearchRecordRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, request: SearchRequest, result_count: int) -> SearchRecord:
        record = SearchRecord(
            origin_query=request.origin,
            destination_query=request.destination,
            departure_date=request.departure_date,
            max_budget=request.max_budget,
            max_total_duration_minutes=request.max_total_duration_minutes,
            passengers=request.passengers,
            result_count=result_count,
        )
        self._session.add(record)
        await self._session.flush()
        return record
