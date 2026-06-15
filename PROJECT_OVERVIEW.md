# Travel Search Engine — Project Overview (for review)

> **Purpose of this document:** a self-contained summary of an MVP, written so a
> reviewer (human or AI) can assess the architecture and code quality without
> cloning the repository. It includes the problem, the design decisions, the
> scoring model, and the most review-worthy code excerpts.
>
> **If you are reviewing this:** I'd value feedback on (1) the architecture and
> separation of concerns, (2) the scoring/route-composition design, (3) anything
> you'd flag as a correctness, scalability, or maintainability risk, and (4) what
> you'd prioritise next. Be critical.

---

## 1. What it does

An **intelligent multi-modal travel search engine**. Given an origin, destination,
and date, it searches across **flights, buses, and trains**, automatically
combines them into complete door-to-door journeys (including connections between
different transport modes), scores each journey, and returns them ranked.

Example — searching **Porto → Tokyo** returns not just flights but combinations:

```
score=35.15  Porto → Madrid → Tokyo  [flight]      €767.78  17h37  1 layover
score=32.41  Porto → Madrid → Tokyo  [bus+flight]  €684.34  23h29  1 layover
```

The user can bias ranking toward `cheapest`, `fastest`, or `balanced`, set a
budget/time cap, and search flexible dates (± up to 3 days).

**Status:** functional full-stack MVP, runs via Docker Compose, mock data
providers (no real airline APIs yet), 26 passing tests. ~2,050 lines of backend
Python across 49 modules; 17 TypeScript/React files on the frontend.

---

## 2. Tech stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Backend  | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2        |
| Data     | PostgreSQL 16 (reference data + search audit), Redis 7 (cache)   |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, TailwindCSS v4    |
| Infra    | Docker Compose, multi-stage Dockerfiles, health-checked startup  |
| Tests    | pytest + pytest-asyncio + httpx (ASGI integration tests)         |

---

## 3. Architecture

Clean Architecture / DDD. Dependencies point inward; the scoring formula and the
external transport providers are swappable behind interfaces.

```
                         Frontend (Next.js, :3001)
                                  │  HTTP/JSON
 ┌────────────────────────────────▼─────────────────────────────────┐
 │ Backend (FastAPI, :8000)                                          │
 │                                                                   │
 │  api/ (routers)  →  services/ (use cases)  →  repositories/       │
 │                          │                      │        │        │
 │                          ▼                      ▼        ▼        │
 │                    algorithms/             PostgreSQL  Redis      │
 │                (pure: scoring +           (ref data,  (journeys + │
 │                 route composition)         audit)      cache)     │
 │                          ▲                                        │
 │                          │ normalized RouteSegments               │
 │                    integrations/  ←  TransportProvider port       │
 │              (mock flight / bus / train adapters)                 │
 └───────────────────────────────────────────────────────────────────┘
```

**Layer responsibilities**

- **`api/`** — FastAPI routers + dependency wiring (composition root). Translates
  domain exceptions to HTTP status codes; contains no business logic.
- **`services/`** — use cases (orchestration). `SearchService` coordinates
  providers, composition, scoring, caching, and persistence.
- **`repositories/`** — data access. Postgres repos for reference data; a
  Redis-backed store for composed journeys and the search-result cache.
- **`algorithms/`** — **pure, no I/O**: the scoring strategies and the route
  composer. This is where the "intelligence" lives and it is fully unit-testable
  in isolation.
- **`integrations/`** — ports & adapters. Every inventory source implements one
  `TransportProvider` interface and returns normalized `RouteSegment`s.
- **`models/`** (SQLAlchemy ORM) and **`schemas/`** (Pydantic DTOs) are kept
  separate; DTOs are the API contract and the Redis serialization format.

**Three decisions worth scrutinising**

1. **The scoring formula is isolated behind a `Protocol`.** Services depend on
   `ScoringStrategy`, never on a concrete formula — so a future ML ranker is a
   drop-in class, not a refactor.
2. **`Journey` is a domain object, not a DB table.** It is composed at search
   time and stored in Redis with a TTL. Its totals (price, wait time, layovers…)
   are *computed* from its segments, so they cannot drift out of sync. This also
   keeps the door open for hidden-city ticketing, open-jaw, and smart stopovers
   as pure composition strategies over the same segment inputs.
3. **Provider fan-out is concurrent and failure-isolated.** Providers are queried
   with `asyncio.gather` + per-call timeouts; a provider that raises or times out
   contributes zero segments instead of failing the whole search.

---

## 4. The scoring model

Each criterion produces a non-negative **weighted penalty**; penalties are summed
and mapped to a score in (0, 100], where **higher is better**:

```
penalty = w_price   · (total_price       / reference_price)
        + w_time    · (in_transit_minutes / reference_minutes)
        + w_wait    · (total_wait_minutes / reference_minutes)
        + w_layover · layover_count

score   = 100 / (1 + penalty / penalty_scale)
```

