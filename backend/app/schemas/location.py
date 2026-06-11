"""Read schemas for reference entities (cities, airports)."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class CityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    country_code: str = Field(min_length=2, max_length=2)
    timezone: str
    latitude: float
    longitude: float


class AirportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    iata_code: str = Field(min_length=3, max_length=3)
    name: str
    city_id: uuid.UUID
