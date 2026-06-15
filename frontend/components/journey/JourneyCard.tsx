"use client";

import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { useId, useState, type MouseEvent } from "react";

import { formatDuration, formatMoney, formatTime } from "./format";
import { JourneyTimeline } from "./JourneyTimeline";
import { ScoreBadge } from "./ScoreBadge";
import { TransportMinimap } from "./TransportMinimap";
import type { Journey } from "./types";

interface JourneyCardProps {
  journey: Journey;
  /** Highlight as the top-ranked result. */
  isBest?: boolean;
  /** Currently selected on the map. */
  isActive?: boolean;
  defaultOpen?: boolean;
  currency?: string;
  onActivate?: (journey: Journey) => void;
  onSelect?: (journey: Journey) => void;
}

export function JourneyCard({
  journey,
  isBest = false,
  isActive = false,
  defaultOpen = false,
  currency = "EUR",
  onActivate,
  onSelect,
}: JourneyCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  const first = journey.segments[0];
  const last = journey.segments[journey.segments.length - 1];
  const stopsLabel =
    journey.layover_count === 0
      ? "Direct"
      : `${journey.layover_count} ${journey.layover_count === 1 ? "stop" : "stops"}`;

  function stop(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <article
      className={`group overflow-hidden rounded-2xl border bg-white transition duration-200 ${
        isActive
          ? "border-indigo-400 ring-2 ring-indigo-500/40"
          : isBest
            ? "border-emerald-300 ring-1 ring-emerald-500/40"
            : "border-slate-200"
      } hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5`}
    >
      {isBest && (
        <div className="flex items-center gap-1.5 bg-emerald-50 px-5 py-1.5 text-xs font-semibold text-emerald-700">
          <Sparkles className="size-3.5" aria-hidden />
          Best match
        </div>
      )}

      {/* Header — pointer toggles expand + activates on the map. */}
      <div
        onClick={() => {
          setOpen((value) => !value);
          onActivate?.(journey);
        }}
        className="flex cursor-pointer items-start justify-between gap-4 p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-semibold tabular-nums text-slate-900">
              {formatTime(first.departure_at)}
            </span>
            <span className="truncate text-base font-semibold text-slate-900">
              {first.origin_city}
            </span>
            <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden />
            <span className="text-base font-semibold tabular-nums text-slate-900">
              {formatTime(last.arrival_at)}
            </span>
            <span className="truncate text-base font-semibold text-slate-900">
              {last.destination_city}
            </span>
          </div>

          <div className="mt-3">
            <TransportMinimap segments={journey.segments} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-medium tabular-nums text-slate-700">
              {formatDuration(journey.total_duration_minutes)}
            </span>
            <span aria-hidden>·</span>
            <span>{stopsLabel}</span>
            {journey.total_wait_minutes > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  {formatDuration(journey.total_wait_minutes)} waiting
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span onClick={stop}>
            <ScoreBadge score={journey.score} breakdown={journey.score_breakdown} />
          </span>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
              {formatMoney(journey.total_price, currency)}
            </p>
            <p className="text-xs text-slate-400">per person</p>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={regionId}
            aria-label={open ? "Hide journey details" : "Show journey details"}
            onClick={(event) => {
              stop(event);
              setOpen((value) => !value);
            }}
            className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {open ? "Hide" : "Details"}
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {/* Expandable region — dependency-free height animation via grid-rows. */}
      <div
        id={regionId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <JourneyTimeline segments={journey.segments} />

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onSelect?.(journey)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Select journey
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
