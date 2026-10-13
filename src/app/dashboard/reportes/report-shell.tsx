import Link from "next/link";

import { PeriodPicker } from "@/components/period-picker";

const reports = [
  { href: "/dashboard/reportes", label: "Resumen" },
  { href: "/dashboard/reportes/caja", label: "Flujo de caja" },
  { href: "/dashboard/reportes/iva", label: "IVA mensual" },
  { href: "/dashboard/reportes/libro-compras", label: "Libro de compras" },
  { href: "/dashboard/reportes/libro-ventas", label: "Libro de ventas" },
  { href: "/dashboard/reportes/pagos", label: "Pagos y deudas" },
  { href: "/dashboard/reportes/gastos", label: "Gastos por área" },
];

export function ReportNav({ active }: { active: string }) {
  return (
    <nav aria-label="Reportes" className="flex flex-wrap items-center gap-1 text-sm">
      {reports.map((report) => {
        const current = report.href === active;
        return (
          <Link
            key={report.href}
            href={report.href}
            aria-current={current ? "page" : undefined}
            className={
              "rounded-control px-2.5 py-1 transition-colors " +
              (current
                ? "bg-primary-soft font-medium text-primary"
                : "text-muted-foreground hover:bg-background hover:text-foreground")
            }
          >
            {report.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Filtro por período (mes) con calendario desplegable.
export function PeriodFilter({ period }: { period: string }) {
  return <PeriodPicker period={period} />;
}
