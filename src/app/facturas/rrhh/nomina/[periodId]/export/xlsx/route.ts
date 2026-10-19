import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { addStyledSheet, createWorkbook, xlsxResponse } from "@/lib/xlsx";

export async function GET(_request: Request, props: { params: Promise<{ periodId: string }> }) {
  const ctx = await requireContext("rrhh");
  const params = await props.params;
  const period = await db.payrollPeriod.findFirst({
    where: { id: params.periodId, companyId: ctx.company.id },
    include: { entries: { include: { worker: true }, orderBy: { worker: { name: "asc" } } } },
  });

  if (!period) {
    return new Response("Período no encontrado", { status: 404 });
  }

  const company = await db.company.findUnique({ where: { id: ctx.company.id }, select: { name: true } });
  const workbook = createWorkbook();
  addStyledSheet(workbook, "Nomina", {
    title: `Nómina ${period.year}-${String(period.month).padStart(2, "0")}`,
    subtitle: `${company?.name ?? "Empresa"} · ${period.status === "CLOSED" ? "Período cerrado" : "Borrador"}`,
    columns: [
      { header: "Trabajador", width: 28 },
      { header: "RUT", width: 16 },
      { header: "Base", width: 14, style: "currency" },
      { header: "Bonos", width: 14, style: "currency" },
      { header: "Horas extra", width: 14, style: "currency" },
      { header: "Bruto", width: 14, style: "currency" },
      { header: "AFP", width: 14, style: "currency" },
      { header: "Salud", width: 14, style: "currency" },
      { header: "Cesantía", width: 14, style: "currency" },
      { header: "Otras desc.", width: 14, style: "currency" },
      { header: "Neto", width: 14, style: "currency" },
      { header: "Estado", width: 12 },
    ],
    rows: period.entries.map((entry) => [
      entry.worker.name,
      entry.worker.rut,
      entry.baseAmount,
      entry.allowances,
      entry.overtime,
      entry.grossAmount,
      entry.afpAmount,
      entry.healthAmount,
      entry.unemploymentAmount,
      entry.otherDeductions,
      entry.netAmount,
      period.status === "CLOSED" ? "Cerrado" : "Borrador",
    ]),
    totalRow: [
      "Total",
      null,
      period.entries.reduce((sum, e) => sum + e.baseAmount, 0),
      period.entries.reduce((sum, e) => sum + e.allowances, 0),
      period.entries.reduce((sum, e) => sum + e.overtime, 0),
      period.entries.reduce((sum, e) => sum + e.grossAmount, 0),
      period.entries.reduce((sum, e) => sum + e.afpAmount, 0),
      period.entries.reduce((sum, e) => sum + e.healthAmount, 0),
      period.entries.reduce((sum, e) => sum + e.unemploymentAmount, 0),
      period.entries.reduce((sum, e) => sum + e.otherDeductions, 0),
      period.entries.reduce((sum, e) => sum + e.netAmount, 0),
      null,
    ],
    accentColor: "2D6A4F",
  });

  const filename = `nomina-${period.year}-${String(period.month).padStart(2, "0")}.xlsx`;
  return xlsxResponse(filename, workbook);
}