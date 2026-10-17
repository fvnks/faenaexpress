import { XMLParser } from "fast-xml-parser";

/**
 * Parser de XML DTE del SII (facturación electrónica chilena).
 *
 * Acepta los sobres que el SII usa en la práctica: `EnvioDTE` (facturas, notas,
 * guías), `EnvioBOLETA` (boletas 39/41), un `SetDTE` suelto, un `DTE` suelto y
 * un `Documento` sin envoltorio. Ignora Signature: solo extrae datos.
 *
 * Referencia: formato oficial https://www.sii.cl/servicios_online/3532-formato_xml-3811.html
 */

/** Sobre del que se leyó el documento. Ayuda a diagnosticar formatos raros. */
export type DteSobre =
  | "EnvioDTE"
  | "EnvioBOLETA"
  | "EnvioLiquidacion"
  | "EnvioRecibos"
  | "SetDTE"
  | "DTE"
  | "Documento"
  | "desconocido";

export type DteItemDetalle = {
  nroLinDet: string | null;
  codigo: string | null; // CdgItem/VlroCod
  codigoTipo: string | null; // CdgItem/TpoCod
  nombre: string;
  descripcion: string | null; // DscItem
  cantidad: string;
  unidad: string | null; // UnmdItem
  precio: number;
  monto: number;
  indicadorExento: string | null; // IndExe
  descuentoPct: string | null;
  descuentoMonto: number | null;
  recargoPct: string | null;
  recargoMonto: number | null;
  impuestoAdicional: string | null; // CodImpAdic
};

export type DteReferencia = {
  tpoDoc: string | null; // TpoDocRef
  folio: string | null; // FolioRef
  fecha: string | null; // FchRef
  codRef: string | null;
  razonRef: string | null;
};

export type DteTransporte = {
  patente: string | null;
  rutTrans: string | null;
  rutChofer: string | null;
  nombreChofer: string | null;
  tipoDespacho: string | null;
  indTraslado: string | null;
  dirDest: string | null;
  cmnaDest: string | null;
  ciudadDest: string | null;
};

export type DteImptoReten = { tipo: string | null; tasa: string | null; monto: number };
export type DtePago = { fecha: string | null; monto: number; glosa: string | null };

export type DteCaratula = {
  rutEmisor: string | null;
  rutReceptor: string | null;
  rutEnvia: string | null;
  fechaResol: string | null;
  nroResol: string | null;
  tmstFirmaEnv: string | null;
};

/** Timbre electrónico (TED): el DD trae una copia de los datos del documento. */
export type DteTimbre = {
  presente: boolean;
  frmt: string | null; // firma base64 (no se muestra completa)
  dd: Record<string, string>;
};

export type DteDocumento = {
  // --- Encabezado / IdDoc ---
  tipoDTE: number;
  folio: string;
  fecha: string; // AAAA-MM-DD
  vencimiento: string | null; // AAAA-MM-DD
  formaPago: string | null; // 1=contado, 2=crédito, 3=sin costo
  terminoPago: string | null; // TermPagoGlosa ("CREDITO 30 DIAS")
  indServicio: string | null; // IndServicio (1/2/3/4)
  periodoDesde: string | null;
  periodoHasta: string | null;
  tpoTranVenta: string | null;
  indTraslado: string | null;
  fchRef: string | null; // fecha de referencia para notas
  codRef: string | null; // 1=anula, 2=corrige texto, 3=corrige montos
  razonRef: string | null;
  pagos: DtePago[]; // IdDoc/MntPagos

  // --- Emisor ---
  rutEmisor: string;
  razonSocialEmisor: string;
  giroEmisor: string | null;
  actecoEmisor: string | null;
  direccionEmisor: string | null;
  comunaEmisor: string | null;
  ciudadEmisor: string | null;
  telefonoEmisor: string | null;
  emailEmisor: string | null;
  sucursalEmisor: string | null;

  // --- Receptor ---
  rutReceptor: string;
  razonSocialReceptor: string;
  giroReceptor: string | null;
  contactoReceptor: string | null;
  direccionReceptor: string | null;
  comunaReceptor: string | null;
  ciudadReceptor: string | null;
  telefonoReceptor: string | null;
  emailReceptor: string | null;

  // --- Totales ---
  neto: number;
  exento: number;
  iva: number;
  ivaRecargo: number;
  total: number;
  tasaIVA: number | null;
  retencion: number; // MntRetencion
  valorPagar: number; // ValorPagar
  montoPeriodo: number; // MontoPeriodo
  saldoAnterior: number; // SaldoAnterior
  impuestosRetenidos: DteImptoReten[]; // ImptoReten
  totalesOtros: Record<string, string>; // resto de <Totales> tal cual

  // --- Ítems ---
  descripcion: string | null; // nombres de ítems del Detalle
  itemsDetalle: DteItemDetalle[] | null;

  // --- Referencias ---
  referencias: DteReferencia[];
  ordenCompra: string | null; // Referencia TpoDocRef 801
  guiaDespacho: string | null; // Referencia TpoDocRef 52
  hesNumber: string | null;
  facturaOriginal: string | null; // FolioRef para notas (33/34)
  tipoDocRefOriginal: string | null; // TpoDocRef del documento original

  // --- Info adicional ---
  fechaRecepcion: string | null; // FchRecp del SII
  estadoReceptor: string | null; // A/R (aceptado/rechazado)
  montoExe: number; // Monto exento

  // --- Contexto del sobre ---
  sobre: DteSobre;
  caratula: DteCaratula | null;
  transporte: DteTransporte | null;
  timbre: DteTimbre | null;
};