The `cheapest` / `fastest` / `balanced` presets are simply different weight
vectors of this one formula (e.g. `cheapest` raises `price_weight` to 2.5 and
drops `travel_time_weight` to 0.3). The full per-criterion breakdown is returned
in the API response, so ranking is never a black box.

### Code: `algorithms/scoring.py` (core)

```python
@runtime_checkable
class ScoringStrategy(Protocol):
    """Anything that can turn a journey into a score breakdown."""
    def score(self, journey: Journey) -> ScoreBreakdown: ...


@final
class WeightedScoringStrategy:
    """Default MVP formula: weighted penalties on price, time, waits, layovers."""

    def __init__(self, weights: ScoringWeights | None = None) -> None:
        self._weights = weights or ScoringWeights()

    def score(self, journey: Journey) -> ScoreBreakdown:
        w = self._weights
        price_component = w.price_weight * (float(journey.total_price) / w.reference_price)
        travel_time_component = w.travel_time_weight * (journey.in_transit_minutes / w.reference_minutes)
        wait_time_component = w.wait_time_weight * (journey.total_wait_minutes / w.reference_minutes)
        layover_component = w.layover_weight * journey.layover_count

        total_penalty = (price_component + travel_time_component
                         + wait_time_component + layover_component)
        final_score = 100.0 / (1.0 + total_penalty / w.penalty_scale)

        return ScoreBreakdown(
            price_component=round(price_component, 4),
            travel_time_component=round(travel_time_component, 4),
            wait_time_component=round(wait_time_component, 4),
            layover_component=round(layover_component, 4),
            final_score=round(final_score, 2),
        )
```

---

## 5. The journey domain object

