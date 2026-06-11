"""Domain enumerations shared across models, schemas, and algorithms."""

from enum import Enum


class TransportType(str, Enum):
    FLIGHT = "flight"
    BUS = "bus"
    TRAIN = "train"
    FERRY = "ferry"


class SearchPreference(str, Enum):
    """User-facing ranking presets, mapped to scoring weights."""

    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    BALANCED = "balanced"
