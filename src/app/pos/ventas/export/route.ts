import { requireContext } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { csvResponse, toCsv } from "@/lib/csv";
import { posSalesReport } from "@/lib/pos";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const url = new URL(request.url);
  const desde = url.searchParams.get("desde") ?? "";
  const hasta = url.searchParams.get("hasta") ?? "";
  const q = url.searchParams.get("q") ?? "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const desdeISO = desde || new Date(hoy.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const hastaISO = hasta || hoy.toISOString().slice(0, 10);

  const report = await posSalesReport(ctx.company.id, {
    from: new Date(`${desdeISO}T00:00:00.000Z`),
    to: new Date(`${hastaISO}T00:00:00.000Z`),
    ...(q ? { q } : {}),
  });

  const headers = [
    "Ticket",
    "Fecha",
    "Cajero",
    "Neto",
    "IVA",
    "Total",
    "Medios de pago",
    "Productos",
  ];

  const rows = report.sales.map((sale) => {
    const fecha = new Date(sale.createdAt).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const metodos = [
      ...new Set(sale.payments.map((p) => `${p.method} ${formatCLP(p.amount)}`)),
    ].join(" + ");
    const productos = sale.items.map((i) => `${i.name} ×${i.quantity}`).join("; ");
    return [
      sale.saleNumber,
      fecha,
      sale.userName,
      sale.subtotal,
      sale.tax,
      sale.total,
      metodos,
      productos,
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `pos-ventas-${desdeISO}_${hastaISO}.csv`;
  return csvResponse(filename, csv);
}
