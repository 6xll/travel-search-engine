"use client";

import { Info } from "lucide-react";
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

import type { ScoreBreakdown } from "./types";

interface ScoreTier {
  label: string;
  pill: string;
  dot: string;
}

function tierFor(score: number): ScoreTier {
  if (score >= 80) {
    return {
      label: "Excellent",
      pill: "bg-emerald-600 text-white ring-1 ring-inset ring-emerald-600",
      dot: "bg-white",
    };
  }
  if (score >= 65) {
    return {
      label: "Great",
      pill: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/25",
      dot: "bg-emerald-500",
    };
  }
  return {
    label: "Fair",
    pill: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300",
    dot: "bg-slate-400",
  };
}

const BAR_LABELS: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "price_component", label: "Price" },
  { key: "travel_time_component", label: "Travel time" },
  { key: "wait_time_component", label: "Wait time" },
  { key: "layover_component", label: "Layovers" },
];

interface ScoreBadgeProps {
  score: number;
  breakdown: ScoreBreakdown;
}

export function ScoreBadge({ score, breakdown }: ScoreBadgeProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const tier = tierFor(score);
  const open = hoverOpen || pinned;

  const maxComponent = Math.max(
    breakdown.price_component,
    breakdown.travel_time_component,
    breakdown.wait_time_component,
    breakdown.layover_component,
    0.0001,
  );

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setPinned(false);
      setHoverOpen(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setPinned(false);
      setHoverOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setPinned((value) => !value)}
        className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${tier.pill}`}
      >
        <span className={`size-1.5 rounded-full ${tier.dot}`} aria-hidden />
        <span className="tabular-nums">{Math.round(score)}</span>
        <span className="opacity-90">· {tier.label}</span>
        <Info className="size-3 opacity-70 transition group-hover:opacity-100" aria-hidden />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Score breakdown"
          className="absolute right-0 top-full z-30 mt-2 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5"
        >
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-slate-900">Score breakdown</p>
            <p className="text-xs text-slate-400">out of 100</p>
          </div>

          <ul className="space-y-2.5">
            {BAR_LABELS.map(({ key, label }) => {
              const value = breakdown[key];
              const width = Math.round((value / maxComponent) * 100);
              return (
                <li key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{label}</span>
                    <span className="tabular-nums text-slate-400">
                      {value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-700 transition-[width] duration-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            Higher score means better overall value. Each bar is a penalty —{" "}
            <span className="font-medium text-slate-600">shorter is better</span>.
          </p>
        </div>
      )}
    </div>
  );
}
