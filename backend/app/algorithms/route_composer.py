"""Pure route composition: combine provider segments into candidate journeys.

This module has no I/O. The service layer fetches candidate segments from
providers and hands them in; the composer applies connection rules and emits
valid ``Journey`` objects: direct, one-stop, and two-stop. Overnight
connections are supported via ``max_wait_minutes`` (waits are penalized by
scoring, not forbidden). Future strategies — smart stopovers, open jaw,
hidden city — are additional composition functions over the same inputs.
"""

from collections.abc import Mapping, Sequence

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TransportType
from app.schemas.journey import Journey
from app.schemas.segment import RouteSegment

DEFAULT_MIN_CONNECTION_MINUTES: dict[TransportType, int] = {
    TransportType.FLIGHT: 60,
    TransportType.TRAIN: 30,
    TransportType.BUS: 30,
    TransportType.FERRY: 45,
}


class CompositionConfig(BaseModel):
    """Connection rules applied when chaining segments."""

    model_config = ConfigDict(frozen=True)

    min_connection_minutes: Mapping[TransportType, int] = Field(
        default_factory=lambda: dict(DEFAULT_MIN_CONNECTION_MINUTES),
        description="Minimum transfer time, keyed by the *outgoing* segment's mode",
    )
    max_wait_minutes: int = Field(
        default=900,
        gt=0,
        description="Maximum transfer wait; 15h allows overnight connections",
    )
    max_candidates: int = Field(
        default=500,
        gt=0,
        description="Hard cap on composed journeys before scoring",
    )


def _is_valid_connection(
    inbound: RouteSegment, outbound: RouteSegment, config: CompositionConfig
) -> bool:
    wait_minutes = (
        outbound.departure_at - inbound.arrival_at
    ).total_seconds() / 60
    minimum = config.min_connection_minutes.get(outbound.transport_type, 60)
    return minimum <= wait_minutes <= config.max_wait_minutes


def compose_journeys(
    *,
    direct_segments: Sequence[RouteSegment],
    first_leg_segments: Sequence[RouteSegment],
    second_legs_by_city: Mapping[str, Sequence[RouteSegment]],
    mid_legs_by_city: Mapping[str, Sequence[RouteSegment]] | None = None,
    config: CompositionConfig | None = None,
) -> list[Journey]:
    """Build all valid direct, one-stop, and two-stop journeys.

    Args:
        direct_segments: Segments going straight from origin to destination.
        first_leg_segments: Segments leaving the origin towards any hub city.
        second_legs_by_city: Segments towards the destination, keyed by the
            (lowercased) hub city they depart from.
        mid_legs_by_city: Optional intermediate segments (hub to hub), keyed
            by their departure city; enables two-stop journeys.
        config: Connection rules; defaults apply when omitted.
    """
    rules = config or CompositionConfig()
    journeys: list[Journey] = [
        Journey(segments=[segment])
        for segment in direct_segments[: rules.max_candidates]
    ]

    for first_leg in first_leg_segments:
        if len(journeys) >= rules.max_candidates:
            return journeys
        hub_city_key = first_leg.destination.city_name.lower()
        for second_leg in second_legs_by_city.get(hub_city_key, ()):
            if _is_valid_connection(first_leg, second_leg, rules):
                journeys.append(Journey(segments=[first_leg, second_leg]))
                if len(journeys) >= rules.max_candidates:
                    return journeys

    if mid_legs_by_city:
        journeys.extend(
            _compose_two_stop(
                first_leg_segments, mid_legs_by_city, second_legs_by_city,
                rules, budget=rules.max_candidates - len(journeys),
            )
        )

    return journeys


def _compose_two_stop(
    first_leg_segments: Sequence[RouteSegment],
    mid_legs_by_city: Mapping[str, Sequence[RouteSegment]],
    second_legs_by_city: Mapping[str, Sequence[RouteSegment]],
    rules: CompositionConfig,
    budget: int,
) -> list[Journey]:
    journeys: list[Journey] = []
    for first_leg in first_leg_segments:
        origin_key = first_leg.origin.city_name.lower()
        first_hub_key = first_leg.destination.city_name.lower()
        for mid_leg in mid_legs_by_city.get(first_hub_key, ()):
            second_hub_key = mid_leg.destination.city_name.lower()
            # Skip loops and chains whose middle stop has no way onward.
            if second_hub_key in (origin_key, first_hub_key):
                continue
            if second_hub_key not in second_legs_by_city:
                continue
            if not _is_valid_connection(first_leg, mid_leg, rules):
                continue
            for second_leg in second_legs_by_city[second_hub_key]:
                if _is_valid_connection(mid_leg, second_leg, rules):
                    journeys.append(
                        Journey(segments=[first_leg, mid_leg, second_leg])
                    )
                    if len(journeys) >= budget:
                        return journeys
    return journeys
