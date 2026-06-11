"""Mock flight inventory adapter (stand-in for Amadeus/Skyscanner-style APIs)."""

from typing import ClassVar

from app.integrations.mock_data import CITIES, FLIGHT_ROUTES, MockCity
from app.integrations.mock_provider import MockScheduleProvider
from app.models.enums import TransportType
from app.schemas.segment import TransportHub


class MockFlightProvider(MockScheduleProvider):
    transport_type: ClassVar[TransportType] = TransportType.FLIGHT

    def __init__(self) -> None:
        super().__init__(routes=FLIGHT_ROUTES, cities=CITIES)

    def _build_hub(self, city: MockCity) -> TransportHub:
        return TransportHub(
            code=city.airport_iata,
            name=city.airport_name,
            city_name=city.name,
            country_code=city.country_code,
        )
