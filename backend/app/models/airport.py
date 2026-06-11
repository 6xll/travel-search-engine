"""Airport reference entity."""

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.city import City


class Airport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "airports"

    iata_code: Mapped[str] = mapped_column(String(3), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    city: Mapped[City] = relationship(back_populates="airports")

    def __repr__(self) -> str:
        return f"<Airport {self.iata_code}>"
