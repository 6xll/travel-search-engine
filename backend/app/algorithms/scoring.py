"""Journey scoring strategies.

The scoring formula is intentionally isolated behind the ``ScoringStrategy``
protocol: services depend on the protocol, never on a concrete formula, so a
new ranking model (e.g. an ML-based scorer) is a drop-in replacement.

Semantics of ``WeightedScoringStrategy``:
- Each criterion (price, in-transit time, wait time, layovers) produces a
  non-negative weighted *penalty* component.
- Penalties are summed and mapped to a final score in (0, 100], where
  **higher is better**: ``score = 100 / (1 + total_penalty / penalty_scale)``.
- ``price_weight`` vs ``travel_time_weight`` is the cost/time ratio knob:
  raising one relative to the other shifts ranking between "cheapest" and
  "fastest" itineraries.
"""

from typing import Protocol, final, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SearchPreference
from app.schemas.journey import Journey, ScoreBreakdown


class ScoringWeights(BaseModel):
    """Tunable parameters for the weighted scoring formula."""

    model_config = ConfigDict(frozen=True)

    price_weight: float = Field(default=1.0, ge=0)
    travel_time_weight: float = Field(default=0.5, ge=0)
    wait_time_weight: float = Field(default=0.7, ge=0)
    layover_weight: float = Field(default=1.5, ge=0)

    reference_price: float = Field(
        default=100.0,
        gt=0,
        description="Price (in journey currency units) worth one penalty point",
    )
    reference_minutes: float = Field(
        default=60.0,
        gt=0,
        description="Duration worth one penalty point",
    )
    penalty_scale: float = Field(
        default=10.0,
        gt=0,
        description="Total penalty that halves the final score",
    )


@runtime_checkable
class ScoringStrategy(Protocol):
    """Anything that can turn a journey into a score breakdown."""

    def score(self, journey: Journey) -> ScoreBreakdown: ...


@final
class WeightedScoringStrategy:
    """Default MVP formula: weighted penalties on price, time, waits, layovers."""

    def __init__(self, weights: ScoringWeights | None = None) -> None:
        self._weights = weights or ScoringWeights()

    @property
    def weights(self) -> ScoringWeights:
        return self._weights

    def score(self, journey: Journey) -> ScoreBreakdown:
        weights = self._weights

        price_component = weights.price_weight * (
            float(journey.total_price) / weights.reference_price
        )
        travel_time_component = weights.travel_time_weight * (
            journey.in_transit_minutes / weights.reference_minutes
        )
        wait_time_component = weights.wait_time_weight * (
            journey.total_wait_minutes / weights.reference_minutes
        )
        layover_component = weights.layover_weight * journey.layover_count

        total_penalty = (
            price_component
            + travel_time_component
            + wait_time_component
            + layover_component
        )
        final_score = 100.0 / (1.0 + total_penalty / weights.penalty_scale)

        return ScoreBreakdown(
            price_component=round(price_component, 4),
            travel_time_component=round(travel_time_component, 4),
            wait_time_component=round(wait_time_component, 4),
            layover_component=round(layover_component, 4),
            final_score=round(final_score, 2),
        )


def apply_score(journey: Journey, strategy: ScoringStrategy) -> Journey:
    """Return a copy of the journey with score and breakdown filled in."""
    breakdown = strategy.score(journey)
    return journey.model_copy(
        update={"score": breakdown.final_score, "score_breakdown": breakdown}
    )


PRESET_WEIGHTS: dict[SearchPreference, ScoringWeights] = {
    SearchPreference.BALANCED: ScoringWeights(),
    SearchPreference.CHEAPEST: ScoringWeights(
        price_weight=2.5,
        travel_time_weight=0.3,
        wait_time_weight=0.4,
        layover_weight=0.8,
    ),
    SearchPreference.FASTEST: ScoringWeights(
        price_weight=0.25,
        travel_time_weight=1.6,
        wait_time_weight=1.4,
        layover_weight=2.5,
    ),
}


def build_scoring_strategies() -> dict[SearchPreference, ScoringStrategy]:
    """One strategy per user-facing preset; strategies are stateless."""
    return {
        preference: WeightedScoringStrategy(weights)
        for preference, weights in PRESET_WEIGHTS.items()
    }
