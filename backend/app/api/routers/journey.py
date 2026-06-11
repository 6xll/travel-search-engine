"""GET /journey/{journey_id} — retrieve a previously composed journey."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_journey_service
from app.schemas.journey import Journey
from app.services import JourneyService

router = APIRouter(tags=["journeys"])


@router.get(
    "/journey/{journey_id}",
    response_model=Journey,
    summary="Get one journey by id (journeys expire with their TTL)",
)
async def get_journey(
    journey_id: uuid.UUID,
    service: Annotated[JourneyService, Depends(get_journey_service)],
) -> Journey:
    journey = await service.get_journey(journey_id)
    if journey is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found or expired",
        )
    return journey
