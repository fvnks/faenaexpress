import { requireContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { currentPeriod, monthRange } from "@/lib/money";
import { salesBySalesperson } from "@/lib/reports";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await salesBySalesperson(ctx.company.id, range);
  const csv = toCsv(
    ["Vendedor", "Documentos", "Total firmado", "Participación %"],
    data.rows.map((row) => [
      row.name,
      row.count,
      row.total,
      data.total !== 0 ? Math.round((row.total / data.total) * 100) : 0,
    ]),
  );

  return csvResponse(`ventas-por-vendedor-${period}.csv`, csv);
}
