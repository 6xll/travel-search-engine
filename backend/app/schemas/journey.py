"""Journey schemas — an ordered composition of route segments with scoring."""

import uuid
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.models.enums import TransportType
from app.schemas.segment import RouteSegment


class ScoreBreakdown(BaseModel):
    """Per-criterion contributions to the final journey score (lower is better)."""

    model_config = ConfigDict(frozen=True)

    price_component: float = Field(ge=0)
    travel_time_component: float = Field(ge=0)
    wait_time_component: float = Field(ge=0)
    layover_component: float = Field(ge=0)
    final_score: float = Field(ge=0)


class Journey(BaseModel):
    """A complete door-to-door itinerary composed of one or more segments."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    segments: list[RouteSegment] = Field(min_length=1)
    score: float | None = Field(default=None, ge=0)
    score_breakdown: ScoreBreakdown | None = None

    @model_validator(mode="after")
    def validate_segment_continuity(self) -> Self:
        for previous, current in zip(self.segments, self.segments[1:]):
            if current.departure_at < previous.arrival_at:
                raise ValueError(
                    "segments must be chronologically ordered without overlaps"
                )
            if current.origin.city_name != previous.destination.city_name:
                raise ValueError(
                    "each segment must depart from the previous segment's destination city"
                )
        return self

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_price(self) -> Decimal:
        return sum((segment.price_amount for segment in self.segments), Decimal("0.00"))

    @computed_field  # type: ignore[prop-decorator]
    @property
    def currency(self) -> str:
        return self.segments[0].currency

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_duration_minutes(self) -> int:
        """Door-to-door duration: first departure to last arrival, waits included."""
        first_departure = self.segments[0].departure_at
        last_arrival = self.segments[-1].arrival_at
        return int((last_arrival - first_departure).total_seconds() // 60)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def in_transit_minutes(self) -> int:
        return sum(segment.duration_minutes for segment in self.segments)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_wait_minutes(self) -> int:
        return self.total_duration_minutes - self.in_transit_minutes

    @computed_field  # type: ignore[prop-decorator]
    @property
    def layover_count(self) -> int:
        return len(self.segments) - 1

    @computed_field  # type: ignore[prop-decorator]
    @property
    def transport_types(self) -> list[TransportType]:
        seen: list[TransportType] = []
        for segment in self.segments:
            if segment.transport_type not in seen:
                seen.append(segment.transport_type)
        return seen
