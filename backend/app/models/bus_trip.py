"""Bus trip inventory entity (one scheduled, priced bus departure)."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.city import City


class BusTrip(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "bus_trips"
    __table_args__ = (
        CheckConstraint("arrival_at > departure_at", name="ck_bus_arrival_after_departure"),
        CheckConstraint("price_amount >= 0", name="ck_bus_price_non_negative"),
        CheckConstraint(
            "origin_city_id != destination_city_id",
            name="ck_bus_distinct_cities",
        ),
    )

    service_number: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    operator_name: Mapped[str] = mapped_column(String(80), nullable=False)

    origin_city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination_city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    departure_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    arrival_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    price_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    origin_city: Mapped[City] = relationship(foreign_keys=[origin_city_id])
    destination_city: Mapped[City] = relationship(foreign_keys=[destination_city_id])

    def __repr__(self) -> str:
        return f"<BusTrip {self.service_number} {self.departure_at:%Y-%m-%d %H:%M}>"
