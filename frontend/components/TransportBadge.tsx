import type { TransportType } from "@/lib/types";

const TRANSPORT_META: Record<TransportType, { label: string; icon: string; classes: string }> = {
  flight: { label: "Flight", icon: "✈️", classes: "bg-sky-100 text-sky-800" },
  bus: { label: "Bus", icon: "🚌", classes: "bg-amber-100 text-amber-800" },
  train: { label: "Train", icon: "🚆", classes: "bg-emerald-100 text-emerald-800" },
  ferry: { label: "Ferry", icon: "⛴️", classes: "bg-indigo-100 text-indigo-800" },
};

export function TransportBadge({ type }: { type: TransportType }) {
  const meta = TRANSPORT_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.classes}`}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
