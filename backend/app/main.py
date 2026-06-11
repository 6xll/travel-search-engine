"""Application entrypoint and lifespan management."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import health, journey, locations, search
from app.core.config import get_settings
from app.core.database import async_session_factory, engine
from app.core.redis import close_redis
from app.models.base import Base
from app.services import seed_reference_data

settings = get_settings()

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # MVP simplification: create the schema directly. Alembic migrations
    # replace this once the schema needs to evolve in place.
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with async_session_factory() as session:
        await seed_reference_data(session)
    logger.info("%s started (%s)", settings.app_name, settings.app_env.value)

    yield

    await close_redis()
    await engine.dispose()
    logger.info("%s stopped", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="Intelligent multi-modal travel search: flights, buses, and more.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(search.router)
app.include_router(journey.router)
app.include_router(locations.router)
