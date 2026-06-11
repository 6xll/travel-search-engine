import { formatDuration, formatMoney, formatTime } from "@/lib/format";
import type { RouteSegment } from "@/lib/types";

import { TransportBadge } from "./TransportBadge";

function WaitIndicator({ minutes }: { minutes: number }) {
  return (
    <div className="ml-[7px] flex items-center gap-3 border-l-2 border-dotted border-slate-300 py-1.5 pl-5">
      <span className="text-xs text-slate-400">
        ⏱ {formatDuration(minutes)} layover
      </span>
    </div>
  );
}

export function SegmentTimeline({ segments }: { segments: RouteSegment[] }) {
  return (
    <div>
      {segments.map((segment, index) => {
        const previous = segments[index - 1];
        const waitMinutes = previous
          ? Math.round(
              (new Date(segment.departure_at).getTime() -
                new Date(previous.arrival_at).getTime()) /
                60_000,
            )
          : 0;
        return (
          <div key={`${segment.service_number}-${segment.departure_at}`}>
            {index > 0 && <WaitIndicator minutes={waitMinutes} />}
            <div className="flex items-start gap-3">
              <div className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500 ring-4 ring-blue-100" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {formatTime(segment.departure_at)} {segment.origin.city_name}
                    <span className="mx-1.5 text-slate-400">→</span>
                    {formatTime(segment.arrival_at)} {segment.destination.city_name}
                  </span>
                  <TransportBadge type={segment.transport_type} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {segment.carrier_name} {segment.service_number} ·{" "}
                  {segment.origin.code} → {segment.destination.code} ·{" "}
                  {formatDuration(segment.duration_minutes)} ·{" "}
                  {formatMoney(segment.price_amount, segment.currency)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
