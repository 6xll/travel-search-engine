"""Persisted record of an executed search (audit and analytics)."""

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SearchRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "search_records"

    origin_query: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_query: Mapped[str] = mapped_column(String(100), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    max_budget: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    max_total_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    passengers: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    result_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<SearchRecord {self.origin_query} -> {self.destination_query}>"
