import { formatDuration, formatMoney } from "@/lib/format";
import type { Journey } from "@/lib/types";

import { SegmentTimeline } from "./SegmentTimeline";

function scoreColor(score: number): string {
  if (score >= 40) return "bg-emerald-500";
  if (score >= 25) return "bg-blue-500";
  return "bg-slate-400";
}

export function JourneyCard({ journey, rank }: { journey: Journey; rank: number }) {
  const score = journey.score ?? 0;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-12 flex-col items-center justify-center rounded-xl text-white ${scoreColor(score)}`}
            title="Journey score (higher is better)"
          >
            <span className="text-sm font-bold leading-none">{score.toFixed(1)}</span>
            <span className="text-[9px] uppercase opacity-80">score</span>
          </div>
          {rank === 1 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Best option
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {formatMoney(journey.total_price, journey.currency)}
          <span className="ml-1 text-xs font-normal text-slate-400">per person</span>
        </p>
      </header>

      <SegmentTimeline segments={journey.segments} />

      <footer className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          <strong className="font-semibold text-slate-700">
            {formatDuration(journey.total_duration_minutes)}
          </strong>{" "}
          door to door
        </span>
        <span>
          <strong className="font-semibold text-slate-700">
            {formatDuration(journey.in_transit_minutes)}
          </strong>{" "}
          in transit
        </span>
        <span>
          <strong className="font-semibold text-slate-700">
            {formatDuration(journey.total_wait_minutes)}
          </strong>{" "}
          waiting
        </span>
        <span>
          <strong className="font-semibold text-slate-700">{journey.layover_count}</strong>{" "}
          {journey.layover_count === 1 ? "layover" : "layovers"}
        </span>
      </footer>
    </article>
  );
}
