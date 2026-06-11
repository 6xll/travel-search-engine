"""POST /search — multi-modal journey search."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_search_service
from app.schemas.search import SearchRequest, SearchResult
from app.services import SearchService, UnknownLocationError

router = APIRouter(tags=["search"])


@router.post(
    "/search",
    response_model=SearchResult,
    summary="Search multi-modal journeys between two cities",
)
async def search_journeys(
    request: SearchRequest,
    service: Annotated[SearchService, Depends(get_search_service)],
) -> SearchResult:
    try:
        return await service.search(request)
    except UnknownLocationError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
