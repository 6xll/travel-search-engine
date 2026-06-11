"""Mock train inventory adapter (stand-in for rail GDS APIs)."""

from typing import ClassVar

from app.integrations.mock_data import CITIES, TRAIN_ROUTES, MockCity
from app.integrations.mock_provider import MockScheduleProvider
from app.models.enums import TransportType
from app.schemas.segment import TransportHub


class MockTrainProvider(MockScheduleProvider):
    transport_type: ClassVar[TransportType] = TransportType.TRAIN

    def __init__(self) -> None:
        super().__init__(routes=TRAIN_ROUTES, cities=CITIES)

    def _build_hub(self, city: MockCity) -> TransportHub:
        return TransportHub(
            code=f"{city.airport_iata}-CS",
            name=f"{city.name} Central Station",
            city_name=city.name,
            country_code=city.country_code,
        )
