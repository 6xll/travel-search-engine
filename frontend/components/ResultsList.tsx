import type { SearchResult } from "@/lib/types";

import { JourneyCard } from "./JourneyCard";

interface ResultsListProps {
  result: SearchResult | null;
  error: string | null;
  isLoading: boolean;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex justify-between">
        <div className="size-12 rounded-xl bg-slate-200" />
        <div className="h-8 w-24 rounded bg-slate-200" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function ResultsList({ result, error, isLoading }: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">Search failed</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
        <p className="text-4xl">🌍</p>
        <p className="mt-2 text-sm">
          Search a route to see the best flight + bus combinations.
        </p>
      </div>
    );
  }

  if (result.journeys.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        <p className="text-4xl">🤷</p>
        <p className="mt-2 text-sm">
          No journeys matched your filters. Try raising the budget or time limit.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        {result.total_results}{" "}
        {result.total_results === 1 ? "journey" : "journeys"} found, best score
        first
      </p>
      <div className="space-y-4">
        {result.journeys.map((journey, index) => (
          <JourneyCard key={journey.id} journey={journey} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}
