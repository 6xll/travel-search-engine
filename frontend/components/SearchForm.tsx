"use client";

import { useState, type FormEvent } from "react";

import { CityCombobox } from "@/components/CityCombobox";
import type { SearchPreference, SearchRequestPayload } from "@/lib/types";

interface SearchFormProps {
  cities: readonly string[];
  onSearch: (payload: SearchRequestPayload) => void;
  isLoading: boolean;
}

const PREFERENCE_OPTIONS: { value: SearchPreference; label: string }[] = [
  { value: "balanced", label: "⚖️ Balanced" },
  { value: "cheapest", label: "💰 Cheapest" },
  { value: "fastest", label: "⚡ Fastest" },
];

function defaultDepartureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function SearchForm({ cities, onSearch, isLoading }: SearchFormProps) {
  const [origin, setOrigin] = useState("Porto");
  const [destination, setDestination] = useState("Tokyo");
  const [departureDate, setDepartureDate] = useState(defaultDepartureDate);
  const [maxBudget, setMaxBudget] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [preference, setPreference] = useState<SearchPreference>("balanced");
  const [flexibleDays, setFlexibleDays] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setFormError("Origin and destination must be different.");
      return;
    }
    setFormError(null);
    onSearch({
      origin: origin.trim(),
      destination: destination.trim(),
      departure_date: departureDate,
      preference,
      ...(flexibleDays > 0 && { flexible_days: flexibleDays }),
      ...(maxBudget !== "" && { max_budget: Number(maxBudget).toFixed(2) }),
      ...(maxHours !== "" && {
        max_total_duration_minutes: Math.round(Number(maxHours) * 60),
      }),
    });
  }

  const inputClasses =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <CityCombobox
          label="From"
          value={origin}
          cities={cities}
          onChange={setOrigin}
          placeholder="Origin city"
        />

        <CityCombobox
          label="To"
          value={destination}
          cities={cities}
          onChange={setDestination}
          placeholder="Destination city"
        />

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Departure
          </span>
          <input
            className={inputClasses}
            type="date"
            value={departureDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDepartureDate(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Flexibility
          </span>
          <select
            className={inputClasses}
            value={flexibleDays}
            onChange={(event) => setFlexibleDays(Number(event.target.value))}
          >
            <option value={0}>Exact date</option>
            <option value={1}>± 1 day</option>
            <option value={2}>± 2 days</option>
            <option value={3}>± 3 days</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Max budget (€)
          </span>
          <input
            className={inputClasses}
            type="number"
            min="1"
            step="1"
            value={maxBudget}
            onChange={(event) => setMaxBudget(event.target.value)}
            placeholder="Any"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Max time (hours)
          </span>
          <input
            className={inputClasses}
            type="number"
            min="1"
            step="1"
            value={maxHours}
            onChange={(event) => setMaxHours(event.target.value)}
            placeholder="Any"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
          role="radiogroup"
          aria-label="Ranking preference"
        >
          {PREFERENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={preference === option.value}
              onClick={() => setPreference(option.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                preference === option.value
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Searching…
              </>
            ) : (
              "Search journeys"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
