"""Pydantic schemas: API contracts and domain DTOs."""

from app.schemas.journey import Journey, ScoreBreakdown
from app.schemas.location import AirportRead, CityRead
from app.schemas.search import SearchRequest, SearchResult
from app.schemas.segment import RouteSegment, TransportHub

__all__ = [
    "AirportRead",
    "CityRead",
    "Journey",
    "RouteSegment",
    "ScoreBreakdown",
    "SearchRequest",
    "SearchResult",
    "TransportHub",
]
