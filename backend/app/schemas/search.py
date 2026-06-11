"""Search request/result schemas — the public API contract."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import SearchPreference
from app.schemas.journey import Journey


class SearchRequest(BaseModel):
    """Validated input for POST /search."""

    model_config = ConfigDict(frozen=True)

    origin: str = Field(min_length=2, max_length=100, description="Origin city name or IATA code")
    destination: str = Field(
        min_length=2, max_length=100, description="Destination city name or IATA code"
    )
    departure_date: date
    max_budget: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    max_total_duration_minutes: int | None = Field(default=None, gt=0, le=14 * 24 * 60)
    passengers: int = Field(default=1, ge=1, le=9)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    preference: SearchPreference = Field(
        default=SearchPreference.BALANCED,
        description="Ranking preset: cheapest, fastest, or balanced",
    )
    flexible_days: int = Field(
        default=0,
        ge=0,
        le=3,
        description="Also search +/- this many days around the departure date",
    )

    @model_validator(mode="after")
    def validate_distinct_endpoints(self) -> Self:
        if self.origin.strip().lower() == self.destination.strip().lower():
            raise ValueError("origin and destination must differ")
        return self

    @model_validator(mode="after")
    def validate_departure_not_in_past(self) -> Self:
        if self.departure_date < date.today():
            raise ValueError("departure_date must not be in the past")
        return self


class SearchResult(BaseModel):
    """Response for POST /search: scored journeys, best first."""

    search_id: uuid.UUID
    request: SearchRequest
    journeys: list[Journey]
    total_results: int = Field(ge=0)
    searched_at: datetime
