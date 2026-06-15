import { Fragment } from "react";
import { Clock } from "lucide-react";

import { formatDuration, formatTime, minutesBetween } from "./format";
import { MODE_META } from "./mode-meta";
import type { RouteSegment } from "./types";

interface JourneyTimelineProps {
  segments: RouteSegment[];
}

/** Vertical itinerary: transit legs vs. clearly-distinct layover waits. */
export function JourneyTimeline({ segments }: JourneyTimelineProps) {
  const first = segments[0];
  const last = segments[segments.length - 1];

  return (
    <div className="pl-1">
      <StopPoint
        time={formatTime(first.departure_at)}
        city={first.origin_city}
        role="Departure"
      />

      {segments.map((segment, index) => {
        const next = segments[index + 1];
        const isLast = index === segments.length - 1;
        return (
          <Fragment key={segment.id}>
            <TransitLeg segment={segment} />
            {isLast ? (
              <StopPoint
                time={formatTime(segment.arrival_at)}
                city={segment.destination_city}
                role="Arrival"
                terminal
              />
            ) : (
              <LayoverBlock
                city={segment.destination_city}
                arriveAt={segment.arrival_at}
                departAt={next.departure_at}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

interface StopPointProps {
  time: string;
  city: string;
  role: string;
  terminal?: boolean;
}

function StopPoint({ time, city, role, terminal }: StopPointProps) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] items-center gap-x-3">
      <div className="flex justify-center">
        <span
          className={`size-3 rounded-full ring-4 ring-white ${
            terminal ? "bg-slate-900" : "bg-slate-900"
          }`}
          aria-hidden
        />
      </div>
      <div className="flex items-baseline gap-2 py-1">
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {time}
        </span>
        <span className="text-sm font-medium text-slate-900">{city}</span>
        <span className="text-xs text-slate-400">{role}</span>
      </div>
    </div>
  );
}

function TransitLeg({ segment }: { segment: RouteSegment }) {
  const meta = MODE_META[segment.transport_type];
  const Icon = meta.Icon;
  const duration = minutesBetween(segment.departure_at, segment.arrival_at);

  return (
    <div className="grid grid-cols-[1.75rem_1fr] gap-x-3">
      <div className="relative flex justify-center">
        <span
          className={`absolute inset-y-0 border-l-2 ${meta.rail}`}
          aria-hidden
        />
        <span
          className={`relative my-2 inline-flex size-7 items-center justify-center rounded-full ${meta.node}`}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}
        >
          {meta.label}
        </span>
        <span className="text-sm text-slate-600">{segment.provider_name}</span>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs tabular-nums text-slate-500">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}

interface LayoverBlockProps {
  city: string;
  arriveAt: string;
  departAt: string;
}

function LayoverBlock({ city, arriveAt, departAt }: LayoverBlockProps) {
  const wait = minutesBetween(arriveAt, departAt);
  return (
    <div className="grid grid-cols-[1.75rem_1fr] gap-x-3">
      <div className="relative flex justify-center">
        <span
          className="absolute inset-y-0 border-l-2 border-dashed border-slate-300"
          aria-hidden
        />
        <span
          className="relative my-2 inline-flex size-7 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200"
          aria-hidden
        >
          <Clock className="size-3.5" />
        </span>
      </div>
      <div className="py-2">
        <div className="inline-flex flex-col rounded-lg bg-amber-50/70 px-3 py-2 ring-1 ring-inset ring-amber-600/15">
          <span className="text-sm font-medium text-amber-800">
            {formatDuration(wait)} layover in {city}
          </span>
          <span className="mt-0.5 text-xs tabular-nums text-amber-700/70">
            Arrive {formatTime(arriveAt)} · Depart {formatTime(departAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