export type DteParseResult = {
  documentos: DteDocumento[];
  error?: string;
};

// "actualizar" = el documento ya existe (vino por RCV o a mano) y el XML lo
// completa: guarda el XML, llena los campos que faltaban y crea los ítems.
export type DteEstado = "nueva" | "actualizar" | "duplicada" | "omitida" | "error";

/**
 * Decodifica un XML DTE respetando su declaración de codificación: el SII
 * todavía emite archivos ISO-8859-1.
 */
export function decodeDteXml(buffer: Buffer): string {
  const head = buffer.subarray(0, 200).toString("latin1");
  if (/encoding=["'](?:iso-8859-1|latin1|windows-1252)["']/i.test(head)) {
    return buffer.toString("latin1");
  }
  return buffer.toString("utf8");
}

/**
 * Fecha AAAA-MM-DD del DTE a `Date` en UTC (la misma convención que el
 * importador de Excel y que las fechas de los documentos).
 */
export function dteDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Fecha inválida");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toInt(value: unknown): number {
  const n = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toOptionalInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = typeof value === "string" ? value : String(value);
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}

/** Primer valor no vacío de una lista de candidatos (para variantes de etiqueta). */
function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

// fast-xml-parser devuelve objeto cuando hay un solo hijo y array con varios;
// esto normaliza ambos casos.
function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function record(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

/** Aplana las hojas de un nodo a un mapa de strings, para mostrarlo tal cual. */
function flatten(node: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  const obj = record(node);
  for (const [key, value] of Object.entries(obj)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      Object.assign(out, flatten(value, label));
    } else {
      const flat = text(value);
      if (flat) out[label] = flat;
    }
  }
  return out;
}

const SOBRES = ["EnvioDTE", "EnvioBOLETA", "EnvioLiquidacion", "EnvioRecibos"] as const;

/** Primer elemento de un nodo que puede venir como objeto o como array. */
function first(value: unknown): Record<string, unknown> | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, unknown>)
    : undefined;
}

/**
 * Localiza el `SetDTE` (o el `DTE`) dentro de cualquiera de los sobres conocidos.
 * El SII envuelve las boletas en `EnvioBOLETA`, no en `EnvioDTE`.
 */
function findSetDte(json: Record<string, unknown>): {
  setDte: Record<string, unknown> | null;
  sobre: DteSobre;
} {
  for (const name of SOBRES) {
    const env = first(json[name]);
    if (!env) continue;
    const setDte = first(env.SetDTE);
    if (setDte) return { setDte, sobre: name };
    if (env.DTE) return { setDte: env, sobre: name };
  }
  const setDte = first(json.SetDTE);
  if (setDte) return { setDte, sobre: "SetDTE" };
  if (json.DTE) return { setDte: json, sobre: "DTE" };
  return { setDte: null, sobre: "desconocido" };
}

/**
 * Parsea un XML DTE. Acepta el `Buffer` del archivo o el texto ya decodificado
 * (como el `xmlContent` guardado en la base).
 */
