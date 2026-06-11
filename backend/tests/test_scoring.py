"""Unit tests for the scoring strategies and presets."""

from app.algorithms.scoring import (
    PRESET_WEIGHTS,
    ScoringWeights,
    WeightedScoringStrategy,
    apply_score,
    build_scoring_strategies,
)
from app.models.enums import SearchPreference, TransportType
from app.schemas.journey import Journey

from tests.conftest import make_segment


def _journey(*, price: str, duration_minutes: int) -> Journey:
    return Journey(
        segments=[
            make_segment("Porto", "Tokyo", duration_minutes=duration_minutes, price=price)
        ]
    )


class TestWeightedScoringStrategy:
    def test_components_match_formula(self) -> None:
        weights = ScoringWeights()
        strategy = WeightedScoringStrategy(weights)
        journey = _journey(price="200.00", duration_minutes=120)

        breakdown = strategy.score(journey)

        assert breakdown.price_component == weights.price_weight * (200 / 100)
        assert breakdown.travel_time_component == weights.travel_time_weight * (120 / 60)
        assert breakdown.wait_time_component == 0
        assert breakdown.layover_component == 0
        expected_penalty = breakdown.price_component + breakdown.travel_time_component
        assert breakdown.final_score == round(
            100 / (1 + expected_penalty / weights.penalty_scale), 2
        )

    def test_score_bounded_and_monotonic(self) -> None:
        strategy = WeightedScoringStrategy()
        cheap = strategy.score(_journey(price="50.00", duration_minutes=60))
        pricey = strategy.score(_journey(price="900.00", duration_minutes=60))
        assert 0 < pricey.final_score < cheap.final_score <= 100

    def test_wait_and_layovers_penalized(self) -> None:
        strategy = WeightedScoringStrategy()
        direct = _journey(price="100.00", duration_minutes=300)
        connecting = Journey(
            segments=[
                make_segment("Porto", "Madrid", duration_minutes=100, price="50.00"),
                make_segment(
                    "Madrid", "Tokyo",
                    depart_offset_minutes=100 + 90,
                    duration_minutes=110,
                    price="50.00",
                ),
            ]
        )
        assert strategy.score(connecting).final_score < strategy.score(direct).final_score

    def test_apply_score_returns_copy(self) -> None:
        journey = _journey(price="100.00", duration_minutes=60)
        scored = apply_score(journey, WeightedScoringStrategy())
        assert journey.score is None
        assert scored.score is not None
        assert scored.score_breakdown is not None
        assert scored.score == scored.score_breakdown.final_score


class TestPresets:
    def test_all_preferences_have_strategies(self) -> None:
        strategies = build_scoring_strategies()
        assert set(strategies) == set(SearchPreference)
        assert set(PRESET_WEIGHTS) == set(SearchPreference)

    def test_cheapest_prefers_cheap_slow_over_fast_expensive(self) -> None:
        strategies = build_scoring_strategies()
        cheap_slow = _journey(price="60.00", duration_minutes=600)
        fast_expensive = _journey(price="500.00", duration_minutes=120)

        cheapest = strategies[SearchPreference.CHEAPEST]
        fastest = strategies[SearchPreference.FASTEST]

        assert (
            cheapest.score(cheap_slow).final_score
            > cheapest.score(fast_expensive).final_score
        )
        assert (
            fastest.score(fast_expensive).final_score
            > fastest.score(cheap_slow).final_score
        )


def test_bus_flight_combination_scores(
    porto_madrid_tokyo_segments: tuple,
) -> None:
    journey = Journey(segments=list(porto_madrid_tokyo_segments))
    assert journey.transport_types == [TransportType.BUS, TransportType.FLIGHT]
    breakdown = WeightedScoringStrategy().score(journey)
    assert breakdown.wait_time_component > 0
    assert breakdown.layover_component > 0
