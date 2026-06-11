"""GET /health — liveness and dependency status."""

import logging

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import engine
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: str
    database: bool
    redis: bool


@router.get("/health", response_model=HealthStatus, summary="Service health check")
async def health_check() -> HealthStatus:
    database_ok = False
    redis_ok = False

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        logger.exception("Database health check failed")

    try:
        redis_ok = bool(await get_redis().ping())
    except Exception:
        logger.exception("Redis health check failed")

    status = "ok" if database_ok and redis_ok else "degraded"
    return HealthStatus(status=status, database=database_ok, redis=redis_ok)
