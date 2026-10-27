"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import {
  construirDocumentoDTE,
  construirRepresentacionImprimible,
  DatosDteVenta,
  emitirDteTypeDte,
  generarPdfCartaDte,
  generarPdfTicketDte,
  nombreArchivoDte,
} from "@/lib/dte-typedte";
import { getPosSiiConfigForUI } from "@/app/actions/pos-sii-caf";

/** Resultado de una acción de DTE. */
export type DteActionResult =
  | { ok: true; tipoDte: number; folio: number; trackId?: string; pdf?: Buffer; nombreArchivo?: string }
  | { ok: false; error: string };

/** Resultado de generación de PDF. */
export type DtePdfResult =
  | { ok: true; pdf: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

/** Resultado de vista previa de importación (stub para compatibilidad). */
export type DtePreviewResult = {
  ok: boolean;
  imported: number;
  updated: number;
  error?: string;
  errores: string[];
  rows: Array<{
    folio: string;
    tipo: string;
    tipoDTE: number;
    fecha?: string;
    cliente?: string;
    descripcion?: string;
    neto: number;
    iva: number;
    total: number;
    estado: string;
    existingSaleId?: string;
    mensaje?: string;
  }>;
  resumen: any;
  xmlFiles: number;
};

/**
 * Lee la configuración SII de la empresa y valida credenciales mínimas.
 */
async function obtenerConfigSiiValida(companyId: string) {
  const config = await getPosSiiConfigForUI(companyId);
  if (!config) {
    throw new Error(
      "La empresa no tiene configuración SII. Configúrala en /pos/sii antes de emitir DTE.",
    );
  }
  if (!config.habilitado) {
    throw new Error("El módulo SII no está habilitado para esta empresa.");
  }
  if (!config.certificadoPfx) {
    throw new Error(
      "Falta el certificado digital (.pfx). Súbelo en /pos/sii antes de emitir DTE.",
    );
  }
  if (!config.resolucionSii || !config.acteco) {
    throw new Error(
      "Faltan datos del emisor (resolución SII o acteco). CompLétalos en /pos/sii.",
    );
  }
  return config;
}

/**
 * Busca un CAF disponible para el tipo de documento.
 */
function obtenerCafDisponible(config: any, tipoDte: number) {
  const caf = config.cafs?.find(
    (c: any) => c.tipoDte === tipoDte && Number(c.folioActual) < Number(c.folioFinal),
  );
  if (!caf) {
    throw new Error(
      `No hay CAF disponible con folios para DTE tipo ${tipoDte}. Carga un CAF en /pos/sii.`,
    );
  }
  if (caf.vigenteHasta && new Date(caf.vigenteHasta) < new Date()) {
    throw new Error(
      `El CAF tipo ${tipoDte} está vencido (${new Date(caf.vigenteHasta).toLocaleDateString("es-CL")}). Carga un CAF nuevo.`,
    );
  }
  return caf;
}

/**
 * Genera un XML CAF mínimo a partir de los datos guardados en PosCaf.
 */
function generarXmlCafTemporal(caf: {
  folioInicio: number;
  folioFinal: number;
  tipoDte: number;
  vigenteDesde: Date | string;
  vigenteHasta: Date | string;
}): string {
  const desde = new Date(caf.vigenteDesde).toISOString().slice(0, 10);
  const hasta = new Date(caf.vigenteHasta).toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<CAF>
  <DA>
    <RE>00000000-0</RE>
    <RS>CAF Temporal</RS>
    <TD>${caf.tipoDte}</TD>
    <RNG>
      <D>${caf.folioInicio}</D>
      <H>${caf.folioFinal}</H>
    </RNG>
    <FA>${desde}</FA>
    <FH>${hasta}</FH>
  </DA>
  <FRMT></FRMT>
</CAF>`;
}

/**
 * Server Action: emite un DTE para una venta y opcionalmente genera el PDF.
 *
 * Requiere que la empresa tenga credenciales SII configuradas (certificado,
 * CAF, resolución, acteco). Si no se pueden obtener, devuelve error descriptivo.
 */
export async function emitirDteAction(
  _prev: DteActionResult | undefined,
  formData: FormData,
): Promise<DteActionResult> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { ok: false, error: "No tienes permiso para configurar el SII." };
  }

  const saleId = String(formData.get("saleId") ?? "");
  const generarPdf = formData.get("generarPdf") === "true";
  const tipoPdf = (formData.get("tipoPdf") as "carta" | "ticket") ?? "carta";

  if (!saleId) {
    return { ok: false, error: "Falta el ID de la venta." };
  }

  // Buscar la venta (usar as any para evitar problemas de tipos de Prisma).
  const sale = (await (db as any).posSale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
  })) as any;
  if (!sale) {
    return { ok: false, error: "La venta no existe." };
  }

  // Cargar relaciones por separado.
  const [partner, items, dtes] = await Promise.all([
    sale.partnerId
      ? (db as any).partner.findFirst({ where: { id: sale.partnerId, companyId: ctx.company.id } })
      : null,
    (db as any).posSaleItem.findMany({ where: { saleId: sale.id } }),
    (db as any).posDte.findMany({ where: { saleId: sale.id, companyId: ctx.company.id } }),
  ]);

  // Si ya tiene DTE emitido, no reemitir.
  const dteExistente = dtes?.find((d: any) => d.estado === "EMITIDO");
  if (dteExistente) {
    return {
      ok: true,
      tipoDte: dteExistente.tipoDte,
      folio: dteExistente.folio,
      trackId: dteExistente.trackId ?? undefined,
    };
  }

  // Determinar tipo de DTE: boleta (39) por defecto para consumidor final,
  // factura (33) si el cliente tiene RUT y no es consumidor final.
  const esConsumidorFinal =
    !partner ||
    partner.rut === "66666666-6" ||
    partner.rut === null;
  const tipoDte = esConsumidorFinal ? 39 : 33;

  const config = await obtenerConfigSiiValida(ctx.company.id);
  const caf = obtenerCafDisponible(config, tipoDte);
  const folio = Number(caf.folioActual) + 1;

  // Entorno SII: BD > variable de entorno > pruebas.
  const ambiente =
    (config.siiEnvironment as string) ??
    (process.env.SII_ENVIRONMENT === "produccion" ? "produccion" : "pruebas");

  // Construir datos del DTE.
  const fechaEmision = sale.date.toISOString().slice(0, 10);
  const datos: DatosDteVenta = {
    tipoDte,
    folio,
    fechaEmision,
    rutEmisor: ctx.company.rut ?? "",
    razonSocialEmisor: ctx.company.name,
    giroEmisor: ctx.company.giro ?? "",
    actividadesEconomicas: [Number(config.acteco ?? "471101")],
    direccionEmisor: ctx.company.address ?? "",
    comunaEmisor: ctx.company.commune ?? "",
    ciudadEmisor: ctx.company.city ?? undefined,
    telefonoEmisor: ctx.company.phone ?? undefined,
    correoEmisor: ctx.company.email ?? undefined,
    rutReceptor: partner?.rut ?? "66666666-6",
    razonSocialReceptor: partner?.name ?? "Consumidor final",
    giroReceptor: undefined,
    direccionReceptor: undefined,
    comunaReceptor: undefined,
    ciudadReceptor: undefined,
    telefonoReceptor: undefined,
    correoReceptor: undefined,
    items: items.map((item: any) => ({
      nombre: item.name,
      cantidad: Number(item.quantity),
      precioUnitario: item.unitPrice,
      descuentoMonto: item.discount ?? 0,
      exento: false,
    })),
    formaPago: "contado",
    neto: sale.totalAmount,
    exento: 0,
    iva: 0,
    total: sale.totalAmount,
    notas: sale.notes ?? undefined,
  };

  // Cargar certificado y CAF.
  let certificadoPfx: Buffer;
  let certificadoPass: string | undefined;
  try {
    certificadoPfx = Buffer.from((config.certificadoPfx ?? ""), "base64");
    certificadoPass = config.certificadoPass ?? undefined;
  } catch {
    return { ok: false, error: "No se pudo leer el certificado digital guardado." };
  }

  const cafXml = generarXmlCafTemporal(caf);

  // Emitir DTE con typeDte.
  let dteGenerado;
  try {
    dteGenerado = emitirDteTypeDte(
      construirDocumentoDTE(datos),
      cafXml,
      certificadoPfx,
      certificadoPass,
      `${fechaEmision}T${new Date().toISOString().slice(11, 19)}`,
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return {
      ok: false,
      error: `No se pudo generar el DTE con typeDte: ${message}`,
    };
  }

  // Generar PDF si se solicitó.
  let pdfBuffer: Buffer | undefined;
  let nombreArchivo: string | undefined;
  if (generarPdf) {
    try {
      const representacion = construirRepresentacionImprimible(
        datos,
        dteGenerado.totales,
        dteGenerado.ted,
        "SANTIAGO ORIENTE",
        parseInt(config.resolucionSii?.replace(/\D/g, "") ?? "0") || 0,
        new Date().getFullYear(),
      );

      pdfBuffer =
        tipoPdf === "ticket"
          ? await generarPdfTicketDte(representacion)
          : await generarPdfCartaDte(representacion);
      nombreArchivo = nombreArchivoDte(tipoDte, folio);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // No fallar la emisión si el PDF falla.
    }
  }

  // Guardar PosDte.
  let posDte;
  try {
    posDte = await (db as any).posDte.create({
      data: {
        companyId: ctx.company.id,
        configId: config.id,
        tipoDte,
        folio,
        estado: "PENDIENTE_ENVIO",
        trackId: null,
        xmlEnviado: dteGenerado.xml,
        xmlRespuesta: "DTE generado con typeDte. Pendiente de envío al SII.",
        pdfPath: null,
        saleId: sale.id,
        emitidoAt: null,
        anuladoAt: null,
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `No se pudo guardar el DTE: ${message}` };
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosDte",
    entityId: sale.id,
    summary: `Generó DTE tipo ${tipoDte} folio ${folio} para la venta ${sale.saleNumber ?? saleId} (typeDte).`,
  });

  revalidatePath("/pos/ventas");
  revalidatePath(`/pos/ventas/${saleId}`);
  revalidatePath("/pos/sii");

  return {
    ok: true,
    tipoDte,
    folio,
    pdf: pdfBuffer,
    nombreArchivo,
  };
}

/**
 * Server Action: genera el PDF de un DTE existente (PosDte) y lo devuelve
 * como Buffer para que el cliente lo descargue.
 */
export async function generarPdfDteAction(
  _prev: DtePdfResult | undefined,
  formData: FormData,
): Promise<DtePdfResult> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { ok: false, error: "No tienes permiso para configurar el SII." };
  }

  const posDteId = String(formData.get("posDteId") ?? "");
  const tipoPdf = (formData.get("tipoPdf") as "carta" | "ticket") ?? "carta";

  if (!posDteId) {
    return { ok: false, error: "Falta el ID del DTE." };
  }

  const posDte = (await (db as any).posDte.findFirst({
    where: { id: posDteId, companyId: ctx.company.id },
    include: {
      sale: {
        include: {
          partner: true,
          items: true,
        },
      },
    },
  })) as any;
  if (!posDte) {
    return { ok: false, error: "El DTE no existe." };
  }
  if (!posDte.sale) {
    return { ok: false, error: "El DTE no está vinculado a una venta." };
  }

  const sale = posDte.sale;

  // Obtener config SII para acteco y número de resolución.
  const configSii = await getPosSiiConfigForUI(ctx.company.id);
  const acteco = configSii?.acteco ?? "471101";
  const numeroResolucion = configSii?.resolucionSii
    ? parseInt(configSii.resolucionSii.replace(/\D/g, "")) || 0
    : 0;

  // Reconstruir datos del DTE desde la venta.
  const esConsumidorFinal =
    !sale.partner ||
    sale.partner.rut === "66666666-6" ||
    sale.partner.rut === null;
  const tipoDte = esConsumidorFinal ? 39 : 33;

  const datos: DatosDteVenta = {
    tipoDte,
    folio: posDte.folio,
    fechaEmision: sale.date.toISOString().slice(0, 10),
    rutEmisor: ctx.company.rut ?? "",
    razonSocialEmisor: ctx.company.name,
    giroEmisor: ctx.company.giro ?? "",
    actividadesEconomicas: [Number(acteco)],
    direccionEmisor: ctx.company.address ?? "",
    comunaEmisor: ctx.company.commune ?? "",
    ciudadEmisor: ctx.company.city ?? undefined,
    telefonoEmisor: ctx.company.phone ?? undefined,
    correoEmisor: ctx.company.email ?? undefined,
    rutReceptor: sale.partner?.rut ?? "66666666-6",
    razonSocialReceptor: sale.partner?.name ?? "Consumidor final",
    items: sale.items.map((item: any) => ({
      nombre: item.name,
      cantidad: Number(item.quantity),
      precioUnitario: item.unitPrice,
      descuentoMonto: item.discount ?? 0,
      exento: false,
    })),
    formaPago: "contado",
    neto: sale.totalAmount,
    exento: 0,
    iva: 0,
    total: sale.totalAmount,
    notas: sale.notes ?? undefined,
  };

  try {
    const representacion = construirRepresentacionImprimible(
      datos,
      { neto: datos.neto, exento: datos.exento, iva: datos.iva, total: datos.total },
      {},
      "SANTIAGO ORIENTE",
      numeroResolucion,
      new Date().getFullYear(),
    );

    const pdfBuffer =
      tipoPdf === "ticket"
        ? await generarPdfTicketDte(representacion)
        : await generarPdfCartaDte(representacion);

    const nombreArchivo = nombreArchivoDte(tipoDte, posDte.folio);

    return {
      ok: true,
      pdf: pdfBuffer,
      nombreArchivo,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `No se pudo generar el PDF: ${message}` };
  }
}

/**
 * Stub: vista previa de importación de XML DTE (funcionalidad movida a typeDte).
 */
export async function previewDteImport(
  _prev: DtePreviewResult | undefined,
  _formData: FormData,
): Promise<DtePreviewResult> {
  return {
    ok: false,
    imported: 0,
    updated: 0,
    errores: ["La importación de XML DTE se ha movido al módulo POS SII. Usa /pos/sii para configurar y emitir DTE."],
    rows: [],
    resumen: "No disponible",
    xmlFiles: 0,
  };
}

/**
 * Stub: confirmación de importación de XML DTE.
 */
export async function confirmDteImport(
  _prev: DtePreviewResult | undefined,
  _formData: FormData,
): Promise<DtePreviewResult> {
  return previewDteImport(_prev, _formData);
}

export type DtePreviewRow = {
  folio: string;
  tipo: string;
  tipoDTE: number;
  fecha?: string;
  cliente?: string;
  descripcion?: string;
  neto: number;
  iva: number;
  total: number;
  estado: string;
  existingSaleId?: string;
  mensaje?: string;
};

/**
 * Stub: vista previa de importación de XML de compra.
 */
export async function previewPurchaseXml(
  _prev: DtePreviewResult | undefined,
  _formData: FormData,
): Promise<DtePreviewResult> {
  return previewDteImport(_prev, _formData);
}

/**
 * Stub: confirmación de importación de XML de compra.
 */
export async function confirmPurchaseXml(
  _prev: DtePreviewResult | undefined,
  _formData: FormData,
): Promise<DtePreviewResult> {
  return previewDteImport(_prev, _formData);
}

/**
 * Stub: backfill de ítems de venta desde XML.
 */
export async function backfillSaleItemsFromXml(
  _prev: { ok?: boolean; error?: string } | undefined,
  _formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  return {
    ok: false,
    error: "La backfill de ítems desde XML se ha movido al módulo POS SII.",
  };
}

/**
 * Server Action wrapper para usar como form action directo (recibe FormData,
 * devuelve void). Extrae saleId del formData y llama a backfillSaleItemsFromXml.
 */
export async function backfillSaleItemsFromXmlFormAction(
  formData: FormData,
): Promise<void> {
  const saleId = String(formData.get("saleId") ?? "");
  await backfillSaleItemsFromXml(undefined, formData);
  // No redirigir ni hacer nada visible; el stub solo reporta error.
}
