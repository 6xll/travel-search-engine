"""Pure domain algorithms: journey scoring and route composition."""

from app.algorithms.route_composer import CompositionConfig, compose_journeys
from app.algorithms.scoring import (
    PRESET_WEIGHTS,
    ScoringStrategy,
    ScoringWeights,
    WeightedScoringStrategy,
    apply_score,
    build_scoring_strategies,
)

__all__ = [
    "PRESET_WEIGHTS",
    "CompositionConfig",
    "ScoringStrategy",
    "ScoringWeights",
    "WeightedScoringStrategy",
    "apply_score",
    "build_scoring_strategies",
    "compose_journeys",
]
