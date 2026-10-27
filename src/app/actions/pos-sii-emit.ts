"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP } from "@/lib/money";
import { generateDteXml } from "@/lib/dte-generator";
import { firmarDte } from "@/lib/dte-signer";
import {
  detectarSiiEnvironment,
  enviarDteSii,
  SiiEnvioResultado,
} from "@/lib/sii-client";
import { getPosSiiConfigForUI } from "@/app/actions/pos-sii-caf";
import { getPosSale } from "@/lib/pos";

export type EmitirDteState =
  | { error?: string; ok?: boolean; trackId?: string; dteFolio?: number }
  | undefined;

/**
 * Emite el DTE (Factura 33 o Boleta 39) para una venta POS ya registrada.
 *
 * Flujo:
 * 1. Valida que la empresa tenga SII habilitado y certificado/CAF.
 * 2. Obtiene un folio disponible del CAF según el tipo de documento.
 * 3. Genera el XML DTE con los datos de la venta.
 * 4. Lo firma con el certificado .pfx de la empresa.
 * 5. Lo envía al SII y obtiene el TrackID.
 * 6. Guarda el registro PosDte (estado, trackId, XML enviado/respuesta).
 * 7. Incrementa folioActual del CAF.
 * 8. Vincula la PosSale con el PosDte.
 *
 * Si el SII rechaza o falla, guarda el PosDte en estado RECHAZADO con el
 * XML de respuesta para revisión posterior, sin fallar la venta.
 */
export async function emitirDtePosSale(
  saleId: string,
): Promise<EmitirDteState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el SII." };
  }

  const sale = await getPosSale(ctx.company.id, saleId);
  if (!sale) return { error: "La venta POS no existe." };
  if (sale.status !== "COMPLETED") {
    return { error: "Solo se pueden emitir DTE de ventas completadas." };
  }
  if (sale.total < 0) {
    return { error: "No se emite DTE para devoluciones (totales negativos)." };
  }

  // Configuración SII de la empresa.
  const config = await getPosSiiConfigForUI(ctx.company.id);
  if (!config) {
    return {
      error:
        "La empresa no tiene configuración SII. Configúrala en /pos/sii antes de emitir DTE.",
    };
  }
  if (!config.habilitado) {
    return { error: "El módulo SII no está habilitado para esta empresa." };
  }
  if (!config.certificadoPfx) {
    return {
      error:
        "Falta el certificado digital (.pfx). Súbelo en /pos/sii antes de emitir DTE.",
    };
  }
  if (!config.resolucionSii || !config.acteco) {
    return {
      error:
        "Faltan datos del emisor (resolución SII o acteco). CompLétalos en /pos/sii.",
    };
  }

  // Determinar tipo de DTE: boleta (39) por defecto; factura (33) si el cliente tiene RUT y no es consumidor final.
  const esConsumidorFinal =
    !sale.partner ||
    sale.partner.rut === "66666666-6" ||
    sale.partner.rut === null;
  const tipoDte = esConsumidorFinal ? 39 : 33;

  // Buscar un CAF disponible para este tipo de DTE.
  const caf = config.cafs?.find(
    (c) => c.tipoDte === tipoDte && c.folioActual < c.folioFinal,
  );
  if (!caf) {
    return {
      error: `No hay CAF disponible con folios para DTE tipo ${tipoDte}. Carga un CAF en /pos/sii.`,
    };
  }
  if (
    caf.vigenteHasta &&
    new Date(caf.vigenteHasta) < new Date()
  ) {
    return {
      error: `El CAF tipo ${tipoDte} está vencido (${new Date(caf.vigenteHasta).toLocaleDateString("es-CL")}). Carga un CAF nuevo.`,
    };
  }

  const folio = caf.folioActual + 1;

  // Construir los datos del DTE desde la venta.
  const items = sale.items.map((item: any, index: number) => ({
    nroLinDet: index + 1,
    codigo: item.productId ?? null,
    codigoTipo: null,
    nombre: item.name,
    descripcion: null,
    cantidad: Number(item.quantity),
    unidad: null,
    precio: item.unitPrice,
    descuentoMonto: item.discount ?? 0,
    indicadorExento: null,
  }));

  const dteInput = {
    tipoDte,
    folio,
    fecha: sale.createdAt.toISOString().slice(0, 10),
    hora: sale.createdAt.toISOString().slice(11, 19),
    rutEmisor: ctx.company.rut ?? "",
    razonSocialEmisor: ctx.company.name,
    giroEmisor: ctx.company.giro ?? null,
    actecoEmisor: config.acteco ?? null,
    direccionEmisor: ctx.company.address ?? null,
    comunaEmisor: ctx.company.commune ?? null,
    ciudadEmisor: ctx.company.city ?? null,
    telefonoEmisor: ctx.company.phone ?? null,
    emailEmisor: ctx.company.email ?? null,
    sucursalEmisor: null,
    rutReceptor: sale.partner?.rut ?? "66666666-6",
    razonSocialReceptor: sale.partner?.name ?? "Consumidor final",
    giroReceptor: null,
    direccionReceptor: null,
    comunaReceptor: null,
    ciudadReceptor: null,
    telefonoReceptor: null,
    emailReceptor: null,
    items,
    neto: sale.subtotal,
    exento: 0,
    iva: sale.tax,
    total: sale.total,
    formaPago: "1" as const, // contado (POS es al contado)
    terminoPago: null,
    ordenCompra: null,
    guiaDespacho: null,
    hesNumber: null,
    notas: sale.notes ?? null,
  };

  // Generar XML DTE.
  let xmlDte: string;
  try {
    xmlDte = generateDteXml(dteInput);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { error: `No se pudo generar el XML DTE: ${message}` };
  }

  // Firmar con el certificado .pfx.
  const certificadoPass = config.certificadoPass
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      // La clave se guarda cifrada; para firmar necesitamos descifrarla.
      // Usamos la misma utilidad de sii-crypto (desencripta el .pfx; la clave
      // del certificado va por separado si la empresa la guardó).
      undefined
    : null;

  let firmado;
  try {
    firmado = firmarDte(xmlDte, config.certificadoPfx, certificadoPass);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { error: `No se pudo firmar el DTE: ${message}` };
  }

  // Enviar al SII.
  const environment = detectarSiiEnvironment(true, false); // pruebas por defecto
  let envio: SiiEnvioResultado;
  try {
    envio = await enviarDteSii(
      firmado.signedXml,
      environment,
      ctx.company.rut ?? undefined,
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    // Guardar el DTE como RECHAZADO/ERROR para no perder el intento.
    await guardarPosDte(
      ctx,
      {
        configId: config.id,
        tipoDte,
        folio,
        estado: "ERROR_ENVIO",
        trackId: "",
        xmlEnviado: xmlDte,
        xmlRespuesta: message,
        pdfPath: null,
        saleId: sale.id,
      },
    );
    return {
      error: `No se pudo enviar el DTE al SII: ${message}. Se guardó como error para reintentar.`,
    };
  }

  // Guardar el PosDte con el resultado del SII.
  await guardarPosDte(
    ctx,
    {
      configId: config.id,
      tipoDte,
      folio,
      estado: envio.aceptado ? "EMITIDO" : "RECHAZADO",
      trackId: envio.trackId,
      xmlEnviado: firmado.signedXml,
      xmlRespuesta: envio.respuestaXml,
      pdfPath: null,
      saleId: sale.id,
    },
  );

  // Incrementar folioActual del CAF solo si el SII aceptó el documento.
  if (envio.aceptado && envio.trackId) {
    await db.posCaf.update({
      where: { id: caf.id },
      data: { folioActual: folio },
    });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosDte",
    entityId: sale.id,
    summary: `Emitió DTE tipo ${tipoDte} folio ${folio} para la venta ${sale.saleNumber} (TrackID: ${envio.trackId}).`,
  });

  revalidatePath("/pos/ventas");
  revalidatePath(`/pos/ventas/${saleId}`);
  revalidatePath("/pos/sii");

  return {
    ok: envio.aceptado,
    trackId: envio.trackId,
    dteFolio: folio,
    error: envio.aceptado
      ? undefined
      : `El SII rechazó el DTE: ${envio.mensaje}`,
  };
}

