import { requireContext } from "@/lib/auth";
import { csvDate } from "@/lib/csv";
import { formatRut } from "@/lib/rut";
import { currentPeriod, monthRange } from "@/lib/money";
import { listPayers } from "@/lib/catalogs";
import { listRemunerations, listWorkersWithTotals } from "@/lib/rrhh";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("rrhh");
  const url = new URL(request.url);

  const workerId = url.searchParams.get("worker") || undefined;
  const paidById = url.searchParams.get("pagador") || undefined;
  const typeRaw = url.searchParams.get("tipo") || undefined;
  const period = url.searchParams.get("periodo") || undefined;
  const desde = url.searchParams.get("desde") || undefined;
  const hasta = url.searchParams.get("hasta") || undefined;

  const workers = await listWorkersWithTotals(ctx.company.id);
  const remunerations = await listRemunerations(ctx.company.id, {
    workerId,
    paidById,
    type: (typeRaw as "SUELDO" | "AGUINALDO" | "BONO" | "ADELANTO" | "OTRO" | undefined) ?? undefined,
    period: period && /^\d{4}-\d{2}$/.test(period) ? period : undefined,
    from: desde ? new Date(desde) : undefined,
    to: hasta ? new Date(hasta) : undefined,
  });

  const workbook = createWorkbook("RRHH");

  addStyledSheet(workbook, "Trabajadores", {
    title: `${ctx.company.name} - Trabajadores`,
    subtitle: "Totales del año en curso",
    columns: [
      { header: "Nombre", width: 30, style: "text" },
      { header: "RUT", width: 14, style: "text" },
      { header: "Activo", width: 10, style: "text" },
      { header: "Pagado este año", width: 18, style: "currency" },
      { header: "Último pago", width: 14, style: "text" },
    ],
    rows: workers.map((worker) => [
      worker.name,
      worker.rut ? formatRut(worker.rut) : "—",
      worker.active ? "Activo" : "Inactivo",
      worker.yearTotal,
      worker.lastPayment ? csvDate(worker.lastPayment) : "—",
    ]),
    totalRow: ["Total", "", "", workers.reduce((acc, w) => acc + w.yearTotal, 0), ""],
  });

  addStyledSheet(workbook, "Pagos", {
    title: `${ctx.company.name} - Pagos de remuneraciones`,
    subtitle: `${remunerations.length} registro(s)`,
    columns: [
      { header: "Fecha", width: 12, style: "text" },
      { header: "Trabajador", width: 26, style: "text" },
      { header: "Tipo", width: 14, style: "text" },
      { header: "Período", width: 10, style: "text" },
      { header: "Monto", width: 14, style: "currency" },
      { header: "Pagado por", width: 18, style: "text" },
      { header: "Notas", width: 30, style: "text" },
    ],
    rows: remunerations.map((row) => [
      csvDate(row.date),
      row.worker.name,
      row.type,
      row.period ?? "",
      row.amount,
      row.paidBy.name,
      row.notes ?? "",
    ]),
    totalRow: ["", "", "", "Total", remunerations.reduce((acc, r) => acc + r.amount, 0), "", ""],
  });

  return xlsxResponse(`rrhh-${new Date().toISOString().slice(0, 10)}.xlsx`, workbook);
}
