"""Flight inventory entity (one scheduled, priced flight instance)."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.airport import Airport
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Flight(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "flights"
    __table_args__ = (
        CheckConstraint("arrival_at > departure_at", name="ck_flight_arrival_after_departure"),
        CheckConstraint("price_amount >= 0", name="ck_flight_price_non_negative"),
        CheckConstraint(
            "origin_airport_id != destination_airport_id",
            name="ck_flight_distinct_airports",
        ),
    )

    flight_number: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    carrier_name: Mapped[str] = mapped_column(String(80), nullable=False)

    origin_airport_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("airports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination_airport_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("airports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    departure_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    arrival_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    price_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    origin_airport: Mapped[Airport] = relationship(foreign_keys=[origin_airport_id])
    destination_airport: Mapped[Airport] = relationship(foreign_keys=[destination_airport_id])

    def __repr__(self) -> str:
        return f"<Flight {self.flight_number} {self.departure_at:%Y-%m-%d %H:%M}>"
