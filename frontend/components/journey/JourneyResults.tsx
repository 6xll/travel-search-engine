"use client";

import { Compass, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { JourneyCard } from "./JourneyCard";
import type { Journey } from "./types";

interface JourneyResultsProps {
  journeys: Journey[];
  currencyFor?: (journey: Journey) => string;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  heading?: ReactNode;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-32 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="ml-auto h-6 w-20 rounded-full bg-slate-200" />
          <div className="ml-auto h-8 w-24 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function JourneyResults({
  journeys,
  currencyFor,
  isLoading,
  error,
  hasSearched,
  heading,
}: JourneyResultsProps) {
  function frame(children: ReactNode) {
    return (
      <div>
        {heading}
        {children}
      </div>
    );
  }

  if (isLoading) {
    return frame(
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>,
    );
  }

  if (error) {
    return frame(
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <SearchX className="mx-auto size-8 text-red-400" aria-hidden />
        <p className="mt-2 font-semibold text-red-800">Search failed</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>,
    );
  }

  if (!hasSearched) {
    return frame(
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
        <Compass className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm text-slate-400">
          Search a route to see the best flight, train, and bus combinations.
        </p>
      </div>,
    );
  }

  if (journeys.length === 0) {
    return frame(
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <SearchX className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm text-slate-500">
          No journeys matched your filters. Try a different date or route.
        </p>
      </div>,
    );
  }

  return frame(
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {journeys.length} {journeys.length === 1 ? "journey" : "journeys"} found ·
        best match first
      </p>
      {journeys.map((journey, index) => (
        <JourneyCard
          key={journey.id}
          journey={journey}
          isBest={index === 0}
          defaultOpen={index === 0}
          currency={currencyFor?.(journey)}
        />
      ))}
    </div>,
  );
}
