"use client";

import { useCallback, useEffect, useState } from "react";

import { ResultsList } from "@/components/ResultsList";
import { SearchForm } from "@/components/SearchForm";
import { ApiError, getCities, searchJourneys } from "@/lib/api";
import { KNOWN_CITIES } from "@/lib/cities";
import type { SearchRequestPayload, SearchResult } from "@/lib/types";

export default function HomePage() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState<readonly string[]>(KNOWN_CITIES);

  useEffect(() => {
    getCities()
      .then((fetched) => setCities(fetched.map((city) => city.name).sort()))
      .catch(() => {
        // Keep the static fallback list when the backend is unreachable.
      });
  }, []);

  const handleSearch = useCallback(async (payload: SearchRequestPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await searchJourneys(payload));
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          ✈️ Travel Search Engine 🚌🚆
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          One search across flights, buses, and trains — ranked by the best
          price-to-time score.
        </p>
      </header>

      <SearchForm cities={cities} onSearch={handleSearch} isLoading={isLoading} />

      <section className="mt-8">
        <ResultsList result={result} error={error} isLoading={isLoading} />
      </section>
    </main>
  );
}
