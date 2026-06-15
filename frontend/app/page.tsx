"use client";

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
  passengers: 1,
  preference: "balanced",
};

export default function HomePage() {
  const [result, setResult] = useState<SearchResult | null>(null);
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
    setError(null);
    try {
      setResult(
        await searchJourneys({
          origin: values.origin,
          destination: values.destination,
          departure_date: values.date,
          passengers: values.passengers,
          preference: values.preference,
        }),
      );
    } catch (caught) {
      setResult(null);
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

  // Map backend journeys to the UI schema, remembering currency per journey.
  const { journeys, currencyById } = useMemo(() => {
    const currencyMap = new Map<string, string>();
    const adapted: UIJourney[] = (result?.journeys ?? []).map(
      (journey: ApiJourney) => {
        currencyMap.set(journey.id, journey.currency);
        return adaptJourney(journey);
      },
    );
    return { journeys: adapted, currencyById: currencyMap };
  }, [result]);

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

      <section className="mt-8">
        <JourneyResults
          journeys={journeys}
          currencyFor={(journey) => currencyById.get(journey.id) ?? "EUR"}
          isLoading={isLoading}
          error={error}
          hasSearched={hasSearched}
        />
      </section>
    </main>
  );
}
