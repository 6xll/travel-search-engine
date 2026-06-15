"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

interface CityComboboxProps {
  label: string;
  value: string;
  cities: readonly string[];
  onChange: (city: string) => void;
  placeholder?: string;
}

/**
 * A text input that doubles as a dropdown: clicking or focusing opens a
 * scrollable list of every city; typing filters it. Supports keyboard
 * navigation and closes on outside click or Escape.
 */
export function CityCombobox({
  label,
  value,
  cities,
  onChange,
  placeholder,
}: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // While open, the input shows the live query; otherwise the chosen value.
  const inputValue = isOpen ? query : value;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter((city) => city.toLowerCase().includes(needle));
  }, [cities, query]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const node = listRef.current.children[highlighted] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [highlighted, isOpen]);

  function open() {
    setQuery("");
    setHighlighted(Math.max(0, cities.indexOf(value)));
    setIsOpen(true);
  }

  function select(city: string) {
    onChange(city);
    setIsOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      open();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = filtered[highlighted];
      if (choice) select(choice);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <div className="relative" ref={containerRef}>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div className="relative">
          <input
            className={inputClasses}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            value={inputValue}
            placeholder={placeholder}
            onFocus={open}
            onClick={open}
            onChange={(event) => {
              if (!isOpen) setIsOpen(true);
              setQuery(event.target.value);
              setHighlighted(0);
            }}
            onKeyDown={handleKeyDown}
            required
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </div>
      </label>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">No matching city</li>
          ) : (
            filtered.map((city, index) => (
              <li
                key={city}
                role="option"
                aria-selected={city === value}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(city);
                }}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === highlighted
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700"
                } ${city === value ? "font-semibold" : ""}`}
              >
                {city}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
