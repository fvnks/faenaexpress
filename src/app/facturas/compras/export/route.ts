import { requireContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { documentTypeLabel, purchaseStatusLabel } from "@/lib/labels";
import { formatDate, todayISO } from "@/lib/money";
import { listAllPurchases, parsePurchaseFilters } from "@/lib/purchases";

// Exporta la lista de compras con los mismos filtros y el mismo orden que la
// pantalla, pero sin paginar: el archivo se lleva todo lo filtrado.
export async function GET(request: Request) {
  const ctx = await requireContext("compras");
  const params = new URL(request.url).searchParams;
  const get = (key: string) => params.get(key) ?? undefined;

  const filters = parsePurchaseFilters({
    estado: get("estado"),
    q: get("q"),
    proveedor: get("proveedor"),
    categoria: get("categoria"),
    tipo: get("tipo"),
    desde: get("desde"),
    hasta: get("hasta"),
    orden: get("orden"),
    dir: get("dir"),
  });

  const rows = await listAllPurchases(ctx.company.id, filters);

  const csv = toCsv(
    [
      "Fecha",
      "Vence",
      "Tipo",
      "Folio",
      "RUT",
      "Proveedor",
      "Categoría",
      "Área",
      "Estado de pago",
      "Total",
    ],
    rows.map((purchase) => [
      formatDate(purchase.date),
      purchase.dueDate ? formatDate(purchase.dueDate) : "",
      documentTypeLabel(purchase.documentType),
      purchase.documentNumber ?? "",
      purchase.partner.rut ?? "",
      purchase.partner.name,
      purchase.category?.name ?? "",
      purchase.area?.name ?? "",
      purchaseStatusLabel(purchase.status),
      purchase.totalAmount,
    ]),
  );

  return csvResponse(`compras-${todayISO()}.csv`, csv);
}
