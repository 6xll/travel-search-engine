"""GET /cities — reference data for search inputs."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_location_service
from app.schemas.location import CityRead
from app.services import LocationService

router = APIRouter(tags=["locations"])


@router.get(
    "/cities",
    response_model=list[CityRead],
    summary="List all cities available in the network",
)
async def list_cities(
    service: Annotated[LocationService, Depends(get_location_service)],
) -> list[CityRead]:
    return await service.list_cities()