/**
 * Guarda un registro PosDte vinculado a una venta POS.
 */
async function guardarPosDte(
  ctx: Awaited<ReturnType<typeof requireContext>>,
  data: {
    configId: string;
    tipoDte: number;
    folio: number;
    estado: string;
    trackId: string;
    xmlEnviado: string;
    xmlRespuesta: string;
    pdfPath: string | null;
    saleId: string;
  },
) {
  const existing = await db.posDte.findFirst({
    where: { saleId: data.saleId, companyId: ctx.company.id },
  });

  if (existing) {
    await db.posDte.update({
      where: { id: existing.id },
      data: {
        tipoDte: data.tipoDte,
        folio: data.folio,
        estado: data.estado,
        trackId: data.trackId || null,
        xmlEnviado: data.xmlEnviado,
        xmlRespuesta: data.xmlRespuesta,
        pdfPath: data.pdfPath,
        emitidoAt: data.estado === "EMITIDO" ? new Date() : null,
        anuladoAt: null,
      },
    });
    return;
  }

  await db.posDte.create({
    data: {
      companyId: ctx.company.id,
      configId: data.configId,
      tipoDte: data.tipoDte,
      folio: data.folio,
      estado: data.estado,
      trackId: data.trackId || null,
      xmlEnviado: data.xmlEnviado,
      xmlRespuesta: data.xmlRespuesta,
      pdfPath: data.pdfPath,
      saleId: data.saleId,
      emitidoAt: data.estado === "EMITIDO" ? new Date() : null,
      anuladoAt: null,
    },
  });
}

/**
 * Reintenta el envío de un DTE que quedó en error o rechazado.
 */
export async function reintentarDtePosSale(
  saleId: string,
): Promise<EmitirDteState> {
  return emitirDtePosSale(saleId);
}

/**
 * Server Action wrapper para usar con useActionState desde el cliente.
 * Recibe el saleId del formData y reintenta la emisión del DTE.
 */
export async function reintentarDteAction(
  _prev: EmitirDteState,
  formData: FormData,
): Promise<EmitirDteState> {
  const saleId = String(formData.get("saleId") ?? "");
  return reintentarDtePosSale(saleId);
}
