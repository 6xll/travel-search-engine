"""Mock bus inventory adapter (stand-in for FlixBus/ALSA-style APIs)."""

from typing import ClassVar

from app.integrations.mock_data import BUS_ROUTES, CITIES, MockCity
from app.integrations.mock_provider import MockScheduleProvider
from app.models.enums import TransportType
from app.schemas.segment import TransportHub


class MockBusProvider(MockScheduleProvider):
    transport_type: ClassVar[TransportType] = TransportType.BUS

    def __init__(self) -> None:
        super().__init__(routes=BUS_ROUTES, cities=CITIES)

    def _build_hub(self, city: MockCity) -> TransportHub:
        return TransportHub(
            code=f"{city.airport_iata}-BT",
            name=f"{city.name} Central Bus Terminal",
            city_name=city.name,
            country_code=city.country_code,
        )
