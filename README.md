# ✈️ Travel Search Engine 🚌🚆

An intelligent **multi-modal travel search engine**: one search across flights, buses, and trains, automatically combined into complete door-to-door journeys and ranked by a configurable price-to-time score.

Search Porto → Tokyo and get back not just flights, but combinations like *FlixBus to Madrid + Iberia to Tokyo* — scored, sorted, and explained.

```
score=35.15  Porto → Madrid → Tokyo  [flight]      €767.78  17h37  1 layover
score=32.41  Porto → Madrid → Tokyo  [bus+flight]  €684.34  23h29  1 layover
```

## Features

- **Multi-modal composition** — direct, one-stop, and two-stop journeys chaining flights, buses, and trains, with per-mode minimum connection times (60 min before a flight, 30 min before a bus/train) and support for overnight transfers.
- **Transparent scoring** — every journey gets a 0–100 score built from four weighted penalty components (price, in-transit time, wait time, layovers), returned in full as a `score_breakdown` so the ranking is never a black box.
- **Ranking presets** — `balanced`, `cheapest`, or `fastest` per request; each maps to a different weight profile of the same formula.
- **Flexible dates** — search ± up to 3 days around the departure date in one request.
- **Filters** — max budget and max total duration.
- **Resilient fan-out** — providers are queried concurrently with timeouts; a failing provider degrades the result instead of failing the search.
- **Caching & retrieval** — identical searches are served from Redis within a TTL; every composed journey is retrievable by UUID via `GET /journey/{id}`.
- **Modern UI** — Next.js + TailwindCSS interface with journey cards, segment timelines, layover indicators, and live city suggestions.

## Architecture

Strict Clean Architecture / DDD — dependencies point inward, the scoring formula and external providers are swappable behind interfaces.

```
                        ┌─────────────────────────────┐
                        │   Frontend (Next.js, :3001) │
                        └──────────────┬──────────────┘
                                       │ HTTP/JSON
┌──────────────────────────────────────▼──────────────────────────────────────┐
│  Backend (FastAPI, :8000)                                                   │
│                                                                             │
│   api/ (routers)  →  services/ (use cases)  →  repositories/ (data access)  │
│                            │                        │            │          │
│                            ▼                        ▼            ▼          │
│                      algorithms/              PostgreSQL       Redis        │
│                  (pure: scoring +            (reference     (journeys +     │
│                   route composition)          data, audit)   search cache)  │
│                            ▲                                                │
│                            │ normalized RouteSegments                       │
│                      integrations/  ←  TransportProvider port               │
│                 (mock flight / bus / train adapters)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Key decisions:

- **`algorithms/` is pure** — no I/O. The `ScoringStrategy` protocol means a new ranking model (including a future ML ranker) is a drop-in class, not a refactor.
- **Ports & adapters for inventory** — every provider (mock today; Amadeus, FlixBus, rail GDS tomorrow) implements the same `TransportProvider` interface and returns normalized `RouteSegment`s, so composition logic is provider-agnostic.
- **Journeys are segment-based domain objects**, not DB rows — they're composed at search time and stored in Redis with a TTL. This keeps the door open for hidden-city ticketing, open-jaw, and smart stopovers as pure composition strategies.
- **Totals can't drift** — `Journey` exposes `total_price`, `total_wait_minutes`, `layover_count`, etc. as computed fields derived from its segments.

### Scoring formula

Each criterion produces a non-negative weighted penalty; penalties map to a score in (0, 100], **higher is better**:

```
penalty = w_price · (price / ref_price)
        + w_time  · (in_transit_min / ref_min)
        + w_wait  · (wait_min / ref_min)
        + w_layover · layovers

score = 100 / (1 + penalty / scale)
```

The `cheapest` / `fastest` / `balanced` presets are just different `ScoringWeights` instances — see [`backend/app/algorithms/scoring.py`](backend/app/algorithms/scoring.py).

## Tech stack

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2           |
| Data       | PostgreSQL 16, Redis 7                                              |
| Frontend   | Next.js 15 (App Router), React 19, TypeScript, TailwindCSS v4       |
| Infra      | Docker Compose, multi-stage Dockerfiles (dev + production targets)  |
| Tests      | pytest + pytest-asyncio + httpx (26 tests)                          |

## Getting started

Requires Docker Desktop. From the repository root:

```bash
cd docker
cp .env.example .env
docker compose up -d --build
```

Startup is health-check ordered: Postgres and Redis must be healthy before the backend starts (it creates the schema and seeds 12 cities + airports), and the backend must be healthy before the frontend starts.

| Service     | URL                          |
| ----------- | ---------------------------- |
| Frontend    | http://localhost:3001        |
| API         | http://localhost:8000        |
| API docs    | http://localhost:8000/docs   |

> Frontend is published on host port **3001** (3000 is commonly taken by tools like Grafana).

## API

### `POST /search`

```bash
curl -X POST http://localhost:8000/search \
  -H 'Content-Type: application/json' \
  -d '{
    "origin": "Porto",
    "destination": "Tokyo",
    "departure_date": "2026-07-15",
    "max_budget": "1200.00",
    "preference": "cheapest",
    "flexible_days": 1
  }'
