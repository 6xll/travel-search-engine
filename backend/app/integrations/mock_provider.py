"""Shared engine for mock transport providers.

Generates deterministic schedules: the same (route, date) always yields the
same departures and prices, via SHA-256-seeded RNG. A small artificial
latency mimics a real network call so concurrency behavior is realistic.
"""

import asyncio
import random
from abc import abstractmethod
from collections.abc import Mapping, Sequence
from datetime import date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from app.integrations.base import TransportProvider
from app.integrations.mock_data import MockCity, MockRoute
from app.schemas.segment import RouteSegment, TransportHub
from app.utils.hashing import stable_seed

_SCHEDULE_WINDOW_START = time(hour=6)
_SCHEDULE_WINDOW_MINUTES = 16 * 60  # departures spread between 06:00 and 22:00
_SIMULATED_LATENCY_SECONDS = (0.02, 0.08)


class MockScheduleProvider(TransportProvider):
    """Base mock adapter; subclasses supply routes and hub representation."""

    def __init__(
        self, routes: Sequence[MockRoute], cities: Mapping[str, MockCity]
    ) -> None:
        self._routes = list(routes)
        self._cities = dict(cities)

    @abstractmethod
    def _build_hub(self, city: MockCity) -> TransportHub:
        """Map a city to this mode's boarding point (airport, terminal...)."""

    def _resolve_city_key(self, query: str) -> str | None:
        """Match a user-supplied city name or IATA code to a network key."""
        normalized = query.strip().lower()
        if normalized in self._cities:
            return normalized
        for key, city in self._cities.items():
            if city.airport_iata.lower() == normalized:
                return key
        return None

    async def search_segments(
        self, origin_city: str, destination_city: str, departure_date: date
    ) -> list[RouteSegment]:
        await self._simulate_latency()
        origin_key = self._resolve_city_key(origin_city)
        destination_key = self._resolve_city_key(destination_city)
        if origin_key is None or destination_key is None:
            return []
        return [
            segment
            for route in self._routes
            if route.origin_key == origin_key
            and route.destination_key == destination_key
            for segment in self._generate_route_segments(route, departure_date)
        ]

    async def search_departures(
        self, origin_city: str, departure_date: date
    ) -> list[RouteSegment]:
        await self._simulate_latency()
        origin_key = self._resolve_city_key(origin_city)
        if origin_key is None:
            return []
        return [
            segment
            for route in self._routes
            if route.origin_key == origin_key
            for segment in self._generate_route_segments(route, departure_date)
        ]

    def _generate_route_segments(
        self, route: MockRoute, departure_date: date
    ) -> list[RouteSegment]:
        rng = random.Random(
            stable_seed(
                self.transport_type.value,
                route.origin_key,
                route.destination_key,
                route.carrier_code,
                departure_date.isoformat(),
            )
        )
        origin_hub = self._build_hub(self._cities[route.origin_key])
        destination_hub = self._build_hub(self._cities[route.destination_key])
        window_start = datetime.combine(
            departure_date, _SCHEDULE_WINDOW_START, tzinfo=timezone.utc
        )
        slot_length = _SCHEDULE_WINDOW_MINUTES // route.daily_departures

        segments: list[RouteSegment] = []
        for slot_index in range(route.daily_departures):
            jitter = rng.randint(-30, 30)
            departure_at = window_start + timedelta(
                minutes=max(0, slot_index * slot_length + slot_length // 2 + jitter)
            )
            duration = route.duration_minutes + rng.randint(-10, 20)
            price_factor = Decimal(str(rng.uniform(0.80, 1.45)))
            price = (route.base_price * price_factor).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            segments.append(
                RouteSegment(
                    transport_type=self.transport_type,
                    carrier_name=route.carrier_name,
                    service_number=f"{route.carrier_code}{rng.randint(100, 999)}",
                    origin=origin_hub,
                    destination=destination_hub,
                    departure_at=departure_at,
                    arrival_at=departure_at + timedelta(minutes=duration),
                    price_amount=price,
                    currency="EUR",
                )
            )
        return segments

    @staticmethod
    async def _simulate_latency() -> None:
        await asyncio.sleep(random.uniform(*_SIMULATED_LATENCY_SECONDS))
