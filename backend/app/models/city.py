"""City reference entity."""

from typing import TYPE_CHECKING

from sqlalchemy import Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.airport import Airport


class City(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("name", "country_code", name="uq_city_name_country"),)

    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    airports: Mapped[list["Airport"]] = relationship(back_populates="city")

    def __repr__(self) -> str:
        return f"<City {self.name} ({self.country_code})>"