```

| Field                        | Type    | Notes                                      |
| ---------------------------- | ------- | ------------------------------------------ |
| `origin` / `destination`     | string  | City name or IATA code, must differ        |
| `departure_date`             | date    | Must not be in the past                    |
| `max_budget`                 | decimal | Optional, per passenger                    |
| `max_total_duration_minutes` | int     | Optional                                   |
| `preference`                 | enum    | `balanced` (default) / `cheapest` / `fastest` |
| `flexible_days`              | int     | 0–3, searches ± N days                     |
| `passengers`                 | int     | 1–9                                        |

Returns scored journeys sorted best-first, each with segments, totals, and the full `score_breakdown`.

### Other endpoints

| Endpoint             | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `GET /journey/{id}`  | Retrieve one composed journey (UUID, expires with TTL)   |
| `GET /cities`        | All cities available in the network                      |
| `GET /health`        | Liveness + per-dependency status (`ok` / `degraded`)     |

## Project structure

```
backend/
  app/
    api/           # Routers + dependency wiring (composition root)
    core/          # Settings, async DB engine, Redis client
    models/        # SQLAlchemy ORM (City, Airport, Flight, BusTrip, SearchRecord)
    schemas/       # Pydantic DTOs (RouteSegment, Journey, SearchRequest/Result)
    services/      # Use cases (SearchService, JourneyService, seeding)
    repositories/  # Postgres repositories + Redis journey store
    algorithms/    # Pure scoring strategies + route composer
    integrations/  # TransportProvider port + mock flight/bus/train adapters
    utils/         # Deterministic hashing helpers
  tests/           # pytest suite (scoring, composition, API)
frontend/
  app/             # Next.js App Router pages
  components/      # SearchForm, JourneyCard, SegmentTimeline, ...
  lib/             # Typed API client, formatting, types
docker/            # Compose stack + env template
```

## Development

Run the backend tests:

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest
```

Run services natively (Postgres/Redis still via Docker):

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
cd backend && uvicorn app.main:app --reload          # API on :8000
cd frontend && npm install && npm run dev            # UI on :3000
```

Mock providers generate **deterministic** schedules (SHA-256-seeded per route + date), so identical searches always return identical inventory — convenient for tests and demos.

### Configuration

All backend settings come from environment variables (see [`docker/.env.example`](docker/.env.example)):

| Variable                   | Default                  | Purpose                          |
| -------------------------- | ------------------------ | -------------------------------- |
| `DATABASE_URL`             | local Postgres           | Async SQLAlchemy DSN             |
| `REDIS_URL`                | `redis://localhost:6379` | Cache + journey store            |
| `CORS_ORIGINS`             | localhost 3000/3001      | Comma-separated allowed origins  |
| `SEARCH_CACHE_TTL_SECONDS` | `300`                    | Search result cache TTL          |
| `JOURNEY_TTL_SECONDS`      | `3600`                   | Journey retrievability window    |
| `PROVIDER_TIMEOUT_SECONDS` | `8.0`                    | Per-provider call timeout        |

## Roadmap

- [ ] Ferry provider (completes all four `TransportType` modes)
- [ ] Result diversity (limit near-duplicate journeys per city-path)
- [ ] Shareable search URLs + journey detail page
- [ ] Price-by-date strip for flexible searches
- [ ] Local-timezone display (city timezones already stored)
- [ ] Alembic migrations (replaces startup `create_all`)
- [ ] OpenAPI-generated frontend types
- [ ] CI (ruff, mypy, pytest, tsc, next build)
- [ ] Real provider adapters behind the existing `TransportProvider` port
- [ ] Smart stopovers, open-jaw, hidden-city as new composition strategies

## License

MIT
