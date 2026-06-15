"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  CalendarRange,
  Gauge,
  MoveRight,
  PiggyBank,
  Repeat,
  Search,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { CitySelect } from "./CitySelect";
import type { SearchPreference, SearchValues, TripType } from "./types";

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

const FLEX_OPTIONS = [
  { value: 0, label: "Exact date" },
  { value: 1, label: "± 1 day" },
  { value: 2, label: "± 2 days" },
  { value: 3, label: "± 3 days" },
];

function todayPlus(days: number): string {
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
  const [destination, setDestination] = useState(defaultValues?.destination ?? "");
  const [date, setDate] = useState(defaultValues?.date ?? todayPlus(30));
  const [returnDate, setReturnDate] = useState(
    defaultValues?.returnDate ?? todayPlus(37),
  );
  const [tripType, setTripType] = useState<TripType>(
    defaultValues?.tripType ?? "one_way",
  );
  const [flexibleDays, setFlexibleDays] = useState(
    defaultValues?.flexibleDays ?? 0,
  );
  const [maxBudget, setMaxBudget] = useState(
    defaultValues?.maxBudget != null ? String(defaultValues.maxBudget) : "",
  );
  const [passengers, setPassengers] = useState(defaultValues?.passengers ?? 1);
  const [preference, setPreference] = useState<SearchPreference>(
    defaultValues?.preference ?? "balanced",
  );

  // Keep the return date on or after the outbound date.
  useEffect(() => {
    if (returnDate < date) setReturnDate(date);
  }, [date, returnDate]);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function submit() {
    const parsedBudget = Number(maxBudget);
    onSearch?.({
      origin,
      destination,
      date,
      returnDate,
      tripType,
      flexibleDays,
      maxBudget: maxBudget !== "" && parsedBudget > 0 ? parsedBudget : null,
      passengers,
      preference,
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5">
      {/* Options strip: trip type (left) + ranking preference (right). */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <TripTypeToggle value={tripType} onChange={setTripType} />
        <SegmentedPreference value={preference} onChange={setPreference} />
      </div>

      {/* Field row: wraps gracefully as fields are added. */}
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex min-w-[260px] flex-1 items-stretch gap-2">
          <CitySelect
            label="From"
            value={origin}
            cities={cities}
            onChange={setOrigin}
            placeholder="Origin"
            className="flex-1"
          />
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <ArrowLeftRight className="size-4" aria-hidden />
          </button>
          <CitySelect
            label="To"
            value={destination}
            cities={cities}
            onChange={setDestination}
            placeholder="Destination"
            className="flex-1"
          />
        </div>

        <FieldShell label="Depart" Icon={CalendarDays} htmlFor="depart-date">
          <input
            id="depart-date"
            type="date"
            value={date}
            min={todayPlus(0)}
            onChange={(event) => setDate(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none [color-scheme:light]"
          />
        </FieldShell>

        {tripType === "round_trip" && (
          <FieldShell label="Return" Icon={CalendarDays} htmlFor="return-date">
            <input
              id="return-date"
              type="date"
              value={returnDate}
              min={date}
              onChange={(event) => setReturnDate(event.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none [color-scheme:light]"
            />
          </FieldShell>
        )}

        <FieldShell label="Flexibility" Icon={CalendarRange} htmlFor="flex-days">
          <select
            id="flex-days"
            value={flexibleDays}
            onChange={(event) => setFlexibleDays(Number(event.target.value))}
            className="w-full cursor-pointer bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
          >
            {FLEX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>

        <FieldShell label="Max budget" Icon={Wallet} htmlFor="max-budget">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-slate-400">€</span>
            <input
              id="max-budget"
              type="number"
              min="1"
              step="10"
              inputMode="numeric"
              value={maxBudget}
              onChange={(event) => setMaxBudget(event.target.value)}
              placeholder="Any"
              className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </FieldShell>

        <PassengerStepper value={passengers} onChange={setPassengers} />

        <button
          type="button"
          onClick={submit}
          className="inline-flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:flex-none"
        >
          <Search className="size-4" aria-hidden />
          <span>Search</span>
        </button>
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
      className="flex min-w-[140px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20"
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

function TripTypeToggle({
  value,
  onChange,
}: {
  value: TripType;
  onChange: (value: TripType) => void;
}) {
  const options: { value: TripType; label: string; Icon: LucideIcon }[] = [
    { value: "one_way", label: "One way", Icon: MoveRight },
    { value: "round_trip", label: "Round trip", Icon: Repeat },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Trip type"
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

function SegmentedPreference({
  value,
  onChange,
}: {
  value: SearchPreference;
  onChange: (value: SearchPreference) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Ranking preference"
      className="inline-flex gap-1 rounded-xl bg-slate-100 p-1"
    >
      {PREFERENCES.map(({ value: optionValue, label, Icon }) => {
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

function PassengerStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
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
    <div ref={containerRef} className="relative min-w-[140px]">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((open) => !open)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
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