export function parseDteXml(input: Buffer | string): DteParseResult {
  const decoded = typeof input === "string" ? input : decodeDteXml(input);
  let json: Record<string, unknown>;

  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    // Sin coerción numérica: un folio "0001" o un RUT no deben perder formato.
    parseTagValue: false,
    parseAttributeValue: false,
    // Detalle, Referencia, DTE y MntPagos pueden repetirse: siempre array.
    isArray: (name) =>
      name === "DTE" ||
      name === "Detalle" ||
      name === "Referencia" ||
      name === "MntPagos" ||
      name === "ImptoReten" ||
      name === "SubTotDTE",
  });

  try {
    json = parser.parse(decoded) as Record<string, unknown>;
  } catch {
    return { documentos: [], error: "El archivo no es un XML válido." };
  }

  const { setDte, sobre } = findSetDte(json);

  const dteCrudo = setDte?.DTE ?? json.DTE;
  let wrappers = asArray(dteCrudo as Record<string, unknown> | Record<string, unknown>[] | undefined);
  let sobreFinal: DteSobre = sobre;

  // Documentos sueltos sin DTE wrapper (algunos sistemas lo entregan así).
  if (wrappers.length === 0 && json.Documento) {
    wrappers = asArray(json.Documento as Record<string, unknown> | Record<string, unknown>[]);
    sobreFinal = "Documento";
  }

  if (wrappers.length === 0) {
    return {
      documentos: [],
      error:
        "No se encontraron documentos DTE en el archivo (se espera un EnvioDTE o EnvioBOLETA del SII).",
    };
  }

  const caratulaCruda = record(setDte?.Caratula ?? json.Caratula);
  const caratula: DteCaratula | null =
    Object.keys(caratulaCruda).length > 0
      ? {
          rutEmisor: text(caratulaCruda.RutEmisor),
          rutReceptor: text(caratulaCruda.RutReceptor),
          rutEnvia: text(caratulaCruda.RutEnvia),
          fechaResol: text(caratulaCruda.FechaResol),
          nroResol: text(caratulaCruda.NroResol),
          tmstFirmaEnv: text(caratulaCruda.TmstFirmaEnv),
        }
      : null;

  const documentos: DteDocumento[] = [];

  for (const wrapper of wrappers) {
    const doc = record(wrapper.Documento ?? wrapper);
    const encabezado = record(doc.Encabezado);
    const idDoc = record(encabezado.IdDoc);
    const emisor = record(encabezado.Emisor);
    const receptor = record(encabezado.Receptor);
    const totales = record(encabezado.Totales);

    // Timbre: el DD repite datos del documento y sirve de respaldo si el
    // encabezado viene incompleto.
    const ted = record(wrapper.TED ?? doc.TED);
    const dd = record(ted.DD);
    const timbre: DteTimbre | null =
      Object.keys(ted).length > 0
        ? { presente: true, frmt: text(ted.FRMT), dd: flatten(dd) }
        : null;

    const tipoDTE = toInt(idDoc.TipoDTE ?? dd.TipoDTE);
    const folio = firstText(idDoc.Folio, dd.Folio);
    const fecha = firstText(idDoc.FchEmis, dd.FchEmis);

    if (!folio || !fecha) continue;

    // Ítems: nombre + cantidad + precio + monto de cada línea del Detalle.
    const itemsRaw = asArray<Record<string, unknown>>(
      doc.Detalle as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );

    const itemsDetalle: DteItemDetalle[] = [];
    for (const detalle of itemsRaw) {
      const nombre = text(detalle.NmbItem);
      if (!nombre || /^\d+$/.test(nombre)) continue; // sin líneas de ajuste numérico
      const cdg = record(detalle.CdgItem);
      itemsDetalle.push({
        nroLinDet: text(detalle.NroLinDet),
        codigo: firstText(cdg.VlroCod, cdg.VlrCodigo, detalle.VlroCod, detalle.VlrCodigo),
        codigoTipo: firstText(cdg.TpoCod, cdg.TipoCodigo),
        nombre: nombre.slice(0, 200),
        descripcion: text(detalle.DscItem),
        cantidad: firstText(detalle.QtyItem, "1") ?? "1",
        unidad: text(detalle.UnmdItem),
        precio: toInt(detalle.PrcItem),
        monto: toInt(detalle.MontoItem),
        indicadorExento: text(detalle.IndExe),
        descuentoPct: text(detalle.DescuentoPct),
        descuentoMonto: toOptionalInt(detalle.DescuentoMonto),
        recargoPct: text(detalle.RecargoPct),
        recargoMonto: toOptionalInt(detalle.RecargoMonto),
        impuestoAdicional: text(detalle.CodImpAdic),
      });
    }
    const descripcion = itemsDetalle.length > 0
      ? itemsDetalle.map((item) => item.nombre).join(" · ").slice(0, 200)
      : null;

    // Referencias: OC (801), guía (52), HES y factura base para notas (33/34).
    const referencias: DteReferencia[] = asArray<Record<string, unknown>>(
      doc.Referencia as Record<string, unknown> | Record<string, unknown>[] | undefined,
    ).map((ref) => ({
      tpoDoc: text(ref.TpoDocRef),
      folio: text(ref.FolioRef),
      fecha: text(ref.FchRef),
      codRef: text(ref.CodRef),
      razonRef: text(ref.RazonRef),
    }));
    const refPorTipo = (tpo: string) =>
      referencias.find((ref) => ref.tpoDoc === tpo)?.folio ?? null;

    // HES: puede venir como referencia o en campos alternativos del XML.
    const hesNumber =
      refPorTipo("HES") ?? refPorTipo("OT") ?? refPorTipo("999") ??
      firstText(doc.RUT_OC, doc.NroHES, doc.HES);

    const pagos: DtePago[] = asArray<Record<string, unknown>>(
      idDoc.MntPagos as Record<string, unknown> | Record<string, unknown>[] | undefined,
    ).map((pago) => ({
      fecha: text(pago.FchPago),
      monto: toInt(pago.MntPago),
      glosa: text(pago.GlosaPago),
    }));

    // Factura original para notas de crédito/débito.
    const refOriginal = referencias.find((ref) => ref.tpoDoc === "33" || ref.tpoDoc === "34");

    // Forma de pago: 1=contado, 2=crédito, 3=sin costo.
    const formaPagoNum = text(idDoc.FormaPago);
    const formaPago =
      formaPagoNum === "1" ? "CONTADO" :
      formaPagoNum === "2" ? "CRÉDITO" :
      formaPagoNum === "3" ? "SIN COSTO" : null;

    // Emisor: el SII usa GiroEmis/DirOrigen/CmnaOrigen/CiudadOrigen; algunas
    // herramientas exportan variantes con "Emisor" en el nombre. El TED respalda.
    const razonSocialEmisor = firstText(emisor.RznSoc, dd.RznSoc) ?? "";
    const rutEmisor = firstText(emisor.RUTEmisor, dd.RUTEmisor) ?? "";
    const razonSocialReceptor = firstText(receptor.RznSocRecep, dd.RznSocRecep) ?? "(sin razón social)";
    const rutReceptor = firstText(receptor.RUTRecep, dd.RUTRecep) ?? "";

    const impuestosRetenidos: DteImptoReten[] = asArray<Record<string, unknown>>(
      totales.ImptoReten as Record<string, unknown> | Record<string, unknown>[] | undefined,
    ).map((imp) => ({
      tipo: text(imp.TipoImp),
      tasa: text(imp.TasaImp),
      monto: toInt(imp.MontoImp),
    }));

    const transporteRaw = record(doc.Transporte);
    const transporte: DteTransporte | null =
      Object.keys(transporteRaw).length > 0
        ? {
            patente: text(transporteRaw.Patente),
            rutTrans: text(transporteRaw.RUTTrans),
            rutChofer: text(transporteRaw.RUTChofer),
            nombreChofer: text(transporteRaw.NombreChofer),
            tipoDespacho: text(transporteRaw.TipoDespacho),
            indTraslado: text(transporteRaw.IndTraslado),
            dirDest: text(transporteRaw.DirDest),
            cmnaDest: text(transporteRaw.CmnaDest),
            ciudadDest: text(transporteRaw.CiudadDest),
          }
        : null;

    const MAPPED_TOTALES = new Set([
      "MntNeto", "MntExe", "IVA", "MntIVARecargo", "IVARecargo", "MntTotal", "TasaIVA",
      "MntRetencion", "ValorPagar", "MontoPeriodo", "SaldoAnterior", "ImptoReten",
    ]);
    const totalesOtros: Record<string, string> = {};
    for (const [key, value] of Object.entries(totales)) {
      if (MAPPED_TOTALES.has(key)) continue;
      const flat = text(value);
      if (flat) totalesOtros[key] = flat;
    }

    documentos.push({
      // IdDoc
      tipoDTE,
      folio,
      fecha,
      vencimiento: firstText(idDoc.FchVenc, pagos[0]?.fecha, dd.FchVenc),
      formaPago,
      terminoPago: text(idDoc.TermPagoGlosa),
      indServicio: text(idDoc.IndServicio),
      periodoDesde: text(idDoc.PeriodoDesde),
      periodoHasta: text(idDoc.PeriodoHasta),
      tpoTranVenta: text(idDoc.TpoTranVenta),
      indTraslado: firstText(idDoc.IndTraslado, transporte?.indTraslado),
      // CodRef/RazonRef viven dentro de <Referencia>; algunas herramientas los
      // duplican en IdDoc, así que se aceptan ambos.
      fchRef: firstText(referencias[0]?.fecha, idDoc.FchRef),
      codRef: firstText(referencias[0]?.codRef, idDoc.CodRef),
      razonRef: firstText(referencias[0]?.razonRef, idDoc.RazonRef),
      pagos,

      // Emisor
      rutEmisor,
      razonSocialEmisor,
      giroEmisor: firstText(emisor.GiroEmis, emisor.GiroEmisor, dd.GiroEmis),
      actecoEmisor: text(emisor.Acteco),
      direccionEmisor: firstText(emisor.DirOrigen, emisor.DirEmisor, dd.DirOrigen),
      comunaEmisor: firstText(emisor.CmnaOrigen, emisor.CmnaEmisor, dd.CmnaOrigen),
      ciudadEmisor: firstText(emisor.CiudadOrigen, emisor.CiudadEmisor, dd.CiudadOrigen),
      telefonoEmisor: firstText(emisor.Telefono, emisor.FonoEmisor, emisor.FonoEmis),
      emailEmisor: firstText(emisor.CorreoEmisor, emisor.EmailEmisor),
      sucursalEmisor: text(emisor.Sucursal),

      // Receptor
      rutReceptor,
      razonSocialReceptor,
      giroReceptor: firstText(receptor.GiroRecep, dd.GiroRecep),
      contactoReceptor: text(receptor.Contacto),
      direccionReceptor: firstText(receptor.DirRecep, dd.DirRecep),
      comunaReceptor: firstText(receptor.CmnaRecep, dd.CmnaRecep),
      ciudadReceptor: firstText(receptor.CiudadRecep, dd.CiudadRecep),
      telefonoReceptor: firstText(receptor.FonoRecep, receptor.Telefono),
      emailReceptor: firstText(receptor.CorreoRecep, receptor.EmailRecep),

      // Totales
      neto: toInt(totales.MntNeto ?? dd.MntNeto),
      exento: toInt(totales.MntExe ?? dd.MntExe),
      iva: toInt(totales.IVA ?? dd.IVA),
      ivaRecargo: toInt(totales.MntIVARecargo ?? totales.IVARecargo),
      total: toInt(totales.MntTotal ?? dd.MntTotal),
      tasaIVA: toOptionalNumber(totales.TasaIVA ?? dd.TasaIVA),
      retencion: toInt(totales.MntRetencion),
      valorPagar: toInt(totales.ValorPagar),
      montoPeriodo: toInt(totales.MontoPeriodo),
      saldoAnterior: toInt(totales.SaldoAnterior),
      impuestosRetenidos,
      totalesOtros,

      // Ítems
      descripcion,
      itemsDetalle: itemsDetalle.length > 0 ? itemsDetalle : null,

      // Referencias
      referencias,
      ordenCompra: refPorTipo("801"),
      guiaDespacho: refPorTipo("52"),
      hesNumber,
      facturaOriginal: refOriginal?.folio ?? null,
      tipoDocRefOriginal: refOriginal?.tpoDoc ?? null,

      // Info adicional
      fechaRecepcion: text(idDoc.FchRecp),
      estadoReceptor: firstText(idDoc.EstadoReceptor, idDoc.Estado),
      montoExe: toInt(totales.MntExe ?? dd.MntExe),

      // Contexto del sobre
      sobre: sobreFinal,
      caratula,
      transporte,
      timbre,
    });
  }

  if (documentos.length === 0) {
    return { documentos: [], error: "El archivo no contiene documentos con folio y fecha válidos." };
  }

  return { documentos };
}

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
