// Descarga la plantilla de factura de la empresa como archivo Excel (.xlsx).
//
// El archivo tiene una hoja «Plantilla» con una fila por campo configurable
// (Campo, Etiqueta, Visible). El usuario lo edita en Excel a su antojo —
// tilda/anda los campos, los mueve, los borra — y luego sube el mismo archivo
// desde el editor para aplicar los cambios (ver `importarPlantillaExcel`).

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { CAMPOS_PLANTILLA } from "@/lib/factura-plantilla-campos";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireContext("plantillas");
  const { id } = await params;

  const plantilla = await db.facturaPlantilla.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!plantilla) {
    return NextResponse.json({ error: "Plantilla no encontrada." }, { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Plantilla");
  sheet.columns = [
    { header: "Campo", key: "campo", width: 30 },
    { header: "Etiqueta", key: "etiqueta", width: 45 },
    { header: "Visible", key: "visible", width: 10 },
  ];

  for (const campo of CAMPOS_PLANTILLA) {
    sheet.addRow({
      campo: campo.campo,
      etiqueta: campo.etiqueta,
      visible: Boolean(
        (plantilla.configuracion as Record<string, boolean> | null)?.[campo.campo],
      ),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla-${plantilla.nombre}.xlsx"`,
    },
  });
}
