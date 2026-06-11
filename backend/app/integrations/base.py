"""Transport provider port (hexagonal architecture).

Every external inventory source — mock or real (Amadeus, FlixBus, rail GDS,
ferry operators) — is an adapter implementing this interface. The search
service only ever sees ``TransportProvider``, so adding a transport mode or
swapping mock for real APIs never touches business logic.
"""

from abc import ABC, abstractmethod
from datetime import date
from typing import ClassVar

from app.models.enums import TransportType
from app.schemas.segment import RouteSegment


class TransportProvider(ABC):
    """Port for searching one transport mode's inventory."""

    transport_type: ClassVar[TransportType]

    @abstractmethod
    async def search_segments(
        self, origin_city: str, destination_city: str, departure_date: date
    ) -> list[RouteSegment]:
        """Return all segments between two cities on a given date."""

    @abstractmethod
    async def search_departures(
        self, origin_city: str, departure_date: date
    ) -> list[RouteSegment]:
        """Return all segments leaving a city on a given date (any destination).

        Used by the route composer to discover one-stop combinations.
        """
