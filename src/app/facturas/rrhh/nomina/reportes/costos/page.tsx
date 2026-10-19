import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardClass, controlClass } from "@/lib/ui";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function PayrollCostReportPage(props: PageProps<"/facturas/rrhh/nomina/reportes/costos">) {
  const ctx = await requireContext("rrhh");
  const searchParams = await props.searchParams;
  const year = Number(searchParams?.year) || new Date().getUTCFullYear();

  const periods = await db.payrollPeriod.findMany({
    where: { companyId: ctx.company.id, year },
    orderBy: { month: "asc" },
    include: {
      entries: {
        include: { worker: { select: { id: true, name: true, area: { select: { name: true } } } } },
      },
    },
  });

  const byWorker = new Map<string, { name: string; area: string; months: number[] }>();
  const monthlyTotals = Array.from({ length: 12 }, () => 0);
  let total = 0;

  periods.forEach((period) => {
    period.entries.forEach((entry) => {
      const row = byWorker.get(entry.worker.id) ?? {
        name: entry.worker.name,
        area: entry.worker.area?.name ?? "Sin área",
        months: Array.from({ length: 12 }, () => 0),
      };
      row.months[period.month - 1] += entry.grossAmount;
      byWorker.set(entry.worker.id, row);
      monthlyTotals[period.month - 1] += entry.grossAmount;
      total += entry.grossAmount;
    });
  });

  const rows = [...byWorker.values()].sort((a, b) => b.months.reduce((s, v) => s + v, 0) - a.months.reduce((s, v) => s + v, 0));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/facturas/rrhh/nomina" className="text-sm text-primary underline-offset-2 hover:underline">
          ← Volver a nómina
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Costo laboral por nómina</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Total bruto por trabajador y mes para el año {year}. Se incluyen períodos cerrados y borradores.
        </p>
      </div>

      <form method="get" className="flex items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Año</span>
          <input name="year" type="number" defaultValue={year} className={controlClass + " w-24 tabular"} />
        </label>
        <button type="submit" className="rounded-control border border-border bg-transparent px-4 py-2 text-sm text-foreground">
          Actualizar
        </button>
        <a
          href={`/facturas/rrhh/nomina/reportes/costos/export/xlsx?year=${year}`}
          className="rounded-control border border-border bg-transparent px-4 py-2 text-sm text-foreground"
        >
          Exportar Excel
        </a>
      </form>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Trabajador</th>
              <th className="px-3 py-2 font-medium">Área</th>
              {MONTH_LABELS.map((month) => (
                <th key={month} className="tabular px-2 py-2 text-right font-medium">{month}</th>
              ))}
              <th className="tabular px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-medium">{row.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.area}</td>
                {row.months.map((value, index) => (
                  <td key={index} className="tabular px-2 py-2.5 text-right">{value > 0 ? value.toLocaleString("es-CL") : "—"}</td>
                ))}
                <td className="tabular px-3 py-2.5 text-right font-semibold">{row.months.reduce((s, v) => s + v, 0).toLocaleString("es-CL")}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-6 text-sm text-muted-foreground">No hay liquidaciones para el año seleccionado.</td>
              </tr>
            ) : null}
            {rows.length > 0 ? (
              <tr className="border-t border-border font-semibold">
                <td className="px-3 py-2.5" colSpan={2}>Total mensual</td>
                {monthlyTotals.map((value, index) => (
                  <td key={index} className="tabular px-2 py-2.5 text-right">{value.toLocaleString("es-CL")}</td>
                ))}
                <td className="tabular px-3 py-2.5 text-right">{total.toLocaleString("es-CL")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}