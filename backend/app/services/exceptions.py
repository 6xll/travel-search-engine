"""Service-layer exceptions, mapped to HTTP errors at the API boundary."""


class ServiceError(Exception):
    """Base class for business-logic errors."""


class UnknownLocationError(ServiceError):
    """Origin or destination is not part of the known network."""

    def __init__(self, location: str) -> None:
        self.location = location
        super().__init__(f"Unknown location: {location!r}")
