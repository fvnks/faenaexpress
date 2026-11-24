import { requireObraContext } from "@/lib/obra-auth";
import { createWorkbook, xlsxResponse } from "@/lib/xlsx";

export const runtime = "nodejs";

/** Plantilla de itemizado para importar el presupuesto de una obra. */
export async function GET() {
  await requireObraContext("presupuesto");

  const workbook = createWorkbook("Presupuesto de obra");
  const sheet = workbook.addWorksheet("Presupuesto");

  sheet.addRow(["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario"]);
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(["1", "OBRAS PRELIMINARES", "", "", ""]);
  sheet.addRow(["1.1", "Cierre perimetral", "M2", 120, 18500]);
  sheet.addRow(["1.2", "Excavación", "M3", 45, 32000]);
  sheet.addRow(["2", "ALBAÑILERÍA", "", "", ""]);
  sheet.addRow(["2.1", "Muro ladrillo", "M2", 80, 24000]);

  sheet.columns = [
    { width: 12 },
    { width: 38 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
  ];

  return xlsxResponse("plantilla-presupuesto-obra.xlsx", workbook);
}