`Journey` holds only its `segments` and an optional score; everything else is a
**computed field** derived from the segments, so totals can never disagree with
the parts. Continuity (chronological order + each segment departing from the
previous one's city) is enforced by a validator.

### Code: `schemas/journey.py` (excerpt)

```python
class Journey(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    segments: list[RouteSegment] = Field(min_length=1)
    score: float | None = Field(default=None, ge=0)
    score_breakdown: ScoreBreakdown | None = None

    @model_validator(mode="after")
    def validate_segment_continuity(self) -> Self:
        for previous, current in zip(self.segments, self.segments[1:]):
            if current.departure_at < previous.arrival_at:
                raise ValueError("segments must be chronologically ordered without overlaps")
            if current.origin.city_name != previous.destination.city_name:
                raise ValueError("each segment must depart from the previous segment's destination city")
        return self

    @computed_field
    @property
    def total_duration_minutes(self) -> int:
        """Door-to-door: first departure to last arrival, waits included."""
        return int((self.segments[-1].arrival_at - self.segments[0].departure_at).total_seconds() // 60)

    @computed_field
    @property
    def total_wait_minutes(self) -> int:
        return self.total_duration_minutes - self.in_transit_minutes

    @computed_field
    @property
    def layover_count(self) -> int:
        return len(self.segments) - 1
```

---

## 6. Route composition

The composer is pure (no I/O): the service fetches candidate segments from
providers and hands them in; the composer applies connection rules and emits
valid direct, one-stop, and two-stop journeys. Per-mode minimum connection times
(60 min before a flight, 30 before a bus/train) and a max wait window (15h, which
permits overnight transfers) govern which chains are valid.

### Code: `algorithms/route_composer.py` (excerpt)

```python
def _is_valid_connection(inbound, outbound, config) -> bool:
    wait_minutes = (outbound.departure_at - inbound.arrival_at).total_seconds() / 60
    minimum = config.min_connection_minutes.get(outbound.transport_type, 60)
    return minimum <= wait_minutes <= config.max_wait_minutes


def compose_journeys(*, direct_segments, first_leg_segments,
                     second_legs_by_city, mid_legs_by_city=None, config=None):
    """Build all valid direct, one-stop, and two-stop journeys."""
    rules = config or CompositionConfig()
    journeys = [Journey(segments=[s]) for s in direct_segments[:rules.max_candidates]]

    for first_leg in first_leg_segments:                    # one-stop
        hub = first_leg.destination.city_name.lower()
        for second_leg in second_legs_by_city.get(hub, ()):
            if _is_valid_connection(first_leg, second_leg, rules):
                journeys.append(Journey(segments=[first_leg, second_leg]))

    if mid_legs_by_city:                                    # two-stop
        journeys.extend(_compose_two_stop(...))

    return journeys
```

---

## 7. The provider port (ports & adapters)

Every inventory source — mock today, real APIs (Amadeus, FlixBus, rail GDS)
tomorrow — implements this one interface and returns normalized segments. The
search service only ever sees `TransportProvider`.

### Code: `integrations/base.py`

```python
class TransportProvider(ABC):
    """Port for searching one transport mode's inventory."""

    transport_type: ClassVar[TransportType]

    @abstractmethod
    async def search_segments(self, origin_city: str, destination_city: str,
                              departure_date: date) -> list[RouteSegment]:
        """Return all segments between two cities on a given date."""

    @abstractmethod
    async def search_departures(self, origin_city: str,
                                departure_date: date) -> list[RouteSegment]:
        """Return all segments leaving a city on a date (for hub discovery)."""
```

Mock providers generate **deterministic** schedules (SHA-256-seeded per route +
date), so identical searches always return identical inventory — important for
reproducible tests and demos. The current mock network has **12 cities** and
~73 bidirectional routes (102 directional flight legs, 22 bus, 22 train), dense
enough that all 132 city pairs return sensible journeys.

---

## 8. Search orchestration (the use case)

### Code: `services/search_service.py` (the `search` method, condensed)

```python
async def search(self, request: SearchRequest) -> SearchResult:
    cache_key = search_request_cache_key(request)
    if (cached := await self._journeys.get_cached_search_result(cache_key)):
        return cached                                        # Redis cache hit

    await self._validate_locations(request)                  # 404 if unknown city

    # Fan out across every candidate date (flexible_days), concurrently.
    date_batches = await asyncio.gather(
        *(self._compose_candidates(request, day)
          for day in self._candidate_dates(request))
    )
    candidates = [j for batch in date_batches for j in batch]

    strategy = self._scoring_strategies[request.preference]
    accepted = [apply_score(j, strategy) for j in candidates
                if self._passes_filters(j, request)]         # budget / max-duration
    accepted.sort(key=lambda j: j.score or 0.0, reverse=True)
    accepted = accepted[:MAX_RESULTS]

    result = SearchResult(search_id=uuid4(), request=request, journeys=accepted,
                          total_results=len(accepted), searched_at=utcnow())
    await self._journeys.save_journeys(accepted)             # Redis, by UUID + TTL
    await self._journeys.cache_search_result(cache_key, result)
    await self._search_records.create(request, len(accepted))  # Postgres audit
    return result
```

Provider calls inside `_compose_candidates` are wrapped so a single failing
provider is logged and skipped rather than failing the search.

---

## 9. API surface

| Endpoint            | Purpose                                                    |
| ------------------- | --------------------------------------------------------- |
| `POST /search`      | Search journeys. Body: origin, destination, date, budget, max time, `preference`, `flexible_days`, passengers. Returns scored journeys, best first. |
| `GET /journey/{id}` | Retrieve one composed journey by UUID (expires with TTL). |
| `GET /cities`       | All cities in the network (powers the UI dropdown).       |
| `GET /health`       | Liveness + per-dependency status (`ok` / `degraded`).     |

Request validation (distinct endpoints, no past dates, budget > 0, passengers
1–9) is enforced by Pydantic on `SearchRequest` before any business logic runs.

---

## 10. Testing

26 tests, three suites, all passing:

- **`test_scoring.py`** — formula components match the spec; score is bounded and
  monotonic; presets rank as intended (cheapest prefers cheap-slow, fastest
  prefers fast-expensive); waits and layovers are penalised.
- **`test_route_composer.py`** — connection-time rules per mode, max-wait,
  overnight windows, two-stop chains, loop rejection, candidate cap.
- **`test_api.py`** — full ASGI integration with stubbed Postgres/Redis: sorting,
  preference effects, flexible-date widening, budget filter, 404/422 paths, and a
  deliberately broken provider to prove failure isolation.

---

## 11. Known limitations & roadmap

**Current limitations (by design, for the MVP):**

- Mock data only — no real airline/rail APIs (but the port is ready for them).
- Schema is created at startup via `create_all`; no Alembic migrations yet.
- Frontend mirrors backend types by hand (no OpenAPI codegen).
- No auth, rate limiting, or pagination.
- Results can contain near-duplicate journeys (same path, departures minutes apart).

**Prioritised next steps:**

1. CI (ruff, mypy — config exists but isn't enforced — pytest, tsc, next build).
2. Result diversity (cap near-duplicates per city-path).
3. Real provider adapters behind the existing `TransportProvider` port.
4. Alembic migrations; OpenAPI-generated frontend types.
5. Two-stop scaling: move from pairwise composition to a time-dependent graph
   search if the city network grows large.
6. Ferry provider (completes all four `TransportType` modes), smart stopovers,
   open-jaw, and hidden-city as new composition strategies.

---

## 12. Specific questions for the reviewer

1. Is the **penalty-to-score mapping** (`100 / (1 + penalty/scale)`) a sound
   choice, or would a different normalisation rank more intuitively?
2. The composer is **pairwise** (direct/one-stop/two-stop) rather than a general
   graph search. At what network size does that break down, and is the current
   structure a reasonable stopping point for an MVP?
3. Storing composed journeys in **Redis with a TTL** (instead of Postgres) — good
   trade-off, or a source of confusing 404s when links are shared after expiry?
4. Any **concurrency or correctness** risks in the `asyncio.gather` fan-out and
   the failure-isolation wrapper?
5. What would you cut or simplify to make this a *tighter* MVP?
```
