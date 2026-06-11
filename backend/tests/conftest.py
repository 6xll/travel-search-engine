"""Shared test fixtures and builders."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.models.enums import TransportType
from app.schemas.segment import RouteSegment, TransportHub

BASE_DEPARTURE = datetime(2030, 7, 1, 8, 0, tzinfo=timezone.utc)


def make_hub(city: str) -> TransportHub:
    return TransportHub(
        code=city[:3].upper(),
        name=f"{city} Hub",
        city_name=city,
        country_code="PT",
    )


def make_segment(
    origin: str,
    destination: str,
    *,
    depart_offset_minutes: int = 0,
    duration_minutes: int = 120,
    price: str = "100.00",
    transport_type: TransportType = TransportType.FLIGHT,
) -> RouteSegment:
    departure = BASE_DEPARTURE + timedelta(minutes=depart_offset_minutes)
    return RouteSegment(
        transport_type=transport_type,
        carrier_name="Test Carrier",
        service_number="TC100",
        origin=make_hub(origin),
        destination=make_hub(destination),
        departure_at=departure,
        arrival_at=departure + timedelta(minutes=duration_minutes),
        price_amount=Decimal(price),
        currency="EUR",
    )


@pytest.fixture
def porto_madrid_tokyo_segments() -> tuple[RouteSegment, RouteSegment]:
    first = make_segment("Porto", "Madrid", duration_minutes=300, price="30.00",
                         transport_type=TransportType.BUS)
    second = make_segment("Madrid", "Tokyo", depart_offset_minutes=300 + 120,
                          duration_minutes=840, price="650.00")
    return first, second
