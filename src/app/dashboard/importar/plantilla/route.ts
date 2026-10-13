import { requireContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

const templates: Record<string, { headers: string[]; example: (string | number)[] }> = {
  purchases: {
    headers: [
      "Proveedor",
      "RUT",
      "Tipo documento",
      "Folio",
      "Folio referencia",
      "Fecha",
      "Vencimiento",
      "Categoría",
      "Área",
      "Neto",
      "IVA",
      "Estado",
      "Forma de pago",
      "Descripción",
      "Notas",
    ],
    example: [
      "Distribuidora Los Andes SpA",
      "76.543.210-K",
      "Factura",
      "F-1042",
      "",
      "2026-10-05",
      "2026-11-05",
      "Insumos",
      "Operaciones",
      300000,
      57000,
      "Pendiente",
      "Transferencia",
      "Compra de insumos",
      "",
    ],
  },
  sales: {
    headers: [
      "Cliente",
      "RUT",
      "Tipo documento",
      "Folio",
      "Folio referencia",
      "Fecha",
      "Vendedor",
      "Categoría",
      "Área",
      "Neto",
      "IVA",
      "Retención",
      "Estado",
      "Descripción",
      "Notas",
    ],
    example: [
      "Comercial del Sur Ltda",
      "77.111.222-3",
      "Factura",
      "V-2001",
      "",
      "2026-10-06",
      "Ana Pérez",
      "Ventas",
      "Comercial",
      500000,
      95000,
      0,
      "Por cobrar",
      "Venta de servicios",
      "",
    ],
  },
  expenses: {
    headers: [
      "Fecha",
      "Descripción",
      "Categoría",
      "Área",
      "Folio",
      "Forma de pago",
      "Neto",
      "IVA",
      "Pagador",
      "Reembolsado",
      "Notas",
    ],
    example: [
      "2026-10-07",
      "Combustible",
      "Transporte",
      "Operaciones",
      "B-88",
      "Efectivo",
      25210,
      4790,
      "Caja empresa",
      "No",
      "",
    ],
  },
};

export async function GET(request: Request) {
  await requireContext("importar");
  const tipo = new URL(request.url).searchParams.get("tipo") ?? "purchases";
  const template = templates[tipo] ?? templates.purchases;

  const csv = toCsv(template.headers, [template.example]);
  return csvResponse(`plantilla-${tipo}.csv`, csv);
}
