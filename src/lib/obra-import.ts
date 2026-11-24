// Parser del presupuesto de obra desde Excel/CSV. Sigue el patrón de
// `src/lib/import.ts`: readTabularFile + cabeceras por alias en español +
// validación fila por fila con errores acumulados. El total se recalcula siempre
// desde cantidad × precio unitario: nunca se confía en la columna "total" del
// archivo (puede tener formulas rotas o montos copiados de otro lado).

import { normalizeKey, readTabularFile, type CellValue } from "@/lib/import";
import { totalPartida } from "@/lib/obra-budget";

export type FilaPresupuesto = {
  fila: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  esCapitulo: boolean;
  error?: string;
};

export type PreviewPresupuesto = {
  ok: boolean;
  filas: FilaPresupuesto[];
  errores: Array<{ fila: number; message: string }>;
  totalObligado: number;
  totalFilas: number;
};

const UNIDADES_VALIDAS = ["UN", "U", "M", "M2", "M3", "KG", "HORA", "HH", "DIA", "GL", "LT", "TON"];

function findCol(headers: CellValue[], ...names: string[]): number {
  const wanted = names.map(normalizeKey);
  for (let i = 0; i < headers.length; i += 1) {
    if (wanted.includes(normalizeKey(String(headers[i] ?? "")))) return i;
  }
  return -1;
}

function num(value: CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/\./g, "") // separador de miles chileno
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Lee el archivo y devuelve las filas parseadas con errores, sin escribir nada. */
export async function previewPresupuesto(file: File): Promise<PreviewPresupuesto> {
  if (file.size === 0) throw new Error("El archivo está vacío.");
  if (file.size > 5 * 1024 * 1024) throw new Error("El archivo supera los 5 MB.");

  const rows = await readTabularFile(file);
  if (rows.length < 2) throw new Error("El archivo no tiene cabeceras ni datos.");

  const [headers, ...data] = rows;
  const iCodigo = findCol(headers, "codigo", "código", "item", "ítem", "numero", "número", "folio");
  const iDesc = findCol(headers, "descripcion", "descripción", "detalle", "partida", "nombre");
  const iUnidad = findCol(headers, "unidad", "uni", "umedida", "unidad de medida");
  const iCant = findCol(headers, "cantidad", "cant", "metraje", "cubicacion", "cubicación", "qty");
  const iPrecio = findCol(headers, "preciounitario", "precio unitario", "pu", "precio", "unitario", "valorunitario");

  const faltantes: string[] = [];
  if (iDesc < 0) faltantes.push("Descripción");
  if (iCant < 0) faltantes.push("Cantidad");
  if (iPrecio < 0) faltantes.push("Precio unitario");
  if (faltantes.length > 0) {
    throw new Error(`Faltan columnas: ${faltantes.join(", ")}. El archivo debe tener al menos Descripción, Cantidad y Precio unitario.`);
  }

  const filas: FilaPresupuesto[] = [];
  const errores: Array<{ fila: number; message: string }> = [];

  data.forEach((row, index) => {
    const numeroFila = index + 2;
    const texto = (i: number) => (i < 0 ? "" : String(row[i] ?? "").trim());
    const descripcion = texto(iDesc);
    const codigo = texto(iCodigo);
    const unidad = (texto(iUnidad) || "UN").toUpperCase();
    const cantidad = num(row[iCant] ?? null);
    const precioUnitario = num(row[iPrecio] ?? null);

    if (!descripcion && !codigo) return; // fila vacía

    // Un capítulo es una fila con descripción pero sin cantidad ni precio:
    // sirve de agrupador jerárquico (ej. "1. OBRAS PRELIMINARES"). Se detecta
    // ANTES de validar montos: no tiene cantidad a propósito, no es un error.
    const esCapitulo = Boolean(descripcion) && cantidad === null && precioUnitario === null;

    let error: string | undefined;
    if (!descripcion) error = "Falta la descripción.";
    else if (esCapitulo) {
      // Los capítulos no llevan cantidad ni precio: son solo agrupadores.
    } else if (cantidad === null || cantidad < 0) error = "Cantidad inválida.";
    else if (precioUnitario === null || precioUnitario < 0) error = "Precio unitario inválido.";
    else if (!UNIDADES_VALIDAS.includes(unidad) && unidad.length > 6) error = `Unidad «${unidad}» no reconocida.`;

    filas.push({
      fila: numeroFila,
      codigo,
      descripcion,
      unidad,
      cantidad: cantidad ?? 0,
      precioUnitario: precioUnitario ?? 0,
      total: esCapitulo ? 0 : totalPartida(cantidad ?? 0, precioUnitario ?? 0),
      esCapitulo,
      error,
    });
    if (error) errores.push({ fila: numeroFila, message: error });
  });

  return {
    ok: errores.length === 0,
    filas,
    errores,
    totalObligado: filas.filter((f) => !f.error && !f.esCapitulo).reduce((s, f) => s + f.total, 0),
    totalFilas: filas.length,
  };
}
