"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { currentPeriod, formatPeriod, shiftPeriod } from "@/lib/money";

/**
 * Navegación de período del panel (← mes →, + Hoy), ubicada en la barra fija
 * superior junto al selector de empresa. Solo se muestra en /facturas: lee y
 * escribe el parámetro `period` de la URL.
 */
export function PeriodNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pathname !== "/facturas") return null;

  const raw = searchParams.get("period") ?? "";
  const period = /^\d{4}-\d{2}$/.test(raw) ? raw : currentPeriod();
  const isCurrent = period === currentPeriod();

  const go = (deltaMonths: number) => {
    router.push(`/facturas?period=${shiftPeriod(period, deltaMonths)}`);
  };

  const arrowClass =
    "flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-muted-foreground transition-colors hover:bg-primary-soft/50 hover:text-foreground";

  return (
    <nav aria-label="Período del panel" className={`flex items-center gap-1 ${className}`}>
      <button type="button" onClick={() => go(-1)} aria-label="Mes anterior" className={arrowClass}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="font-medium tabular">{formatPeriod(period)}</span>
      </span>
      <button type="button" onClick={() => go(1)} aria-label="Mes siguiente" className={arrowClass}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {!isCurrent ? (
        <button
          type="button"
          onClick={() => router.push("/facturas")}
          className="ml-1 rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary-soft/50 hover:text-foreground"
        >
          Hoy
        </button>
      ) : null}
    </nav>
  );
}
