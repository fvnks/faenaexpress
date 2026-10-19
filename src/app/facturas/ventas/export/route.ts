import { requireContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { documentTypeLabel, saleStatusLabel } from "@/lib/labels";
import { formatDate, todayISO } from "@/lib/money";
import { listAllSales, parseSaleFilters } from "@/lib/sales";

// Exporta la lista de ventas con los mismos filtros y el mismo orden que la
// pantalla, pero sin paginar: el archivo se lleva todo lo filtrado.
export async function GET(request: Request) {
  const ctx = await requireContext("ventas");
  const params = new URL(request.url).searchParams;
  const get = (key: string) => params.get(key) ?? undefined;

  const filters = parseSaleFilters({
    estado: get("estado"),
    q: get("q"),
    cliente: get("cliente"),
    categoria: get("categoria"),
    vendedor: get("vendedor"),
    tipo: get("tipo"),
    desde: get("desde"),
    hasta: get("hasta"),
    orden: get("orden"),
    dir: get("dir"),
  });

  const rows = await listAllSales(ctx.company.id, filters);

  const csv = toCsv(
    [
      "Fecha",
      "Tipo",
      "Folio",
      "RUT",
      "Cliente",
      "Vendedor",
      "OC",
      "HES",
      "Estado de cobro",
      "Total",
    ],
    rows.map((sale) => [
      formatDate(sale.date),
      documentTypeLabel(sale.documentType),
      sale.documentNumber ?? "",
      sale.partner.rut ?? "",
      sale.partner.name,
      sale.salesperson?.name ?? "",
      sale.purchaseOrder ?? "",
      sale.hesNumber ?? "",
      sale.confirmingAt ? "Confirming" : saleStatusLabel(sale.status),
      sale.totalAmount,
    ]),
  );

  return csvResponse(`ventas-${todayISO()}.csv`, csv);
}
