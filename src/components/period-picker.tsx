"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useEffect, useRef, useState } from "react";

const iconCls = "h-4 w-4 shrink-0 text-muted-foreground";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const months = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function PeriodPicker({ period }: { period: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<Date | undefined>(() => {
    const range = /^\d{4}-\d{2}$/.exec(period);
    if (!range) return new Date();
    return new Date(Number(range[1]), Number(range[2]) - 1, 1);
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(d: Date | undefined) {
    if (!d) return;
    setDate(d);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const params = new URLSearchParams(window.location.search);
    params.set("periodo", `${year}-${month}`);
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(period);
  const label = match
    ? `${months[Number(match[2]) - 1]} ${match[1]}`
    : period;

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <label className="text-sm font-medium">Período</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm transition-colors hover:bg-background"
        >
          <CalendarIcon />
          <span className="flex-1 text-left font-medium tabular">{label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true">
            <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
          </svg>
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-40 mt-1 min-w-[340px] rounded-card border border-border bg-surface p-4 shadow-lg">
            <DayPicker
              mode="single"
              selected={date && !isNaN(date.getTime()) ? date : undefined}
              onSelect={handleSelect}
              defaultMonth={date && !isNaN(date.getTime()) ? date : undefined}
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2035, 11)}
              classNames={{
                months: "flex flex-col",
                month: "flex flex-col gap-2",
                nav: "flex items-center justify-between gap-2 mb-2",
                caption_label: "text-sm font-semibold",
                nav_button: "h-8 w-8 inline-flex items-center justify-center rounded-control border border-border bg-surface transition-colors hover:bg-background",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                head_row: "flex",
                head_cell: "w-9 text-xs font-medium text-muted-foreground uppercase",
                row: "flex w-full mt-0.5",
                day: "relative p-0 text-center text-sm",
                day_button: "h-9 w-9 rounded-full font-normal transition-colors hover:bg-primary-soft/50",
                day_selected: "bg-primary !text-primary-foreground font-semibold hover:bg-primary",
                day_today: "font-bold text-accent",
                day_outside: "opacity-40",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}