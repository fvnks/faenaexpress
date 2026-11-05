// Descarga la plantilla de factura de la empresa como archivo Excel (.xlsx).
//
// El archivo tiene DOS hojas:
// 1. "Plantilla": flags de visibilidad (Campo, Etiqueta, Visible) - compatible anterior
// 2. "Diseño": hoja vacía para Option A - el usuario pone {{campo}} en celdas exactas
//    (ej: {{mostrarRUT}} en E4, {{mostrarFolio}} en K7). Al importar, se leen las coordenadas.

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

  // Hoja 1: "Plantilla" - flags de visibilidad
  const sheetFlags = workbook.addWorksheet("Plantilla");
  sheetFlags.columns = [
    { header: "Campo", key: "campo", width: 30 },
    { header: "Etiqueta", key: "etiqueta", width: 45 },
    { header: "Visible", key: "visible", width: 10 },
  ];

  for (const campo of CAMPOS_PLANTILLA) {
    sheetFlags.addRow({
      campo: campo.campo,
      etiqueta: campo.etiqueta,
      visible: Boolean(
        (plantilla.configuracion as Record<string, boolean> | null)?.[campo.campo],
      ),
    });
  }

  // Hoja 2: "Diseño" - grid vacío para Option A (coordenadas absolutas)
  // El usuario escribe {{campo}} en la celda que quiera (ej: E4, K7, etc.)
  const sheetDiseno = workbook.addWorksheet("Diseño");
  sheetDiseno.columns = Array.from({ length: 30 }, (_, i) => ({
    header: String.fromCharCode(65 + i), // A, B, C...
    key: `col${i}`,
    width: 12,
  }));
  
  // Fila 1: encabezado explicativo
  sheetDiseno.getRow(1).values = [
    "INSTRUCCIONES: Escribe {{nombreCampo}} en la celda donde quieras que aparezca.",
    "Ejemplos: {{mostrarRUT}} en E4, {{mostrarFolio}} en K7, {{items_inicio}} en A20",
    "Campos válidos: " + CAMPOS_PLANTILLA.map(c => c.campo).join(", "),
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
  ];
  sheetDiseno.getRow(1).font = { bold: true, color: { argb: "FF0000" } };
  
  // Fila 2: headers de columnas (A, B, C...)
  sheetDiseno.getRow(2).values = Array.from({ length: 30 }, (_, i) => String.fromCharCode(65 + i));
  sheetDiseno.getRow(2).font = { bold: true };

  // Si ya hay layout guardado, restaurarlo en la hoja Diseño
  const layoutGuardado = (plantilla.configuracion as Record<string, unknown> | null)?._layout as Record<string, { sheet: string; row: number; col: number }> | undefined;
  if (layoutGuardado) {
    for (const [campo, pos] of Object.entries(layoutGuardado)) {
      const cell = sheetDiseno.getRow(pos.row).getCell(pos.col);
      cell.value = `{{${campo}}}`;
      cell.font = { bold: true, color: { argb: "0000FF" } };
    }
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
