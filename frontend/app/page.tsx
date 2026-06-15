"use client";

import { ArrowRight, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { JourneyResults, RouteMap, SearchBanner } from "@/components/journey";
import type { Journey as UIJourney, SearchValues } from "@/components/journey";
import { adaptJourney } from "@/lib/adaptJourney";
import { ApiError, getCities, searchJourneys } from "@/lib/api";
import type {
  City,
  Journey as ApiJourney,
  SearchResult,
} from "@/lib/types";

const DEFAULT_SEARCH: SearchValues = {
  origin: "Porto",
  destination: "Tokyo",
  date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  returnDate: new Date(Date.now() + 37 * 86_400_000).toISOString().slice(0, 10),
  tripType: "one_way",
  flexibleDays: 0,
  maxBudget: null,
  passengers: 1,
  preference: "balanced",
};

interface AdaptedLeg {
  journeys: UIJourney[];
  currencyFor: (journey: UIJourney) => string;
}

function adaptLeg(result: SearchResult | null): AdaptedLeg {
  const currency = new Map<string, string>();
  const journeys = (result?.journeys ?? []).map((journey: ApiJourney) => {
    currency.set(journey.id, journey.currency);
    return adaptJourney(journey);
  });
  return { journeys, currencyFor: (j) => currency.get(j.id) ?? "EUR" };
}

export default function HomePage() {
  const [outbound, setOutbound] = useState<SearchResult | null>(null);
  const [inbound, setInbound] = useState<SearchResult | null>(null);
  const [lastSearch, setLastSearch] = useState<SearchValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    getCities()
      .then(setCities)
      .catch(() => {
        /* map simply stays at its default view if cities are unavailable */
      });
  }, []);

  const cityNames = useMemo(
    () => cities.map((city) => city.name).sort(),
    [cities],
  );

  const handleSearch = useCallback(async (values: SearchValues) => {
    setIsLoading(true);
    setHasSearched(true);
    setLastSearch(values);
    setError(null);
    try {
      const base = {
        passengers: values.passengers,
        preference: values.preference,
        flexible_days: values.flexibleDays,
        ...(values.maxBudget != null && {
          max_budget: values.maxBudget.toFixed(2),
        }),
      };
      const outboundPromise = searchJourneys({
        ...base,
        origin: values.origin,
        destination: values.destination,
        departure_date: values.date,
      });
      const inboundPromise =
        values.tripType === "round_trip"
          ? searchJourneys({
              ...base,
              origin: values.destination,
              destination: values.origin,
              departure_date: values.returnDate,
            })
          : Promise.resolve(null);

      const [outboundResult, inboundResult] = await Promise.all([
        outboundPromise,
        inboundPromise,
      ]);
      setOutbound(outboundResult);
      setInbound(inboundResult);
      setActiveId(outboundResult.journeys[0]?.id ?? null);
    } catch (caught) {
      setOutbound(null);
      setInbound(null);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the search service. Is the backend running?",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run one search on first load so the page isn't empty.
  const didInitialSearch = useRef(false);
  useEffect(() => {
    if (didInitialSearch.current) return;
    didInitialSearch.current = true;
    void handleSearch(DEFAULT_SEARCH);
  }, [handleSearch]);

  const outboundLeg = useMemo(() => adaptLeg(outbound), [outbound]);
  const inboundLeg = useMemo(() => adaptLeg(inbound), [inbound]);
  const isRoundTrip = lastSearch?.tripType === "round_trip";

  const activeJourney = useMemo(
    () =>
      [...outboundLeg.journeys, ...inboundLeg.journeys].find(
        (journey) => journey.id === activeId,
      ) ?? null,
    [outboundLeg, inboundLeg, activeId],
  );

  const handleActivate = useCallback(
    (journey: UIJourney) => setActiveId(journey.id),
    [],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Every way there, in one search
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Flights, trains, and buses — combined into the best door-to-door
          journey, ranked by a transparent score.
        </p>
      </header>

      <SearchBanner
        cities={cityNames}
        defaultValues={DEFAULT_SEARCH}
        onSearch={handleSearch}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Results — left column */}
        <div className="order-2 space-y-10 lg:order-1">
          <JourneyResults
            journeys={outboundLeg.journeys}
            currencyFor={outboundLeg.currencyFor}
            isLoading={isLoading}
            error={error}
            hasSearched={hasSearched}
            activeId={activeId}
            onActivate={handleActivate}
            heading={
              isRoundTrip && lastSearch ? (
                <LegHeading
                  Icon={PlaneTakeoff}
                  label="Outbound"
                  from={lastSearch.origin}
                  to={lastSearch.destination}
                />
              ) : undefined
            }
          />

          {isRoundTrip && lastSearch && (
            <JourneyResults
              journeys={inboundLeg.journeys}
              currencyFor={inboundLeg.currencyFor}
              isLoading={isLoading}
              error={error}
              hasSearched={hasSearched}
              activeId={activeId}
              onActivate={handleActivate}
              heading={
                <LegHeading
                  Icon={PlaneLanding}
                  label="Return"
                  from={lastSearch.destination}
                  to={lastSearch.origin}
                />
              }
            />
          )}
        </div>

        {/* Map — right column, sticky on desktop */}
        <div className="order-1 lg:order-2">
          <div className="h-72 overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
            <RouteMap cities={cities} journey={activeJourney} />
          </div>
        </div>
      </div>
    </main>
  );
}

function LegHeading({
  Icon,
  label,
  from,
  to,
}: {
  Icon: typeof PlaneTakeoff;
  label: string;
  from: string;
  to: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-indigo-600" aria-hidden />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        {label}
      </h2>
      <span className="flex items-center gap-1 text-sm text-slate-500">
        {from}
        <ArrowRight className="size-3.5 text-slate-400" aria-hidden />
        {to}
      </span>
    </div>
  );
}
