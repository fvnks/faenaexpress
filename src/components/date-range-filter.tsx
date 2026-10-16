"use client";

import { format } from "date-fns";
import { DayPicker as RdpCalendar } from "react-day-picker";
import "react-day-picker/style.css";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";

import { todayISO } from "@/lib/money";

const iconCls = "h-4 w-4 shrink-0 text-muted-foreground";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Selector de rango de fechas con calendario desplegable.
 * El estado SIEMPRE se deriva de la URL (`desde`/`hasta`) + un `pendingFrom`
 * local para el click intermedio. Así el calendario nunca pierde la selección.
 */
export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera o presionar Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setPendingFrom(undefined);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPendingFrom(undefined);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Al abrir el calendario, limpiar el pendiente del uso anterior.
  function toggleOpen() {
    setOpen((v) => {
      if (v) setPendingFrom(undefined);
      return !v;
    });
  }

  function handleSelect(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      // Rango completo: navegar.
      setPendingFrom(undefined);
      const params = new URLSearchParams(searchParams.toString());
      params.set("desde", format(range.from, "yyyy-MM-dd"));
      params.set("hasta", format(range.to, "yyyy-MM-dd"));
      router.push(`?${params.toString()}`);
      setOpen(false);
    } else if (range?.from) {
      // Primer click: guardar como pendiente (el calendario lo muestra resaltado).
      setPendingFrom(range.from);
    } else {
      // Deseleccionó.
      setPendingFrom(undefined);
    }
  }

  function clear() {
    setPendingFrom(undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("desde");
    params.delete("hasta");
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  function applyRange(fromISO: string, toISO: string) {
    setPendingFrom(undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.set("desde", fromISO);
    params.set("hasta", toISO);
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  // Atajos de contabilidad: resolver el período sin abrir el calendario.
  const presets = buildPresets();

  // El `selected` del calendario SIEMPRE se deriva: URL + pendiente.
  const urlFrom = from ? new Date(from + "T00:00:00") : undefined;
  const urlTo = to ? new Date(to + "T00:00:00") : undefined;
  const selected: DateRange | undefined = pendingFrom
    ? { from: pendingFrom }
    : urlFrom || urlTo
      ? { from: urlFrom, to: urlTo }
      : undefined;

  const label = pendingFrom
    ? `${format(pendingFrom, "dd/MM/yyyy")} – …`
    : urlFrom && urlTo
      ? `${format(urlFrom, "dd/MM/yyyy")} – ${format(urlTo, "dd/MM/yyyy")}`
      : "Todas las fechas";

  const hasValue = !!(urlFrom || urlTo || pendingFrom);

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <label className="text-sm font-medium">Fechas</label>
      <div className="relative">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-haspopup="true"
          className={
            "flex w-full items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors " +
            (hasValue
              ? "border-primary bg-primary-soft/50 text-primary"
              : "border-border bg-surface text-muted-foreground hover:bg-background")
          }
        >
          <CalendarIcon />
          <span className="flex-1 text-left">{label}</span>
          {(urlFrom || urlTo) ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); clear(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); clear(); } }}
              aria-label="Limpiar fechas"
              className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true">
              <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
            </svg>
          )}
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-40 mt-1 min-w-[340px] rounded-card border border-border bg-surface p-4 shadow-lg">
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border pb-3">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyRange(preset.from, preset.to)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <RdpCalendar
              mode="range"
              resetOnSelect
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={1}
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
                day_range_middle: "!rounded-none bg-primary-soft/60",
                day_range_start: "!rounded-e-none !rounded-s-full bg-primary !text-primary-foreground",
                day_range_end: "!rounded-s-none !rounded-e-full bg-primary !text-primary-foreground",
              }}
            />
            {(urlFrom || urlTo) ? (
              <div className="mt-3 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={clear}
                  className="w-full rounded-control border border-border bg-transparent px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  Limpiar fechas
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Atajos de fecha calculados sobre el día de Chile: "Mes anterior" cubre el mes
 * calendario completo y "Últimos 30 días" incluye hoy.
 */
function buildPresets() {
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  const pad = (value: number) => String(value).padStart(2, "0");
  const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

  const lastDayOfPrev = new Date(Date.UTC(year, month - 1, 0));
  const prevYear = lastDayOfPrev.getUTCFullYear();
  const prevMonth = lastDayOfPrev.getUTCMonth() + 1;
  const start30 = new Date(Date.parse(`${today}T00:00:00.000Z`) - 29 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return [
    { label: "Este mes", from: iso(year, month, 1), to: today },
    {
      label: "Mes anterior",
      from: iso(prevYear, prevMonth, 1),
      to: iso(prevYear, prevMonth, lastDayOfPrev.getUTCDate()),
    },
    { label: "Últimos 30 días", from: start30, to: today },
    { label: "Este año", from: iso(year, 1, 1), to: today },
  ];
}
