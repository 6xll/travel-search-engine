"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  Gauge,
  PiggyBank,
  Search,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CitySelect } from "./CitySelect";
import type { SearchPreference, SearchValues } from "./types";

interface SearchBannerProps {
  cities: readonly string[];
  defaultValues?: Partial<SearchValues>;
  onSearch?: (values: SearchValues) => void;
}

const PREFERENCES: { value: SearchPreference; label: string; Icon: LucideIcon }[] =
  [
    { value: "balanced", label: "Balanced", Icon: Gauge },
    { value: "cheapest", label: "Cheapest", Icon: PiggyBank },
    { value: "fastest", label: "Fastest", Icon: Zap },
  ];

function tomorrowPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function SearchBanner({
  cities,
  defaultValues,
  onSearch,
}: SearchBannerProps) {
  const [origin, setOrigin] = useState(defaultValues?.origin ?? "");
  const [destination, setDestination] = useState(
    defaultValues?.destination ?? "",
  );
  const [date, setDate] = useState(defaultValues?.date ?? tomorrowPlus(30));
  const [passengers, setPassengers] = useState(defaultValues?.passengers ?? 1);
  const [preference, setPreference] = useState<SearchPreference>(
    defaultValues?.preference ?? "balanced",
  );

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function submit() {
    onSearch?.({ origin, destination, date, passengers, preference });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5">
      {/* Preference: trip-defining toggle, sits above the field row. */}
      <div className="mb-3 px-1">
        <SegmentedControl
          options={PREFERENCES}
          value={preference}
          onChange={setPreference}
        />
      </div>

      {/* Field row: floating pill of fields divided by hairlines. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0 lg:divide-x lg:divide-slate-200">
        <div className="relative flex items-center lg:flex-[1.2]">
          <div className="flex-1">
            <CitySelect
              label="From"
              value={origin}
              cities={cities}
              onChange={setOrigin}
              placeholder="Origin"
            />
          </div>
          {/* Swap sits on the divider between From and To. */}
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className="z-10 hidden size-8 shrink-0 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:flex"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
          </button>
        </div>

        <div className="lg:flex-[1.2] lg:pl-2">
          <CitySelect
            label="To"
            value={destination}
            cities={cities}
            onChange={setDestination}
            placeholder="Destination"
          />
        </div>

        <div className="lg:pl-2">
          <FieldShell label="When" Icon={CalendarDays} htmlFor="search-date">
            <input
              id="search-date"
              type="date"
              value={date}
              min={tomorrowPlus(0)}
              onChange={(event) => setDate(event.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none [color-scheme:light]"
            />
          </FieldShell>
        </div>

        <div className="lg:pl-2">
          <PassengerStepper value={passengers} onChange={setPassengers} />
        </div>

        <div className="flex items-stretch lg:pl-3">
          <button
            type="button"
            onClick={submit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 lg:w-auto"
          >
            <Search className="size-4" aria-hidden />
            <span>Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldShellProps {
  label: string;
  Icon: LucideIcon;
  htmlFor?: string;
  children: ReactNode;
}

function FieldShell({ label, Icon, htmlFor, children }: FieldShellProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-slate-50 focus-within:bg-slate-50"
    >
      <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {children}
      </span>
    </label>
  );
}

interface SegmentedControlProps {
  options: { value: SearchPreference; label: string; Icon: LucideIcon }[];
  value: SearchPreference;
  onChange: (value: SearchPreference) => void;
}

function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Ranking preference"
      className="inline-flex gap-1 rounded-xl bg-slate-100 p-1"
    >
      {options.map(({ value: optionValue, label, Icon }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon
              className={`size-3.5 ${active ? "text-indigo-600" : "text-slate-400"}`}
              aria-hidden
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface PassengerStepperProps {
  value: number;
  onChange: (value: number) => void;
}

function PassengerStepper({ value, onChange }: PassengerStepperProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function clamp(next: number) {
    onChange(Math.min(9, Math.max(1, next)));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((open) => !open)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Users className="size-4 shrink-0 text-slate-400" aria-hidden />
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Travelers
          </span>
          <span className="block text-sm font-medium text-slate-900">
            {value} {value === 1 ? "person" : "people"}
          </span>
        </span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Number of travelers"
          className="absolute left-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Travelers</span>
            <div className="flex items-center gap-3">
              <StepButton
                label="Remove traveler"
                disabled={value <= 1}
                onClick={() => clamp(value - 1)}
              >
                −
              </StepButton>
              <span className="w-5 text-center text-sm font-semibold tabular-nums text-slate-900">
                {value}
              </span>
              <StepButton
                label="Add traveler"
                disabled={value >= 9}
                onClick={() => clamp(value + 1)}
              >
                +
              </StepButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}

function StepButton({ label, disabled, onClick, children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-full border border-slate-200 text-base text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
