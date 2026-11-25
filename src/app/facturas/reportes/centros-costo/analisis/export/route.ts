import { requireContext } from "@/lib/auth";
import {
  cargarAnalisisCentros,
  detalleParaCsv,
  resumenParaCsv,
} from "@/lib/centros-costo-analytics";
import { csvResponse, toCsv } from "@/lib/csv";
import { currentPeriod, monthRange } from "@/lib/money";

/** Mismos filtros que la pantalla, sin paginar: resumen o detalle. */
export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const params = new URL(request.url).searchParams;
  const raw = params.get("periodo") ?? "";
  const periodo = monthRange(raw) ? raw : currentPeriod();
  const vista = params.get("vista") === "detalle" ? "detalle" : "resumen";

  const analisis = await cargarAnalisisCentros(ctx.company.id, periodo, 12);
  const filas = vista === "detalle" ? detalleParaCsv(analisis) : resumenParaCsv(analisis);
  const csv = toCsv(filas[0], filas.slice(1));
  return csvResponse(`centros-costo-${vista}-${periodo}.csv`, csv);
}
