"use client";

import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toLocalInput } from "@/lib/time";
import { useDictionary } from "./dictionary-provider";
import { buttonClass, iconButtonClass, inputClass } from "./ui";

// Pemilih tanggal dan jam sendiri, menggantikan <input type="datetime-local"> yang formatnya diatur bahasa
// browser. Di sini semua nama bulan, hari, dan format jam mengikuti bahasa yang dipilih di aplikasi.
// Nilainya tetap teks "YYYY-MM-DDTHH:mm" (jam WIB) di input tersembunyi, jadi form dan API tidak berubah.

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function parse(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return { year, month: month - 1, day, hour, minute };
}

const pad = (value: number) => String(value).padStart(2, "0");

function serialize(parts: Parts) {
  return `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Tanggal "dinding" dibentuk di UTC supaya zona waktu laptop tidak menggeser harinya. */
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day));

const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const HOURS = Array.from({ length: 24 }, (_, index) => index);

export function DateTimeField({
  label,
  name,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
}) {
  const t = useDictionary();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  // Bulan yang sedang ditampilkan di kalender; tanpa nilai, mulai dari bulan ini (WIB).
  const [view, setView] = useState(() => {
    const start = selected ?? parse(toLocalInput(new Date()))!;
    return { year: start.year, month: start.month };
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const dateLabel = (parts: Parts) =>
    new Intl.DateTimeFormat(t.locale, {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(utc(parts.year, parts.month, parts.day));
  const clock = (hour: number, minute: number) =>
    new Intl.DateTimeFormat(t.locale, { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
      new Date(Date.UTC(2000, 0, 1, hour, minute)),
    );

  function update(change: Partial<Parts>) {
    const base = selected ?? { year: view.year, month: view.month, day: 1, hour: 9, minute: 0 };
    setValue(serialize({ ...base, ...change }));
  }

  function shiftMonth(delta: number) {
    const date = utc(view.year, view.month + delta, 1);
    setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  }

  // Kalender dimulai hari Senin.
  const firstWeekday = (utc(view.year, view.month, 1).getUTCDay() + 6) % 7;
  const daysInMonth = utc(view.year, view.month + 1, 0).getUTCDate();
  const today = open ? parse(toLocalInput(new Date())) : null;
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(t.locale, { timeZone: "UTC", weekday: "short" }).format(utc(2024, 0, 1 + index)),
  );
  const minutes =
    selected && !MINUTES.includes(selected.minute) ? [...MINUTES, selected.minute].sort((a, b) => a - b) : MINUTES;
  const selectClass = `${inputClass} mt-1 h-10 border-input px-4 text-sm`;

  return (
    <div ref={root} className="relative">
      <span id={`${id}-label`} className="type-ui">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => setOpen(!open)}
        className={`${inputClass} flex items-center gap-3 text-left ${error ? "border-destructive" : "border-input"}`}
      >
        <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span id={`${id}-value`} className={`truncate ${selected ? "" : "text-muted-foreground"}`}>
          {selected ? `${dateLabel(selected)} · ${clock(selected.hour, selected.minute)} WIB` : t.form.pickDateTime}
        </span>
      </button>
      {error && (
        <span id={`${id}-error`} className="mt-2 flex items-start gap-1.5 type-small">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
          {error}
        </span>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label={t.form.previousMonth}
              onClick={() => shiftMonth(-1)}
              className={iconButtonClass}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <span className="type-ui">
              {new Intl.DateTimeFormat(t.locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(
                utc(view.year, view.month, 1),
              )}
            </span>
            <button
              type="button"
              aria-label={t.form.nextMonth}
              onClick={() => shiftMonth(1)}
              className={iconButtonClass}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center type-caption text-muted-foreground">
            {weekdays.map((weekday) => (
              <span key={weekday} className="py-1">
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const isSelected = selected?.year === view.year && selected.month === view.month && selected.day === day;
              const isToday = today?.year === view.year && today.month === view.month && today.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={dateLabel({ year: view.year, month: view.month, day, hour: 0, minute: 0 })}
                  onClick={() => update({ year: view.year, month: view.month, day })}
                  className={`mx-auto inline-flex size-9 items-center justify-center rounded-full type-small transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : `hover:bg-accent ${isToday ? "ring-1 ring-input" : ""}`
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <label className="block">
              <span className="type-caption text-muted-foreground">{t.form.hour}</span>
              <select
                value={selected?.hour ?? 9}
                onChange={(event) => update({ hour: Number(event.target.value) })}
                className={selectClass}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {pad(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="type-caption text-muted-foreground">{t.form.minute}</span>
              <select
                value={selected?.minute ?? 0}
                onChange={(event) => update({ minute: Number(event.target.value) })}
                className={selectClass}
              >
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {pad(minute)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary", "small")}>
              {t.form.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
