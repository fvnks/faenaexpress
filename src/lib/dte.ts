import { XMLParser } from "fast-xml-parser";

/**
 * Parser de XML DTE del SII (facturación electrónica chilena).
 *
 * Soporta tanto un sobre `EnvioDTE` (con Carátula y N documentos) como un
 * `DTE`/`Documento` individual. Ignora TED y Signature: solo extrae datos.
 *
 * Referencia: formato oficial https://www.sii.cl/servicios_online/3532-formato_xml-3811.html
 */

export type DteDocumento = {
  tipoDTE: number;
  folio: string;
  fecha: string; // AAAA-MM-DD
  vencimiento: string | null; // AAAA-MM-DD
  rutEmisor: string;
  razonSocialEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  giroReceptor: string | null;
  direccionReceptor: string | null;
  comunaReceptor: string | null;
  neto: number;
  iva: number;
  total: number;
  descripcion: string | null; // nombres de ítems del Detalle
  itemsDetalle: { nombre: string; cantidad: string; precio: number; monto: number }[] | null;
  ordenCompra: string | null; // Referencia TpoDocRef 801
  guiaDespacho: string | null; // Referencia TpoDocRef 52
  terminoPago: string | null; // TermPagoGlosa ("CREDITO 30 DIAS")
};

export type DteParseResult = {
  documentos: DteDocumento[];
  error?: string;
};

export type DteEstado = "nueva" | "duplicada" | "omitida" | "error";

function decodeXml(buffer: Buffer): string {
  // Los XML del SII suelen ser ISO-8859-1; respetamos la declaración.
  const head = buffer.subarray(0, 200).toString("latin1");
  if (/encoding=["'](?:iso-8859-1|latin1|windows-1252)["']/i.test(head)) {
    return buffer.toString("latin1");
  }
  return buffer.toString("utf8");
}

function toInt(value: unknown): number {
  const n = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = typeof value === "string" ? value : String(value);
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}

// fast-xml-parser devuelve objeto cuando hay un solo hijo y array con varios;
// esto normaliza ambos casos.
function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseDteXml(buffer: Buffer): DteParseResult {
  let decoded: string;
  let json: Record<string, unknown>;
  try {
    decoded = decodeXml(buffer);
  } catch {
    return { documentos: [], error: "No se pudo leer el archivo (codificación no reconocida)." };
  }

  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    // Detalle, Referencia, DTE y MntPagos pueden repetirse: siempre array.
    isArray: (name) =>
      name === "DTE" ||
      name === "Detalle" ||
      name === "Referencia" ||
      name === "MntPagos" ||
      name === "SubTotDTE",
  });

  try {
    json = parser.parse(decoded) as Record<string, unknown>;
  } catch {
    return { documentos: [], error: "El archivo no es un XML válido." };
  }

  // Localiza los <DTE> dentro del sobre EnvioDTE o un documento suelto.
  const envio = (json.EnvioDTE ?? {}) as Record<string, unknown>;
  const setDte = (envio.SetDTE ?? json.SetDTE ?? {}) as Record<string, unknown>;
  const dteCrudo = setDte.DTE ?? json.DTE;
  const dtes = asArray<Record<string, unknown>>(
    dteCrudo as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );

  // Documentos sueltos sin DTE wrapper (algunos sistemas lo entregan así).
  const documentosSueltos = json.Documento ? [json.Documento as Record<string, unknown>] : [];

  const wrappers = dtes.length > 0 ? dtes : documentosSueltos;
  if (wrappers.length === 0) {
    return {
      documentos: [],
      error: "No se encontraron documentos DTE en el archivo (se esperaba un EnvioDTE del SII).",
    };
  }

  const documentos: DteDocumento[] = [];

  for (const wrapper of wrappers) {
    const doc = (wrapper.Documento ?? wrapper) as Record<string, unknown>;
    const encabezado = (doc.Encabezado ?? {}) as Record<string, unknown>;
    const idDoc = (encabezado.IdDoc ?? {}) as Record<string, unknown>;
    const emisor = (encabezado.Emisor ?? {}) as Record<string, unknown>;
    const receptor = (encabezado.Receptor ?? {}) as Record<string, unknown>;
    const totales = (encabezado.Totales ?? {}) as Record<string, unknown>;

    const tipoDTE = toInt(idDoc.TipoDTE);
    const folio = text(idDoc.Folio);
    const fecha = text(idDoc.FchEmis);

    if (!folio || !fecha) continue;

    // Ítems: nombre + cantidad + precio + monto de cada línea del Detalle.
    const itemsRaw = asArray<Record<string, unknown>>(
      doc.Detalle as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );
    const items = itemsRaw
      .map((detalle) => text(detalle.NmbItem))
      .filter((name): name is string => !!name && !/^\d+$/.test(name)); // sin líneas de ajuste numérico

    // Items individuales para el PDF: [{nombre, cantidad, precio, monto}]
    const itemsDetalle = itemsRaw
      .map((detalle) => {
        const nombre = text(detalle.NmbItem);
        if (!nombre || /^\d+$/.test(nombre)) return null; // sin líneas de ajuste
        return {
          nombre: nombre.slice(0, 200),
          cantidad: text(detalle.QtyItem) ?? "1",
          precio: toInt(detalle.PrcItem),
          monto: toInt(detalle.MontoItem),
        };
      })
      .filter((item): item is { nombre: string; cantidad: string; precio: number; monto: number } => item !== null);

    // Referencias: OC (801), guía (52) y factura base para notas (33/34).
    const referencias = asArray<Record<string, unknown>>(
      doc.Referencia as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );
    const refPorTipo = (tpo: string) => {
      const ref = referencias.find((r) => text(r.TpoDocRef) === tpo);
      return ref ? text(ref.FolioRef) : null;
    };

    const mntPagos = asArray<Record<string, unknown>>(
      idDoc.MntPagos as Record<string, unknown> | Record<string, unknown>[] | undefined,
    )[0];

    documentos.push({
      tipoDTE,
      folio,
      fecha,
      vencimiento: text(idDoc.FchVenc) ?? text(mntPagos?.FchPago),
      rutEmisor: text(emisor.RUTEmisor) ?? "",
      razonSocialEmisor: text(emisor.RznSoc) ?? "",
      rutReceptor: text(receptor.RUTRecep) ?? "",
      razonSocialReceptor: text(receptor.RznSocRecep) ?? "(sin razón social)",
      giroReceptor: text(receptor.GiroRecep),
      direccionReceptor: text(receptor.DirRecep),
      comunaReceptor: text(receptor.CmnaRecep),
      neto: toInt(totales.MntNeto),
      iva: toInt(totales.IVA),
      total: toInt(totales.MntTotal),
      descripcion: items.length > 0 ? items.join(" · ").slice(0, 200) : null,
      itemsDetalle: itemsDetalle.length > 0 ? itemsDetalle : null,
      ordenCompra: refPorTipo("801"),
      guiaDespacho: refPorTipo("52"),
      terminoPago: text(idDoc.TermPagoGlosa),
    });
  }

  if (documentos.length === 0) {
    return { documentos: [], error: "El archivo no contiene documentos con folio y fecha válidos." };
  }

  return { documentos };
}
