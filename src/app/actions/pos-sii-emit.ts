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
  consultarEstadoDteSii,
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

  // Buscar un CAF disponible para este tipo de DTE con bloqueo optimista
  // y reintentos para evitar condiciones de carrera entre cajas simultáneas.
  let intentos = 0;
  const maxIntentos = 3;
  let envio: SiiEnvioResultado | null = null;
  let folioUsado = 0;
  let xmlFirmadoGuardado = "";
  let cafSeleccionado: { id: string; folioActual: number; folioFinal: number; tipoDte: number; vigenteHasta: Date | string } | null = null;
  let configIdSeleccionado: string | null = null;

  while (intentos < maxIntentos) {
    intentos += 1;

    const configFresh = await getPosSiiConfigForUI(ctx.company.id);
    if (!configFresh) {
      return {
        error:
          "La empresa no tiene configuración SII. Configúrala en /pos/sii antes de emitir DTE.",
      };
    }
    configIdSeleccionado = configFresh.id;

    // Entorno SII configurable desde la BD (UI de configuración) con fallback a variable de entorno.
    const environment = detectarSiiEnvironment(configFresh.siiEnvironment);

    const caf = configFresh.cafs?.find(
      (c) => c.tipoDte === tipoDte && c.folioActual < c.folioFinal,
    );
    if (!caf) {
      return {
        error: `No hay CAF disponible con folios para DTE tipo ${tipoDte}. Carga un CAF en /pos/sii.`,
      };
    }
    cafSeleccionado = caf;
    if (
      caf.vigenteHasta &&
      new Date(caf.vigenteHasta) < new Date()
    ) {
      return {
        error: `El CAF tipo ${tipoDte} está vencido (${new Date(caf.vigenteHasta).toLocaleDateString("es-CL")}). Carga un CAF nuevo.`,
      };
    }

    folioUsado = caf.folioActual + 1;

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
      folio: folioUsado,
      fecha: sale.createdAt.toISOString().slice(0, 10),
      hora: sale.createdAt.toISOString().slice(11, 19),
      rutEmisor: ctx.company.rut ?? "",
      razonSocialEmisor: ctx.company.name,
      giroEmisor: ctx.company.giro ?? null,
      actecoEmisor: configFresh.acteco ?? null,
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
    let firmado;
    try {
      firmado = firmarDte(xmlDte, configFresh.certificadoPfx!, undefined);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return { error: `No se pudo firmar el DTE: ${message}` };
    }

    // Enviar al SII.
    try {
      envio = await enviarDteSii(
        firmado.signedXml,
        environment,
        ctx.company.rut ?? undefined,
      );
      xmlFirmadoGuardado = firmado.signedXml;
      break; // Éxito (o error de SII), salir del bucle
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (intentos >= maxIntentos) {
        // Guardar el DTE como ERROR_ENVIO para no perder el intento.
        await guardarPosDte(
          ctx,
          {
            configId: configFresh.id,
            tipoDte,
            folio: folioUsado,
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
      // Reintentar con un nuevo folio en caso de conflicto de red.
      continue;
    }
  }

  if (!envio) return { error: "No se pudo procesar el envío del DTE." };

  // Guardar el PosDte con el resultado del SII.
  await guardarPosDte(
    ctx,
    {
      configId: configIdSeleccionado!,
      tipoDte,
      folio: folioUsado,
      estado: envio.aceptado ? "EMITIDO" : "RECHAZADO",
      trackId: envio.trackId,
      xmlEnviado: xmlFirmadoGuardado,
      xmlRespuesta: envio.respuestaXml,
      pdfPath: null,
      saleId: sale.id,
    },
  );

  // Incrementar folioActual del CAF solo si el SII aceptó el documento.
  // Usamos actualización condicional para evitar condiciones de carrera:
  // solo incrementamos si folioActual todavía es folioUsado - 1.
  if (envio.aceptado && envio.trackId && cafSeleccionado) {
    const resultado = await db.posCaf.updateMany({
      where: {
        id: cafSeleccionado.id,
        folioActual: folioUsado - 1,
      },
      data: { folioActual: folioUsado },
    });
    if (resultado.count === 0) {
      // Otro proceso ya consumió este folio: registrar auditoría pero no fallar.
      await recordAudit(ctx, {
        action: "UPDATE",
        entityType: "PosCaf",
        entityId: cafSeleccionado.id,
        summary: `Conflicto de folio ${folioUsado} para DTE tipo ${tipoDte}: otro proceso ya consumió el folio.`,
      });
    }
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosDte",
    entityId: sale.id,
    summary: `Emitió DTE tipo ${tipoDte} folio ${folioUsado} para la venta ${sale.saleNumber} (TrackID: ${envio.trackId}).`,
  });

  revalidatePath("/pos/ventas");
  revalidatePath(`/pos/ventas/${saleId}`);
  revalidatePath("/pos/sii");

  return {
    ok: envio.aceptado,
    trackId: envio.trackId,
    dteFolio: folioUsado,
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

/**
 * Reenvía en lote todos los DTE de la empresa que queden en estado
 * ERROR_ENVIO o RECHAZADO. Devuelve cuántos se reintentaron y cuántos
 * tuvieron éxito.
 *
 * Se usa desde la pantalla de Configuración SII para recuperar documentos
 * que no se pudieron emitir por problemas de red o certificado.
 */
export async function reintentarDtesEnErrorAction(
  _prev: { error?: string; ok?: boolean; reintentados?: number; exitosos?: number } | undefined,
  _formData: FormData,
): Promise<{
  error?: string;
  ok?: boolean;
  reintentados?: number;
  exitosos?: number;
} | undefined> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el SII." };
  }

  const dtesEnError = await db.posDte.findMany({
    where: {
      companyId: ctx.company.id,
      estado: { in: ["ERROR_ENVIO", "RECHAZADO"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (dtesEnError.length === 0) {
    return {
      ok: true,
      reintentados: 0,
      exitosos: 0,
    };
  }

  let reintentados = 0;
  let exitosos = 0;
  const errores: string[] = [];

  for (const dte of dtesEnError) {
    const saleId = dte.saleId;
    if (!saleId) continue;
    reintentados += 1;
    try {
      const resultado = await reintentarDtePosSale(saleId);
      if (resultado?.ok) {
        exitosos += 1;
      } else {
        errores.push(`Venta ${saleId}: ${resultado?.error ?? "error desconocido"}`);
      }
    } catch (cause) {
      errores.push(
        `Venta ${saleId}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }

  const mensaje =
    errores.length > 0
      ? `${exitosos} de ${reintentados} reenviados con éxito. ${errores.length} fallaron.`
      : `${exitosos} de ${reintentados} reenviados con éxito.`;

  return {
    ok: errores.length === 0,
    reintentados,
    exitosos,
    error: errores.length > 0 ? mensaje : undefined,
  };
}

/**
 * Consulta el estado de un DTE en el SII por su TrackID.
 *
 * Útil para verificar manualmente el estado de un DTE que quedó en
 * estado EN_PROCESO o para confirmar que un DTE enviado fue aceptado.
 */
export async function consultarEstadoDteAction(
  _prev: { error?: string; ok?: boolean; estado?: string; detalle?: string } | undefined,
  formData: FormData,
): Promise<{
  error?: string;
  ok?: boolean;
  estado?: string;
  detalle?: string;
  trackId?: string;
} | undefined> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el SII." };
  }

  const trackId = String(formData.get("trackId") ?? "").trim();
  if (!trackId) {
    return { error: "Falta el TrackID para consultar." };
  }

  const dte = await db.posDte.findFirst({
    where: {
      companyId: ctx.company.id,
      trackId,
    },
  });
  if (!dte) {
    return { error: `No se encontró un DTE con TrackID ${trackId}.` };
  }

  const config = await getPosSiiConfigForUI(ctx.company.id);
  const environment = detectarSiiEnvironment(config?.siiEnvironment ?? null);
  try {
    const estadoSii = await consultarEstadoDteSii(trackId, environment);

    // Actualizar el estado local si el SII reporta un cambio definitivo.
    let nuevoEstado = dte.estado;
    if (/EMITIDO|ACEPTADO/i.test(estadoSii.estado)) {
      nuevoEstado = "EMITIDO";
    } else if (/RECHAZADO/i.test(estadoSii.estado)) {
      nuevoEstado = "RECHAZADO";
    }

    if (nuevoEstado !== dte.estado) {
      await db.posDte.update({
        where: { id: dte.id },
        data: {
          estado: nuevoEstado,
          xmlRespuesta: estadoSii.detalle,
          emitidoAt:
            nuevoEstado === "EMITIDO" && !dte.emitidoAt
              ? new Date()
              : dte.emitidoAt,
        },
      });
    }

    return {
      ok: true,
      estado: nuevoEstado,
      detalle: estadoSii.detalle,
      trackId,
    };
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? `Error consultando el SII: ${cause.message}`
          : "Error desconocido consultando el estado del DTE.",
    };
  }
}

/**
 * Anula un DTE emitido creando una nota de crédito (tipo 61) preparada.
 *
 * Cuando se anula una venta POS que ya tiene un DTE EMITIDO, se crea un
 * registro PosDte de tipo 61 con estado PENDIENTE_ENVIO, vinculado a la
 * venta original. El envío real al SII se puede hacer después cuando se
 * disponga del certificado.
 *
 * Esto permite que la anulación quede registrada fiscalmente aunque el
 * envío al SII se diferiera.
 */
export async function anularDtePosSale(
  saleId: string,
  motivo: string,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el SII." };
  }

  const sale = await getPosSale(ctx.company.id, saleId);
  if (!sale) return { error: "La venta POS no existe." };

  const dteExistente = await db.posDte.findFirst({
    where: {
      saleId: sale.id,
      companyId: ctx.company.id,
      estado: "EMITIDO",
    },
  });

  if (!dteExistente) {
    return {
      error: "La venta no tiene un DTE emitido para anular.",
    };
  }

  // Verificar que no exista ya una nota de crédito para esta venta.
  const ncExistente = await db.posDte.findFirst({
    where: {
      saleId: sale.id,
      companyId: ctx.company.id,
      tipoDte: 61,
    },
  });
  if (ncExistente) {
    return {
      error: "Ya existe una nota de crédito para esta venta.",
    };
  }

  // Buscar un CAF disponible para tipo 61 (nota de crédito).
  const configNc = await getPosSiiConfigForUI(ctx.company.id);
  if (!configNc) {
    return { error: "No hay configuración SII para la empresa." };
  }
  const caf = configNc.cafs?.find(
    (c) => c.tipoDte === 61 && c.folioActual < c.folioFinal,
  );
  if (!caf) {
    return {
      error: "No hay CAF disponible para nota de crédito (tipo 61). Carga un CAF en /pos/sii.",
    };
  }

  const folio = caf.folioActual + 1;

  // Crear la nota de crédito como PosDte pendiente de envío.
  await db.posDte.create({
    data: {
      companyId: ctx.company.id,
      configId: configNc.id,
      tipoDte: 61,
      folio,
      estado: "PENDIENTE_ENVIO",
      trackId: null,
      xmlEnviado: null,
      xmlRespuesta: `Nota de crédito preparada para anular DTE tipo ${dteExistente.tipoDte} folio ${dteExistente.folio}. Motivo: ${motivo}.`,
      pdfPath: null,
      saleId: sale.id,
      emitidoAt: null,
      anuladoAt: null,
    },
  });

  // Incrementar folioActual del CAF para tipo 61.
  await db.posCaf.update({
    where: { id: caf.id },
    data: { folioActual: folio },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosDte",
    entityId: sale.id,
    summary: `Preparó nota de crédito tipo 61 folio ${folio} para anular DTE folio ${dteExistente.folio} de la venta ${sale.saleNumber}. Motivo: ${motivo}.`,
  });

  revalidatePath("/pos/ventas");
  revalidatePath(`/pos/ventas/${saleId}`);
  revalidatePath("/pos/sii");

  return { ok: true };
}
