"use client";

import { ArrowRight, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { JourneyResults, SearchBanner } from "@/components/journey";
import type { Journey as UIJourney, SearchValues } from "@/components/journey";
import { adaptJourney } from "@/lib/adaptJourney";
import { ApiError, getCities, searchJourneys } from "@/lib/api";
import { KNOWN_CITIES } from "@/lib/cities";
import type { Journey as ApiJourney, SearchResult } from "@/lib/types";

const DEFAULT_SEARCH: SearchValues = {
  origin: "Porto",
  destination: "Tokyo",
  date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  returnDate: new Date(Date.now() + 37 * 86_400_000).toISOString().slice(0, 10),
  tripType: "one_way",
  flexibleDays: 0,
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
  const [cities, setCities] = useState<readonly string[]>(KNOWN_CITIES);

  useEffect(() => {
    getCities()
      .then((fetched) => setCities(fetched.map((city) => city.name).sort()))
      .catch(() => {
        /* keep static fallback when the backend is unreachable */
      });
  }, []);

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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Every way there, in one search
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
          Flights, trains, and buses — automatically combined into the best
          door-to-door journey, ranked by a transparent score.
        </p>
      </header>

      <SearchBanner
        cities={cities}
        defaultValues={DEFAULT_SEARCH}
        onSearch={handleSearch}
      />

      <section className="mt-8 space-y-10">
        <JourneyResults
          journeys={outboundLeg.journeys}
          currencyFor={outboundLeg.currencyFor}
          isLoading={isLoading}
          error={error}
          hasSearched={hasSearched}
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
      </section>
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
