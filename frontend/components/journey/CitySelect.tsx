"use client";

import { MapPin } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

interface CitySelectProps {
  label: string;
  value: string;
  cities: readonly string[];
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

/** Labeled field that opens a scrollable, filterable city list. */
export function CitySelect({
  label,
  value,
  cities,
  onChange,
  placeholder = "Select city",
  className = "",
}: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? cities.filter((city) => city.toLowerCase().includes(needle))
      : cities;
  }, [cities, query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function openList() {
    setQuery("");
    setHighlighted(Math.max(0, cities.indexOf(value)));
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function choose(city: string) {
    onChange(city);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = filtered[highlighted];
      if (choice) choose(choice);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </span>
          <span
            className={`block truncate text-sm font-medium ${
              value ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {value || placeholder}
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search cities…"
            className="mb-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <ul role="listbox" id={listId} className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-sm text-slate-400">No matching city</li>
            ) : (
              filtered.map((city, index) => (
                <li
                  key={city}
                  role="option"
                  aria-selected={city === value}
                  onMouseEnter={() => setHighlighted(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(city);
                  }}
                  className={`cursor-pointer rounded-lg px-2.5 py-2 text-sm ${
                    index === highlighted
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700"
                  } ${city === value ? "font-semibold" : ""}`}
                >
                  {city}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
