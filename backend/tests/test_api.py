"""API integration tests with stubbed Postgres/Redis infrastructure."""

import uuid
from collections.abc import AsyncIterator
from datetime import date, timedelta

import httpx
import pytest

from app.algorithms.scoring import build_scoring_strategies
from app.api.deps import (
    get_journey_repository,
    get_location_service,
    get_search_service,
)
from app.integrations import MockBusProvider, MockFlightProvider, MockTrainProvider
from app.integrations.base import TransportProvider
from app.integrations.mock_data import CITIES
from app.main import app
from app.schemas.journey import Journey
from app.schemas.location import CityRead
from app.schemas.search import SearchRequest, SearchResult
from app.services import SearchService


class StubCityRepository:
    async def get_by_name(self, name: str) -> object | None:
        return CITIES.get(name.strip().lower())


class StubJourneyRepository:
    def __init__(self) -> None:
        self.journeys: dict[str, str] = {}
        self.cache: dict[str, str] = {}

    async def save_journeys(self, journeys: list[Journey]) -> None:
        for journey in journeys:
            self.journeys[str(journey.id)] = journey.model_dump_json()

    async def get_journey(self, journey_id: uuid.UUID) -> Journey | None:
        payload = self.journeys.get(str(journey_id))
        return Journey.model_validate_json(payload) if payload else None

    async def cache_search_result(self, cache_key: str, result: SearchResult) -> None:
        self.cache[cache_key] = result.model_dump_json()

    async def get_cached_search_result(self, cache_key: str) -> SearchResult | None:
        payload = self.cache.get(cache_key)
        return SearchResult.model_validate_json(payload) if payload else None


class StubSearchRecordRepository:
    def __init__(self) -> None:
        self.records: list[tuple[SearchRequest, int]] = []

    async def create(self, request: SearchRequest, result_count: int) -> None:
        self.records.append((request, result_count))


class BrokenProvider(TransportProvider):
    """Provider that always fails, to exercise failure isolation."""

    transport_type = MockBusProvider.transport_type

    async def search_segments(self, *args: object, **kwargs: object) -> list:
        raise ConnectionError("upstream down")

    async def search_departures(self, *args: object, **kwargs: object) -> list:
        raise ConnectionError("upstream down")


class StubLocationService:
    async def list_cities(self) -> list[CityRead]:
        return [
            CityRead(
                id=uuid.uuid4(),
                name=mock.name,
                country_code=mock.country_code,
                timezone=mock.timezone,
                latitude=mock.latitude,
                longitude=mock.longitude,
            )
            for mock in CITIES.values()
        ]


def build_service(
    journey_repo: StubJourneyRepository,
    records: StubSearchRecordRepository,
    providers: list[TransportProvider] | None = None,
) -> SearchService:
    return SearchService(
        providers=providers
        or [MockFlightProvider(), MockBusProvider(), MockTrainProvider()],
        city_repository=StubCityRepository(),  # type: ignore[arg-type]
        journey_repository=journey_repo,  # type: ignore[arg-type]
        search_record_repository=records,  # type: ignore[arg-type]
        scoring_strategies=build_scoring_strategies(),
        provider_timeout_seconds=5.0,
    )


@pytest.fixture
async def client() -> AsyncIterator[tuple[httpx.AsyncClient, StubJourneyRepository]]:
    journey_repo = StubJourneyRepository()
    records = StubSearchRecordRepository()
    app.dependency_overrides[get_search_service] = lambda: build_service(
        journey_repo, records
    )
    app.dependency_overrides[get_journey_repository] = lambda: journey_repo
    app.dependency_overrides[get_location_service] = lambda: StubLocationService()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http, journey_repo
    app.dependency_overrides.clear()


def search_body(**overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "origin": "Porto",
        "destination": "Tokyo",
        "departure_date": (date.today() + timedelta(days=30)).isoformat(),
    }
    body.update(overrides)
    return body


class TestSearchEndpoint:
    async def test_returns_sorted_journeys(self, client) -> None:
        http, _ = client
        response = await http.post("/search", json=search_body())
        assert response.status_code == 200
        data = response.json()
        assert data["total_results"] == len(data["journeys"]) > 0
        scores = [journey["score"] for journey in data["journeys"]]
        assert scores == sorted(scores, reverse=True)

    async def test_preference_changes_ranking(self, client) -> None:
        http, _ = client
        cheapest = (await http.post(
            "/search", json=search_body(preference="cheapest")
        )).json()
        fastest = (await http.post(
            "/search", json=search_body(preference="fastest")
        )).json()
        cheapest_top_price = float(cheapest["journeys"][0]["total_price"])
        fastest_top_price = float(fastest["journeys"][0]["total_price"])
        fastest_top_duration = fastest["journeys"][0]["total_duration_minutes"]
        cheapest_top_duration = cheapest["journeys"][0]["total_duration_minutes"]
        assert cheapest_top_price <= fastest_top_price
        assert fastest_top_duration <= cheapest_top_duration

    async def test_flexible_days_widen_results(self, client) -> None:
        http, _ = client
        fixed = (await http.post("/search", json=search_body())).json()
        flexible = (await http.post(
            "/search", json=search_body(flexible_days=1)
        )).json()
        assert flexible["total_results"] >= fixed["total_results"]

    async def test_budget_filter_applied(self, client) -> None:
        http, _ = client
        response = await http.post(
            "/search", json=search_body(max_budget="800.00")
        )
        data = response.json()
        assert all(
            float(journey["total_price"]) <= 800 for journey in data["journeys"]
        )

    async def test_unknown_city_returns_404(self, client) -> None:
        http, _ = client
        response = await http.post("/search", json=search_body(origin="Atlantis"))
        assert response.status_code == 404
        assert "Atlantis" in response.json()["detail"]

    async def test_validation_errors_return_422(self, client) -> None:
        http, _ = client
        same_endpoints = await http.post(
            "/search", json=search_body(destination="porto")
        )
        past_date = await http.post(
            "/search", json=search_body(departure_date="2020-01-01")
        )
        assert same_endpoints.status_code == 422
        assert past_date.status_code == 422

    async def test_broken_provider_does_not_fail_search(self, client) -> None:
        http, _ = client
        journey_repo = StubJourneyRepository()
        records = StubSearchRecordRepository()
        app.dependency_overrides[get_search_service] = lambda: build_service(
            journey_repo, records,
            providers=[MockFlightProvider(), BrokenProvider()],
        )
        response = await http.post("/search", json=search_body())
        assert response.status_code == 200
        assert response.json()["total_results"] > 0


class TestJourneyEndpoint:
    async def test_journey_roundtrip(self, client) -> None:
        http, _ = client
        search = (await http.post("/search", json=search_body())).json()
        journey_id = search["journeys"][0]["id"]
        response = await http.get(f"/journey/{journey_id}")
        assert response.status_code == 200
        assert response.json()["id"] == journey_id

    async def test_missing_journey_returns_404(self, client) -> None:
        http, _ = client
        response = await http.get(f"/journey/{uuid.uuid4()}")
        assert response.status_code == 404


class TestCitiesEndpoint:
    async def test_lists_cities(self, client) -> None:
        http, _ = client
        response = await http.get("/cities")
        assert response.status_code == 200
        names = {city["name"] for city in response.json()}
        assert {"Porto", "Tokyo", "Madrid"} <= names
