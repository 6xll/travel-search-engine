import { Bus, Plane, TrainFront, type LucideIcon } from "lucide-react";

import type { TransportMode } from "./types";

/**
 * Per-mode presentation. Modes use a muted sky/amber/violet palette,
 * deliberately separate from the indigo (actions) and emerald (score)
 * accents so the minimap never competes with primary highlights.
 */
interface ModeMeta {
  label: string;
  Icon: LucideIcon;
  /** Icon/text color for solid contexts. */
  fg: string;
  /** Soft chip: background + text + ring. */
  chip: string;
  /** Timeline rail color (border). */
  rail: string;
  /** Node background tint. */
  node: string;
}

export const MODE_META: Record<TransportMode, ModeMeta> = {
  flight: {
    label: "Flight",
    Icon: Plane,
    fg: "text-sky-600",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    rail: "border-sky-300",
    node: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
  },
  bus: {
    label: "Bus",
    Icon: Bus,
    fg: "text-amber-600",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    rail: "border-amber-300",
    node: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  },
  train: {
    label: "Train",
    Icon: TrainFront,
    fg: "text-violet-600",
    chip: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20",
    rail: "border-violet-300",
    node: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
  },
};
