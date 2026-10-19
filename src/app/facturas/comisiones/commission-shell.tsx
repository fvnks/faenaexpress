import type { ReactNode } from "react";
import Link from "next/link";

import { PeriodPicker } from "@/components/period-picker";
import { currentPeriod, monthRange } from "@/lib/money";

/**
 * Vistas de la sección Comisiones. Cada una responde a una pregunta distinta:
 *
 * - Resumen:      ¿cuánto le corresponde a cada vendedor este mes?
 * - Asignaciones: ¿qué documento no está comisionando y por qué?
 * - Vendedores:   ¿a qué porcentaje y con qué regla trabaja cada uno?
 * - Cierres:      ¿qué ya se congeló y pagó?
 */
const views = [
  { href: "/facturas/comisiones", label: "Resumen" },
  { href: "/facturas/comisiones/asignaciones", label: "Asignaciones" },
  { href: "/facturas/comisiones/vendedores", label: "Vendedores" },
  { href: "/facturas/comisiones/cierres", label: "Cierres" },
];

export function CommissionNav({ active }: { active: string }) {
  return (
    <nav aria-label="Comisiones" className="flex flex-wrap items-center gap-1 text-sm">
      {views.map((view) => {
        const current = view.href === active;
        return (
          <Link
            key={view.href}
            href={view.href}
            aria-current={current ? "page" : undefined}
            className={
              "rounded-control px-2.5 py-1 transition-colors " +
              (current
                ? "bg-primary-soft font-medium text-primary"
                : "text-muted-foreground hover:bg-background hover:text-foreground")
            }
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}

// El selector preserva la ruta actual y solo cambia `?periodo=`, así que sirve
// igual en las cuatro vistas.
export function CommissionPeriodFilter({ period }: { period: string }) {
  return <PeriodPicker period={period} />;
}

/** `?periodo=` válido, o el mes corriente si no viene o está mal escrito. */
export function resolvePeriod(searchParams: { periodo?: string | string[] }): string {
  const raw = Array.isArray(searchParams.periodo)
    ? searchParams.periodo[0]
    : searchParams.periodo;
  return raw && monthRange(raw) ? raw : currentPeriod();
}

const DOC_NAME: Record<string, string> = {
  INVOICE: "Factura",
  RECEIPT: "Boleta",
  CREDIT_NOTE: "Nota de crédito",
  DEBIT_NOTE: "Nota de débito",
  OTHER: "Otro documento",
};

export function documentLabel(documentType: string, documentNumber: string | null): string {
  const name = DOC_NAME[documentType] ?? "Documento";
  return documentNumber ? `${name} N° ${documentNumber}` : name;
}

/** Montos y totales: siempre tabulares (identidad del producto, DESIGN.md). */
export function Money({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={"tabular " + (className ?? "")}>{children}</span>;
}
