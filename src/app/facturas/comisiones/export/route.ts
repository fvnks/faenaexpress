import { requireContext } from "@/lib/auth";
import {
  closedCommissionReport,
  computeCommission,
  formatRateBps,
  type CommissionLine,
} from "@/lib/commissions";
import { csvResponse, csvDate, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { currentPeriod, monthRange } from "@/lib/money";

const DOC_NAME: Record<string, string> = {
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota de crédito",
  DEBIT_NOTE: "Nota de débito",
};

const RULE_NAME: Record<string, string> = {
  INVOICE: "Facturas del mes",
  GUIDE: "Solo con guía",
};

export async function GET(request: Request) {
  const ctx = await requireContext("comisiones");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();

  const closeRow = await db.commissionClose.findUnique({
    where: { companyId_period: { companyId: ctx.company.id, period } },
    select: { closedAt: true },
  });

  const data = closeRow
    ? await closedCommissionReport(ctx.company.id, period)
    : await computeCommission(ctx.company.id, period);

  const people = await db.salesperson.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { name: "asc" },
  });
  const ruleOf = new Map(people.map((person) => [person.id, person.commissionRule]));

  const headers = [
    "Período",
    "Fecha",
    "Tipo",
    "Documento",
    "Guía",
    "Cliente",
    "Vendedor",
    "Regla",
    "Tasa",
    "Origen",
    "Neto",
    "Comisión",
    "Estado del mes",
    "Motivo",
  ];

  const rows: (string | number)[][] = data.lines.map((line: CommissionLine) => [
    period,
    csvDate(line.date),
    DOC_NAME[line.documentType] ?? line.documentType,
    line.documentNumber ?? "",
    line.guideNumber ?? "",
    line.partnerName,
    line.salespersonName,
    RULE_NAME[ruleOf.get(line.salespersonId) ?? "INVOICE"] ?? "",
    formatRateBps(line.rateBps),
    line.source === "AUTO" ? "Automático" : "Asignado",
    line.base,
    line.commission,
    closeRow ? "Cerrado" : "Abierto",
    line.note ?? "",
  ]);

  return csvResponse(`comisiones-${period}.csv`, toCsv(headers, rows));
}
