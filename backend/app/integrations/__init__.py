"""External inventory adapters (mock implementations for the MVP)."""

from app.integrations.base import TransportProvider
from app.integrations.mock_bus_provider import MockBusProvider
from app.integrations.mock_flight_provider import MockFlightProvider
from app.integrations.mock_train_provider import MockTrainProvider

__all__ = [
    "MockBusProvider",
    "MockFlightProvider",
    "MockTrainProvider",
    "TransportProvider",
]
