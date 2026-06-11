"""Route segment schemas — the atomic unit of a multi-modal journey."""

from datetime import datetime
from decimal import Decimal
from typing import Self

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, computed_field, model_validator

from app.models.enums import TransportType


class TransportHub(BaseModel):
    """A boarding/alighting point: airport, bus terminal, train station, or port."""

    model_config = ConfigDict(frozen=True)

    code: str = Field(min_length=2, max_length=8, description="IATA code or station slug")
    name: str = Field(min_length=1, max_length=160)
    city_name: str = Field(min_length=1, max_length=120)
    country_code: str = Field(min_length=2, max_length=2)


class RouteSegment(BaseModel):
    """One leg of a journey on a single vehicle, normalized across providers."""

    model_config = ConfigDict(frozen=True)

    transport_type: TransportType
    carrier_name: str = Field(min_length=1, max_length=80)
    service_number: str = Field(min_length=1, max_length=16)
    origin: TransportHub
    destination: TransportHub
    departure_at: AwareDatetime
    arrival_at: AwareDatetime
    price_amount: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    currency: str = Field(default="EUR", min_length=3, max_length=3)

    @model_validator(mode="after")
    def validate_chronology(self) -> Self:
        if self.arrival_at <= self.departure_at:
            raise ValueError("arrival_at must be after departure_at")
        return self

    @computed_field  # type: ignore[prop-decorator]
    @property
    def duration_minutes(self) -> int:
        return int((self.arrival_at - self.departure_at).total_seconds() // 60)
