import { Fragment } from "react";

import { MODE_META } from "./mode-meta";
import type { RouteSegment } from "./types";

interface TransportMinimapProps {
  segments: RouteSegment[];
  /** Optional compact mode for tight layouts. */
  size?: "sm" | "md";
}

/**
 * Horizontal indicator of the modes used, in order:
 *   ● ── ✈ ── ● ── 🚌 ── ●
 * Each node is a city stop; each icon is a leg, tinted by mode.
 */
export function TransportMinimap({ segments, size = "md" }: TransportMinimapProps) {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const nodeSize = size === "sm" ? "size-1.5" : "size-2";

  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`Travel by ${segments.map((s) => MODE_META[s.transport_type].label).join(", then ")}`}
    >
      <span className={`shrink-0 rounded-full bg-slate-300 ${nodeSize}`} aria-hidden />
      {segments.map((segment, index) => {
        const meta = MODE_META[segment.transport_type];
        const Icon = meta.Icon;
        return (
          <Fragment key={segment.id}>
            <span className="h-px w-3 shrink-0 bg-slate-200 sm:w-5" aria-hidden />
            <Icon className={`shrink-0 ${iconSize} ${meta.fg}`} aria-hidden />
            <span className="h-px w-3 shrink-0 bg-slate-200 sm:w-5" aria-hidden />
            {index < segments.length - 1 ? (
              <span
                className={`shrink-0 rounded-full bg-slate-300 ${nodeSize}`}
                aria-hidden
              />
            ) : null}
          </Fragment>
        );
      })}
      <span className={`shrink-0 rounded-full bg-slate-300 ${nodeSize}`} aria-hidden />
    </div>
  );
}
