import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { addStyledSheet, createWorkbook, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("rrhh");
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getUTCFullYear();

  const periods = await db.payrollPeriod.findMany({
    where: { companyId: ctx.company.id, year },
    orderBy: { month: "asc" },
    include: { entries: { include: { worker: { select: { id: true, name: true, area: { select: { name: true } } } } } } },
  });

  const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const byWorker = new Map<string, { name: string; area: string; months: number[] }>();
  const totals = Array.from({ length: 12 }, () => 0);

  periods.forEach((period) => {
    period.entries.forEach((entry) => {
      const row = byWorker.get(entry.worker.id) ?? {
        name: entry.worker.name,
        area: entry.worker.area?.name ?? "Sin area",
        months: Array.from({ length: 12 }, () => 0),
      };
      row.months[period.month - 1] += entry.grossAmount;
      byWorker.set(entry.worker.id, row);
      totals[period.month - 1] += entry.grossAmount;
    });
  });

  const workbook = createWorkbook();
  addStyledSheet(workbook, "Costos", {
    title: "Reporte de costos por nomina",
    subtitle: String(year),
    columns: [
      { header: "Trabajador", width: 26 },
      { header: "Area", width: 18 },
      ...MONTH_LABELS.map((m) => ({ header: m, width: 10, style: "currency" as const })),
      { header: "Total", width: 14, style: "currency" },
    ],
    rows: [...byWorker.values()]
      .sort((a, b) => b.months.reduce((s, v) => s + v, 0) - a.months.reduce((s, v) => s + v, 0))
      .map((row) => [...row.name ? [row.name, row.area] : [], ...row.months, row.months.reduce((s, v) => s + v, 0)]),
    totalRow: ["Total", null, ...totals, totals.reduce((s, v) => s + v, 0)],
    accentColor: "2D6A4F",
  });

  return xlsxResponse(`costos-nomina-${year}.xlsx`, workbook);
}