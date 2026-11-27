// Exporta los reportes de obra en CSV (separador ; y BOM para Excel en es-CL).
// Los datos salen de `lib/obra-reportes.ts`, la misma fuente de la pantalla.

import { requireObraContext } from "@/lib/obra-auth";
import { cargarReporteObra } from "@/lib/obra-reportes";

function aCsv(filas: Array<Array<string | number>>): string {
  return filas
    .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
}

export async function GET(request: Request) {
  const ctx = await requireObraContext("panel");
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "desviaciones";
  const reporte = await cargarReporteObra(ctx.obra.id);

  let nombre = "reporte.csv";
  let filas: Array<Array<string | number>> = [];

  if (tipo === "curva") {
    nombre = `curva-s-${ctx.obra.id.slice(0, 8)}.csv`;
    filas = [
      ["Mes", "Planificado", "Real"],
      ...reporte.puntos.map((punto) => [punto.mes, punto.planificado, punto.real]),
    ];
  } else if (tipo === "cuadrillas") {
    nombre = `productividad-${ctx.obra.id.slice(0, 8)}.csv`;
    filas = [
      ["Cuadrilla", "Integrantes", "Mediciones", "Cantidad", "Valorizado", "Por integrante"],
      ...reporte.cuadrillas.map((c) => [c.nombre, c.integrantes, c.mediciones, c.cantidad, c.valorizado, c.porIntegrante]),
    ];
  } else {
    nombre = `desviaciones-${ctx.obra.id.slice(0, 8)}.csv`;
    filas = [
      ["Código", "Partida", "Obligado", "Real", "Desviación", "Desviación %"],
      ...reporte.desviaciones.map((d) => [
        d.codigo, d.descripcion, d.obligado, d.real, d.desviacion, d.desviacionPct ?? "",
      ]),
    ];
  }

  return new Response(`\uFEFF${aCsv(filas)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
