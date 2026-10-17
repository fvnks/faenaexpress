"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { PartnerType } from "@/generated/prisma/client";
import { canWrite, requireContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { dteDate, parseDteXml, type DteDocumento, type DteEstado } from "@/lib/dte";
import { readUploadedXml } from "@/lib/dte-upload";
import {
  createPurchaseItems,
  createSaleItems,
  loadProductIndex,
  prepareDocItems,
} from "@/lib/doc-items";
import { syncPurchaseItemsToInventory, syncSaleItemsToInventory } from "@/lib/inventory-sync";
import { getAvailableStock } from "@/lib/inventory-stock-check";
import { dteMotivoOmision, dteTipoLabel } from "@/lib/labels";
import { ensurePartnerRole, fillPartnerContact } from "@/lib/partners";
import { formatRut, normalizeRut } from "@/lib/rut";

export type DtePreviewRow = {
  tipoDTE: number;
  folio: string;
  fecha: string;
  vencimiento: string | null;
  formaPago: string | null;
  terminoPago: string | null;
  rut: string;
  cliente: string;
  giro: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  neto: number;
  exento: number;
  iva: number;
  ivaRecargo: number;
  total: number;
  tasaIVA: number | null;
  descripcion: string | null;
  ordenCompra: string | null;
  guiaDespacho: string | null;
  hesNumber: string | null;
  facturaOriginal: string | null;
  tipoDocRefOriginal: string | null;
  fechaRecepcion: string | null;
  estadoReceptor: string | null;
  montoExe: number;
  estado: DteEstado;
  mensaje: string | null;
  // De qué archivo salió el documento: así cada factura guarda SU XML, no el
  // del lote completo.
  fileIndex: number;
  existingSaleId?: string | null;
};

export type DteImportState = {
  error?: string;
  fileName?: string;
  // Un XML por archivo subido (o por XML dentro del ZIP): cada documento guarda
  // el suyo, no el del lote.
  xmlFiles?: string[];
  resumen?: { nuevas: number; actualizar: number; duplicadas: number; omitidas: number; conError: number };
  rows?: DtePreviewRow[];
} | undefined;

export type DteConfirmState = {
  error?: string;
  ok?: boolean;
  imported?: number;
  updated?: number;
  errores?: string[];
} | undefined;

const MAX_DOCUMENTOS = 500;

/** Analiza el XML y arma la vista previa con el estado de cada documento. */
export async function previewDteImport(_prev: DteImportState, formData: FormData): Promise<DteImportState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    return { error: "No tienes permiso para importar datos." };
  }

  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return { error: "Selecciona uno o más archivos .xml, o el ZIP del respaldo del SII." };
  }

  const subidos = await readUploadedXml(files);
  if (subidos.error) return { error: subidos.error };

  // Aplana todos los XML en documentos, recordando de qué archivo salió cada uno
  // para guardar SU XML (no el del lote entero).
  const documentos: { doc: DteDocumento; fileIndex: number }[] = [];
  const avisos: string[] = [];
  for (const [fileIndex, entry] of subidos.xmls.entries()) {
    const parsed = parseDteXml(entry.xml);
    if (parsed.error) {
      avisos.push(`${entry.name}: ${parsed.error}`);
      continue;
    }
    for (const doc of parsed.documentos) {
      if (documentos.length >= MAX_DOCUMENTOS) break;
      documentos.push({ doc, fileIndex });
    }
  }
  if (documentos.length === 0) {
    return {
      error: avisos[0] ?? "No se encontraron documentos DTE en los archivos.",
      fileName: subidos.xmls[0]?.name,
    };
  }

  // Folios ya registrados en la empresa activa (facturas y notas comparten folio).
  const folios = documentos.map(({ doc }) => doc.folio);
  const existentes = await db.sale.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: {
      id: true,
      documentNumber: true,
      xmlContent: true,
      date: true,
      status: true,
      partner: { select: { name: true, rut: true } },
    },
  });
  const existentesPorFolio = new Map(existentes.map((row) => [row.documentNumber, row]));

  const rutEmpresa = ctx.company.rut ? normalizeRut(ctx.company.rut) : null;

  // RUT de trabajadores: si el receptor del DTE es un trabajador, el documento
  // no se importa (los trabajadores no se registran como clientes).
  const rutsReceptores = documentos
    .map(({ doc }) => doc.rutReceptor)
    .filter((rut) => rut && /^\d{6,8}[0-9K]$/i.test(normalizeRut(rut)))
    .map((rut) => normalizeRut(rut));
  const trabajadoresConRut = rutsReceptores.length
    ? await db.worker.findMany({
        where: { companyId: ctx.company.id, rut: { not: null } },
        select: { rut: true },
      })
    : [];
  const rutsTrabajadores = new Set(trabajadoresConRut.map((worker) => normalizeRut(worker.rut!)));

  const rows: DtePreviewRow[] = documentos.map(({ doc, fileIndex }) => {
    const motivo = dteMotivoOmision(doc.tipoDTE);
    if (motivo) {
      return { ...rowBase(doc, fileIndex), estado: "omitida", mensaje: motivo };
    }
    if (doc.rutReceptor && rutsTrabajadores.has(normalizeRut(doc.rutReceptor))) {
      return {
        ...rowBase(doc, fileIndex),
        estado: "error",
        mensaje: `El receptor ${doc.rutReceptor} es un trabajador de RRHH; los trabajadores no se registran como clientes.`,
      };
    }
    const ventaExistente = existentesPorFolio.get(doc.folio);
    if (ventaExistente) {
      const mismoCliente = Boolean(
        ventaExistente?.partner.rut &&
          normalizeRut(ventaExistente.partner.rut) === normalizeRut(doc.rutReceptor),
      );
      // Ya está en ventas sin XML: el archivo la completa en vez de descartarse.
      if (ventaExistente && mismoCliente && !ventaExistente.xmlContent) {
        return {
          ...rowBase(doc, fileIndex),
          estado: "actualizar",
          mensaje: "Ya está registrada: el XML le agrega el detalle y los datos que faltan.",
          existingSaleId: ventaExistente.id,
        };
      }
      const detalle = ventaExistente
        ? ` (${ventaExistente.partner.name}, ${new Date(ventaExistente.date).toLocaleDateString("es-CL")}, ${ventaExistente.status})`
        : "";
      return { ...rowBase(doc, fileIndex), estado: "duplicada", mensaje: `El folio ya está registrado en ventas.${detalle}`, existingSaleId: ventaExistente?.id };
    }
    if (rutEmpresa && normalizeRut(doc.rutEmisor) !== rutEmpresa) {
      return {
        ...rowBase(doc, fileIndex),
        estado: "error",
        mensaje: `El emisor ${doc.rutEmisor} no coincide con el RUT de ${ctx.company.name}.`,
      };
    }
    if (doc.total <= 0) {
      return { ...rowBase(doc, fileIndex), estado: "error", mensaje: "El total del documento es cero." };
    }
    return { ...rowBase(doc, fileIndex), estado: "nueva", mensaje: null };
  });

  const resumen = {
    nuevas: rows.filter((r) => r.estado === "nueva").length,
    actualizar: rows.filter((r) => r.estado === "actualizar").length,
    duplicadas: rows.filter((r) => r.estado === "duplicada").length,
    omitidas: rows.filter((r) => r.estado === "omitida").length,
    conError: rows.filter((r) => r.estado === "error").length,
  };

  return {
    fileName: subidos.xmls.length === 1 ? subidos.xmls[0].name : `${subidos.xmls.length} archivos`,
    xmlFiles: subidos.xmls.map((entry) => entry.xml),
    rows,
    resumen,
    error: avisos.length > 0 ? avisos.slice(0, 3).join(" · ") : undefined,
  };
}

function rowBase(doc: DteDocumento, fileIndex: number) {
  return {
    tipoDTE: doc.tipoDTE,
    folio: doc.folio,
    fecha: doc.fecha,
    vencimiento: doc.vencimiento,
    formaPago: doc.formaPago,
    terminoPago: doc.terminoPago,
    rut: doc.rutReceptor,
    cliente: doc.razonSocialReceptor,
    giro: doc.giroReceptor,
    direccion: doc.direccionReceptor,
    comuna: doc.comunaReceptor,
    ciudad: doc.ciudadReceptor,
    telefono: doc.telefonoReceptor,
    email: doc.emailReceptor,
    neto: doc.neto,
    exento: doc.exento,
    iva: doc.iva,
    ivaRecargo: doc.ivaRecargo,
    total: doc.total,
    tasaIVA: doc.tasaIVA,
    descripcion: doc.descripcion,
    itemsDetalle: doc.itemsDetalle ?? null,
    ordenCompra: doc.ordenCompra,
    guiaDespacho: doc.guiaDespacho,
    hesNumber: doc.hesNumber,
    facturaOriginal: doc.facturaOriginal,
    tipoDocRefOriginal: doc.tipoDocRefOriginal,
    fechaRecepcion: doc.fechaRecepcion,
    estadoReceptor: doc.estadoReceptor,
    montoExe: doc.montoExe,
    fileIndex,
  };
}

type PayloadDoc = {
  tipoDTE: number;
  folio: string;
  fecha: string;
  vencimiento: string | null;
  formaPago: string | null;
  terminoPago: string | null;
  rut: string;
  cliente: string;
  giro: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  neto: number;
  exento: number;
  iva: number;
  ivaRecargo: number;
  total: number;
  tasaIVA: number | null;
  descripcion: string | null;
  itemsDetalle: { nombre: string; cantidad: string; precio: number; monto: number }[] | null;
  ordenCompra: string | null;
  guiaDespacho: string | null;
  hesNumber: string | null;
  facturaOriginal: string | null;
  tipoDocRefOriginal: string | null;
  fechaRecepcion: string | null;
  estadoReceptor: string | null;
  montoExe: number;
  fileIndex: number;
  estado: "nueva" | "actualizar";
};

/**
 * Proyección para COMPRAS: el tercero es el EMISOR del XML (el proveedor).
 * `rowBase` proyecta el RECEPTOR, que en una factura de compra es la propia
 * empresa — usarla tal cual daría la empresa como proveedor de sí misma.
 */
function rowBasePurchase(doc: DteDocumento, fileIndex: number) {
  return {
    ...rowBase(doc, fileIndex),
    rut: doc.rutEmisor,
    cliente: doc.razonSocialEmisor,
    giro: doc.giroEmisor,
    direccion: doc.direccionEmisor,
    comuna: doc.comunaEmisor,
    ciudad: doc.ciudadEmisor,
    telefono: doc.telefonoEmisor,
    email: doc.emailEmisor,
  };
}

/** Crea las ventas marcadas como nuevas en la vista previa. */
export async function confirmDteImport(_prev: DteConfirmState, formData: FormData): Promise<DteConfirmState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    return { error: "No tienes permiso para importar datos." };
  }

  const raw = String(formData.get("payload") ?? "");
  let documentos: PayloadDoc[];
  try {
    documentos = JSON.parse(raw) as PayloadDoc[];
  } catch {
    return { error: "La vista previa ya no es válida. Analiza el XML nuevamente." };
  }
  if (!Array.isArray(documentos) || documentos.length === 0) {
    return { error: "No hay documentos nuevos para importar." };
  }
  if (documentos.length > MAX_DOCUMENTOS) {
    return { error: `Máximo ${MAX_DOCUMENTOS} documentos por archivo.` };
  }

  // Revalida en el servidor: la acción es alcanzable por POST directo.
  const folios = documentos.map((doc) => String(doc.folio ?? ""));
  const existentes = await db.sale.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: {
      id: true,
      documentNumber: true,
      xmlContent: true,
      partner: { select: { rut: true } },
      _count: { select: { items: true } },
    },
  });
  const existentesPorFolio = new Map(existentes.map((row) => [row.documentNumber, row]));

  // XML por archivo subido: cada documento guarda el suyo.
  let xmlFiles: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("xmlFiles") ?? "[]"));
    if (Array.isArray(parsed)) xmlFiles = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    xmlFiles = [];
  }
  const xmlDe = (index: number): string | null => xmlFiles[index] ?? null;

  // RUT de trabajadores: no se crean como clientes (guarda igual que la vista previa).
  const trabajadoresConRut = await db.worker.findMany({
    where: { companyId: ctx.company.id, rut: { not: null } },
    select: { rut: true },
  });
  const rutsTrabajadores = new Set(trabajadoresConRut.map((worker) => normalizeRut(worker.rut!)));

  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: {
      id: true,
      name: true,
      rut: true,
      type: true,
      address: true,
      commune: true,
      city: true,
      phone: true,
      email: true,
      giro: true,
      salespersonId: true,
    },
  });
  type PartnerInfo = {
    id: string;
    type: PartnerType;
    address: string | null;
    commune: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    giro: string | null;
    salespersonId: string | null;
  };
  const partnerPorRut = new Map<string, PartnerInfo>();
  const partnerPorNombre = new Map<string, PartnerInfo>();
  for (const partner of partners) {
    const info: PartnerInfo = {
      id: partner.id,
      type: partner.type,
      address: partner.address,
      commune: partner.commune,
      city: partner.city,
      phone: partner.phone,
      email: partner.email,
      giro: partner.giro,
      salespersonId: partner.salespersonId,
    };
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), info);
    partnerPorNombre.set(partner.name.trim().toLowerCase(), info);
  }

  const errores: string[] = [];
  let imported = 0;
  let updated = 0;
  const foliosCreados = new Set<string>();
  // Una sola consulta para vincular los ítems de todos los documentos.
  const indiceProductos = await loadProductIndex(ctx.company.id);

  for (const doc of documentos) {
    const folio = String(doc.folio ?? "").trim();
    try {
      const existente = existentesPorFolio.get(folio);

      // El documento ya está en ventas (vino por RCV o a mano): el XML lo
      // completa en vez de descartarse.
      if (doc.estado === "actualizar") {
        if (!existente) {
          errores.push(`Folio ${folio}: ya no está en ventas; vuelve a analizar el XML.`);
          continue;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(doc.fecha ?? ""))) {
          errores.push(`Folio ${folio}: fecha inválida.`);
          continue;
        }

        const fechaDoc = dteDate(String(doc.fecha));
        const items = prepareDocItems(indiceProductos, doc.itemsDetalle);
        await db.sale.update({
          where: { id: existente.id },
          data: {
            xmlContent: xmlDe(doc.fileIndex) ?? existente.xmlContent,
            date: fechaDoc,
            dueDate:
              doc.vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.vencimiento))
                ? dteDate(String(doc.vencimiento))
                : undefined,
            purchaseOrder: doc.ordenCompra ? String(doc.ordenCompra).slice(0, 80) : undefined,
            dispatchGuide: doc.guiaDespacho ? String(doc.guiaDespacho).slice(0, 80) : undefined,
            hesNumber: doc.hesNumber ? String(doc.hesNumber).slice(0, 80) : undefined,
            facturaOriginal: doc.facturaOriginal ? String(doc.facturaOriginal).slice(0, 60) : undefined,
            tipoDocRefOriginal: doc.tipoDocRefOriginal ? String(doc.tipoDocRefOriginal).slice(0, 10) : undefined,
            fechaRecepcion:
              doc.fechaRecepcion && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fechaRecepcion))
                ? dteDate(String(doc.fechaRecepcion))
                : undefined,
            estadoReceptor: doc.estadoReceptor ? String(doc.estadoReceptor).slice(0, 30) : undefined,
            description: doc.descripcion ? String(doc.descripcion).slice(0, 200) : undefined,
            formaPago: doc.formaPago ? String(doc.formaPago).slice(0, 60) : undefined,
          },
        });

        if (existente._count.items === 0 && items.length > 0) {
          await createSaleItems(existente.id, ctx.company.id, items);
          const sync = await syncSaleItemsToInventory({
            companyId: ctx.company.id,
            saleId: existente.id,
            date: fechaDoc,
            createdById: ctx.user.id,
          });
          if (!sync.ok) {
            errores.push(`Folio ${folio}: XML guardado, pero el stock no se actualizó (${sync.errors.join("; ")}).`);
          }
        }
        updated += 1;
        continue;
      }

      if (existente || foliosCreados.has(folio)) {
        errores.push(`Folio ${folio}: ya estaba registrado.`);
        continue;
      }
      const rutDoc = String(doc.rut ?? "").trim();
      if (rutDoc && rutsTrabajadores.has(normalizeRut(rutDoc))) {
        errores.push(`Folio ${folio}: el receptor es un trabajador de RRHH; no se registra como cliente.`);
        continue;
      }
      if (![33, 34, 56].includes(Number(doc.tipoDTE))) {
        errores.push(`Folio ${folio}: tipo de documento no soportado.`);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(doc.fecha ?? ""))) {
        errores.push(`Folio ${folio}: fecha inválida.`);
        continue;
      }

      // Resuelve el cliente por RUT, luego por nombre; si no existe, lo crea.
      const rut = String(doc.rut ?? "").trim();
      const cliente = String(doc.cliente ?? "").trim() || "(sin razón social)";
      const rutNormalizado = rut ? normalizeRut(rut) : "";
      let partner = rutNormalizado ? partnerPorRut.get(rutNormalizado) : undefined;
      if (!partner) partner = partnerPorNombre.get(cliente.toLowerCase());

      // Datos de contacto del XML: viven en el cliente, no en la venta.
      const contacto = {
        address: doc.direccion ? String(doc.direccion).slice(0, 200) : null,
        commune: doc.comuna ? String(doc.comuna).slice(0, 120) : null,
        city: doc.ciudad ? String(doc.ciudad).slice(0, 120) : null,
        phone: doc.telefono ? String(doc.telefono).slice(0, 60) : null,
        email: doc.email ? String(doc.email).slice(0, 200) : null,
        giro: doc.giro ? String(doc.giro).slice(0, 200) : null,
      };

      if (!partner) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: "CUSTOMER",
            name: cliente,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
            ...contacto,
          },
        });
        partner = { id: creado.id, type: "CUSTOMER", salespersonId: null, ...contacto };
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, partner);
        partnerPorNombre.set(cliente.toLowerCase(), partner);
      } else {
        // Un tercero que solo era proveedor pasa a BOTH: esta venta lo usa como cliente.
        await ensurePartnerRole(partner, "CUSTOMER");
        await fillPartnerContact(partner, contacto);
      }
      const partnerId = partner.id;

      const fecha = dteDate(String(doc.fecha));
      const venc = doc.vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.vencimiento)) ? dteDate(String(doc.vencimiento)) : null;

      const fechaRecepcion = doc.fechaRecepcion && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fechaRecepcion)) ? dteDate(String(doc.fechaRecepcion)) : null;

      const proposedSaleItems = prepareDocItems(indiceProductos, doc.itemsDetalle);
      const saleProductIds = [...new Set(proposedSaleItems.map((item) => item.productId).filter((id): id is string => Boolean(id)))];
      const stockShortages: string[] = [];
      for (const productId of saleProductIds) {
        const availability = await getAvailableStock(ctx.company.id, productId);
        if (!availability.tracksStock) continue;
        const required = proposedSaleItems.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
        if (availability.quantity < required) {
          stockShortages.push(`${availability.productName ?? "Producto"}: disponible ${availability.quantity.toFixed(3)}, requerido ${required.toFixed(3)}`);
        }
      }
      if (stockShortages.length > 0) {
        errores.push(`Folio ${folio}: no se pudo importar por stock insuficiente (${stockShortages.join("; ")}).`);
        continue;
      }

      const sale = await db.sale.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          partnerId,
          documentType: Number(doc.tipoDTE) === 56 ? "DEBIT_NOTE" : "INVOICE",
          documentNumber: folio,
          salespersonId: partner.salespersonId ?? null,
          date: fecha,
          dueDate: venc,
          purchaseOrder: doc.ordenCompra ? String(doc.ordenCompra).slice(0, 80) : null,
          dispatchGuide: doc.guiaDespacho ? String(doc.guiaDespacho).slice(0, 80) : null,
          hesNumber: doc.hesNumber ? String(doc.hesNumber).slice(0, 80) : null,
          facturaOriginal: doc.facturaOriginal ? String(doc.facturaOriginal).slice(0, 60) : null,
          tipoDocRefOriginal: doc.tipoDocRefOriginal ? String(doc.tipoDocRefOriginal).slice(0, 10) : null,
          fechaRecepcion,
          estadoReceptor: doc.estadoReceptor ? String(doc.estadoReceptor).slice(0, 30) : null,
          description: doc.descripcion ? String(doc.descripcion).slice(0, 200) : null,
          xmlContent: xmlDe(doc.fileIndex),
          netAmount: Math.max(0, Math.round(Number(doc.neto) || 0)),
          ivaAmount: Math.max(0, Math.round(Number(doc.iva) || 0)),
          exento: Math.max(0, Math.round(Number(doc.exento) || 0)),
          ivaRecargo: Math.max(0, Math.round(Number(doc.ivaRecargo) || 0)),
          totalAmount: Math.max(0, Math.round(Number(doc.total) || 0)),
          tasaIVA: doc.tasaIVA ? Number(doc.tasaIVA) : null,
          notes: [doc.terminoPago, doc.formaPago ? `Forma pago: ${doc.formaPago}` : null, doc.estadoReceptor ? `Estado receptor: ${doc.estadoReceptor}` : null]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 500),
          status: "PENDING",
        },
      });

      await createSaleItems(
        sale.id,
        ctx.company.id,
        proposedSaleItems,
      );

      const saleSync = await syncSaleItemsToInventory({
        companyId: ctx.company.id,
        saleId: sale.id,
        date: fecha,
        createdById: ctx.user.id,
      });
      if (!saleSync.ok) {
        errores.push(`Folio ${folio}: stock no actualizado (${saleSync.errors.join("; ")}).`);
      }

      foliosCreados.add(folio);
      imported += 1;
    } catch {
      errores.push(`Folio ${folio}: no se pudo guardar (¿folio repetido por otro tipo de documento?).`);
    }
  }

  if (imported > 0 || updated > 0) {
    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "Sale",
      entityId: "import-xml",
      summary: `Importó ${imported} venta(s) y completó ${updated} desde XML DTE del SII.`,
    });
    revalidatePath("/dashboard/ventas");
    revalidatePath("/dashboard");
  }

  return { ok: true, imported, updated, errores: errores.length > 0 ? errores : undefined };
}

// ---------------------------------------------------------------------------
// Importación de XML DTE para COMPRAS (facturas de proveedores)
// ---------------------------------------------------------------------------

export type PurchaseXmlState = {
  error?: string;
  fileName?: string;
  xmlFiles?: string[];
  resumen?: { nuevas: number; actualizar: number; duplicadas: number; omitidas: number; conError: number };
  rows?: DtePreviewRow[];
} | undefined;

export type PurchaseXmlConfirmState = {
  error?: string;
  ok?: boolean;
  imported?: number;
  updated?: number;
  errores?: string[];
} | undefined;

type PurchaseXmlPayload = {
  tipoDTE: number;
  folio: string;
  fecha: string;
  vencimiento: string | null;
  formaPago: string | null;
  terminoPago: string | null;
  rut: string; // RUT del proveedor (emisor)
  cliente: string; // Razón social del proveedor
  giro: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  neto: number;
  exento: number;
  iva: number;
  ivaRecargo: number;
  total: number;
  tasaIVA: number | null;
  descripcion: string | null;
  itemsDetalle: { nombre: string; cantidad: string; precio: number; monto: number }[] | null;
  ordenCompra: string | null;
  guiaDespacho: string | null;
  hesNumber: string | null;
  facturaOriginal: string | null;
  tipoDocRefOriginal: string | null;
  fechaRecepcion: string | null;
  estadoReceptor: string | null;
  montoExe: number;
  fileIndex: number;
  estado: "nueva" | "actualizar";
};

/** Analiza un XML de proveedor y arma la vista previa para importar compras. */
export async function previewPurchaseXml(
  _prev: PurchaseXmlState,
  formData: FormData,
): Promise<PurchaseXmlState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    return { error: "No tienes permiso para importar datos." };
  }

  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return { error: "Selecciona uno o más archivos .xml, o el ZIP del respaldo del SII." };
  }

  const subidos = await readUploadedXml(files);
  if (subidos.error) return { error: subidos.error };

  const documentos: { doc: DteDocumento; fileIndex: number }[] = [];
  const avisos: string[] = [];
  for (const [fileIndex, entry] of subidos.xmls.entries()) {
    const parsed = parseDteXml(entry.xml);
    if (parsed.error) {
      avisos.push(`${entry.name}: ${parsed.error}`);
      continue;
    }
    for (const doc of parsed.documentos) {
      if (documentos.length >= MAX_DOCUMENTOS) break;
      documentos.push({ doc, fileIndex });
    }
  }
  if (documentos.length === 0) {
    return {
      error: avisos[0] ?? "No se encontraron documentos DTE en los archivos.",
      fileName: subidos.xmls[0]?.name,
    };
  }

  // Folios ya registrados en compras, con su proveedor para saber si el XML
  // corresponde al mismo tercero.
  const folios = documentos.map(({ doc }) => doc.folio);
  const existentes = await db.purchase.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: {
      id: true,
      documentNumber: true,
      xmlContent: true,
      partner: { select: { rut: true } },
      _count: { select: { items: true } },
    },
  });
  const existentesPorFolio = new Map(existentes.map((row) => [row.documentNumber, row]));

  const rutEmpresa = ctx.company.rut ? normalizeRut(ctx.company.rut) : null;

  const rows: DtePreviewRow[] = documentos.map(({ doc, fileIndex }) => {
    const motivo = dteMotivoOmision(doc.tipoDTE);
    if (motivo) {
      return { ...rowBasePurchase(doc, fileIndex), estado: "omitida" as const, mensaje: motivo };
    }
    const compraExistente = existentesPorFolio.get(doc.folio);
    if (compraExistente) {
      const mismoProveedor = Boolean(
        compraExistente.partner.rut &&
          normalizeRut(compraExistente.partner.rut) === normalizeRut(doc.rutEmisor),
      );
      // Ya está en compras sin XML: el archivo la completa en vez de descartarse.
      if (mismoProveedor && !compraExistente.xmlContent) {
        return {
          ...rowBasePurchase(doc, fileIndex),
          estado: "actualizar" as const,
          mensaje: "Ya está registrada: el XML le agrega el detalle y los datos que faltan.",
          existingSaleId: compraExistente.id,
        };
      }
      return { ...rowBasePurchase(doc, fileIndex), estado: "duplicada" as const, mensaje: "El folio ya está registrado en compras." };
    }
    // En compras, el RECEPTOR debe ser la empresa activa.
    if (rutEmpresa && normalizeRut(doc.rutReceptor) !== rutEmpresa) {
      return {
        ...rowBasePurchase(doc, fileIndex),
        estado: "error" as const,
        mensaje: `El receptor ${doc.rutReceptor} no coincide con el RUT de ${ctx.company.name}.`,
      };
    }
    if (doc.total <= 0) {
      return { ...rowBasePurchase(doc, fileIndex), estado: "error" as const, mensaje: "El total del documento es cero." };
    }
    if (!doc.rutEmisor || !doc.razonSocialEmisor) {
      return { ...rowBasePurchase(doc, fileIndex), estado: "error" as const, mensaje: "El XML no trae los datos del proveedor (emisor)." };
    }
    return { ...rowBasePurchase(doc, fileIndex), estado: "nueva" as const, mensaje: null };
  });

  const resumen = {
    nuevas: rows.filter((r) => r.estado === "nueva").length,
    actualizar: rows.filter((r) => r.estado === "actualizar").length,
    duplicadas: rows.filter((r) => r.estado === "duplicada").length,
    omitidas: rows.filter((r) => r.estado === "omitida").length,
    conError: rows.filter((r) => r.estado === "error").length,
  };

  return {
    fileName: subidos.xmls.length === 1 ? subidos.xmls[0].name : `${subidos.xmls.length} archivos`,
    xmlFiles: subidos.xmls.map((entry) => entry.xml),
    rows,
    resumen,
    error: avisos.length > 0 ? avisos.slice(0, 3).join(" · ") : undefined,
  };
}

/** Crea las compras marcadas como nuevas desde un XML de proveedor. */
export async function confirmPurchaseXml(
  _prev: PurchaseXmlConfirmState,
  formData: FormData,
): Promise<PurchaseXmlConfirmState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    return { error: "No tienes permiso para importar datos." };
  }

  let documentos: PurchaseXmlPayload[];
  try {
    documentos = JSON.parse(String(formData.get("payload") ?? "")) as PurchaseXmlPayload[];
  } catch {
    return { error: "La vista previa ya no es válida. Analiza el XML nuevamente." };
  }
  if (!Array.isArray(documentos) || documentos.length === 0) {
    return { error: "No hay documentos nuevos para importar." };
  }

  // XML por archivo subido: cada documento guarda el suyo.
  let xmlFiles: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("xmlFiles") ?? "[]"));
    if (Array.isArray(parsed)) xmlFiles = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    xmlFiles = [];
  }
  const xmlDe = (index: number): string | null => xmlFiles[index] ?? null;

  // Revalidar duplicados: se necesita el proveedor y los ítems para saber si el
  // XML completa un documento existente o es un folio repetido.
  const folios = documentos.map((doc) => String(doc.folio ?? "")).filter(Boolean);
  const existentes = await db.purchase.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: {
      id: true,
      documentNumber: true,
      xmlContent: true,
      partner: { select: { rut: true } },
      _count: { select: { items: true } },
    },
  });
  const existentesPorFolio = new Map(existentes.map((row) => [row.documentNumber, row]));

  // Proveedores: buscar o crear por RUT. El tipo y los datos de contacto se
  // completan con lo que traiga el XML.
  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: {
      id: true,
      name: true,
      rut: true,
      type: true,
      address: true,
      commune: true,
      city: true,
      phone: true,
      email: true,
      giro: true,
    },
  });
  type SupplierInfo = {
    id: string;
    type: PartnerType;
    address: string | null;
    commune: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    giro: string | null;
  };
  const partnerPorRut = new Map<string, SupplierInfo>();
  const partnerPorNombre = new Map<string, SupplierInfo>();
  for (const partner of partners) {
    const info: SupplierInfo = {
      id: partner.id,
      type: partner.type,
      address: partner.address,
      commune: partner.commune,
      city: partner.city,
      phone: partner.phone,
      email: partner.email,
      giro: partner.giro,
    };
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), info);
    partnerPorNombre.set(partner.name.trim().toLowerCase(), info);
  }

  const errores: string[] = [];
  let imported = 0;
  let updated = 0;
  const foliosCreados = new Set<string>();
  // Una sola consulta para vincular los ítems de todos los documentos.
  const indiceProductos = await loadProductIndex(ctx.company.id);

  for (const doc of documentos) {
    const folio = String(doc.folio ?? "").trim();
    try {
      const existente = existentesPorFolio.get(folio);

      // Factura ya registrada (por RCV o a mano): el XML la completa con el
      // proveedor, los montos finos, los ítems y el XML original.
      if (doc.estado === "actualizar") {
        if (!existente) {
          errores.push(`Folio ${folio}: ya no está en compras; vuelve a analizar el XML.`);
          continue;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(doc.fecha ?? ""))) {
          errores.push(`Folio ${folio}: fecha inválida.`);
          continue;
        }

        const fechaDoc = dteDate(String(doc.fecha));
        const vencDoc =
          doc.vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.vencimiento))
            ? dteDate(String(doc.vencimiento))
            : undefined;
        const items = prepareDocItems(indiceProductos, doc.itemsDetalle);

        await db.purchase.update({
          where: { id: existente.id },
          data: {
            xmlContent: xmlDe(doc.fileIndex) ?? existente.xmlContent,
            date: fechaDoc,
            dueDate: vencDoc,
            purchaseOrder: doc.ordenCompra ? String(doc.ordenCompra).slice(0, 80) : undefined,
            dispatchGuide: doc.guiaDespacho ? String(doc.guiaDespacho).slice(0, 80) : undefined,
            hesNumber: doc.hesNumber ? String(doc.hesNumber).slice(0, 80) : undefined,
            facturaOriginal: doc.facturaOriginal ? String(doc.facturaOriginal).slice(0, 60) : undefined,
            tipoDocRefOriginal: doc.tipoDocRefOriginal ? String(doc.tipoDocRefOriginal).slice(0, 10) : undefined,
            fechaRecepcion:
              doc.fechaRecepcion && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fechaRecepcion))
                ? dteDate(String(doc.fechaRecepcion))
                : undefined,
            estadoReceptor: doc.estadoReceptor ? String(doc.estadoReceptor).slice(0, 30) : undefined,
            description: doc.descripcion ? String(doc.descripcion).slice(0, 200) : undefined,
            formaPago: doc.formaPago ? String(doc.formaPago).slice(0, 60) : undefined,
            netAmount: Math.max(0, Math.round(Number(doc.neto) || 0)),
            ivaAmount: Math.max(0, Math.round(Number(doc.iva) || 0)),
            exento: Math.max(0, Math.round(Number(doc.exento) || 0)),
            ivaRecargo: Math.max(0, Math.round(Number(doc.ivaRecargo) || 0)),
            totalAmount: Math.max(0, Math.round(Number(doc.total) || 0)),
            tasaIVA: doc.tasaIVA ? Number(doc.tasaIVA) : undefined,
          },
        });

        if (existente._count.items === 0 && items.length > 0) {
          await createPurchaseItems(existente.id, ctx.company.id, items);
          const sync = await syncPurchaseItemsToInventory({
            companyId: ctx.company.id,
            purchaseId: existente.id,
            date: fechaDoc,
            createdById: ctx.user.id,
          });
          if (!sync.ok) {
            errores.push(`Folio ${folio}: XML guardado, pero el stock no se actualizó (${sync.errors.join("; ")}).`);
          }
        }
        updated += 1;
        continue;
      }

      if (existente || foliosCreados.has(folio)) {
        errores.push(`Folio ${folio}: ya estaba registrado.`);
        continue;
      }
      if (![33, 34, 56].includes(Number(doc.tipoDTE))) {
        errores.push(`Folio ${folio}: tipo no soportado.`);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(doc.fecha ?? ""))) {
        errores.push(`Folio ${folio}: fecha inválida.`);
        continue;
      }

      // Proveedor: el EMISOR del XML.
      const rut = String(doc.rut ?? "").trim();
      const nombre = String(doc.cliente ?? "").trim() || "(sin razón social)";
      const rutNormalizado = rut ? normalizeRut(rut) : "";
      const contacto = {
        address: doc.direccion ? String(doc.direccion).slice(0, 200) : null,
        commune: doc.comuna ? String(doc.comuna).slice(0, 120) : null,
        city: doc.ciudad ? String(doc.ciudad).slice(0, 120) : null,
        phone: doc.telefono ? String(doc.telefono).slice(0, 60) : null,
        email: doc.email ? String(doc.email).slice(0, 200) : null,
        giro: doc.giro ? String(doc.giro).slice(0, 200) : null,
      };

      let partner = rutNormalizado ? partnerPorRut.get(rutNormalizado) : undefined;
      if (!partner) partner = partnerPorNombre.get(nombre.toLowerCase());
      if (!partner) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: "SUPPLIER",
            name: nombre,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
            ...contacto,
          },
        });
        partner = { id: creado.id, type: "SUPPLIER", ...contacto };
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, partner);
        partnerPorNombre.set(nombre.toLowerCase(), partner);
      } else {
        // Un tercero que solo era cliente pasa a BOTH: esta compra lo usa como proveedor.
        await ensurePartnerRole(partner, "SUPPLIER");
        await fillPartnerContact(partner, contacto);
      }
      const partnerId = partner.id;

      const fecha = new Date(`${String(doc.fecha)}T00:00:00.000Z`);
      const venc = doc.vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.vencimiento))
        ? new Date(`${String(doc.vencimiento)}T00:00:00.000Z`)
        : null;

      const fechaRecepcion = doc.fechaRecepcion && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fechaRecepcion)) ? dteDate(String(doc.fechaRecepcion)) : null;

      const purchase = await db.purchase.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          partnerId,
          documentType: Number(doc.tipoDTE) === 56 ? "DEBIT_NOTE" : "INVOICE",
          documentNumber: folio,
          date: fecha,
          dueDate: venc,
          purchaseOrder: doc.ordenCompra ? String(doc.ordenCompra).slice(0, 80) : null,
          dispatchGuide: doc.guiaDespacho ? String(doc.guiaDespacho).slice(0, 80) : null,
          hesNumber: doc.hesNumber ? String(doc.hesNumber).slice(0, 80) : null,
          facturaOriginal: doc.facturaOriginal ? String(doc.facturaOriginal).slice(0, 60) : null,
          tipoDocRefOriginal: doc.tipoDocRefOriginal ? String(doc.tipoDocRefOriginal).slice(0, 10) : null,
          fechaRecepcion,
          estadoReceptor: doc.estadoReceptor ? String(doc.estadoReceptor).slice(0, 30) : null,
          description: doc.descripcion ? String(doc.descripcion).slice(0, 200) : null,
          xmlContent: xmlDe(doc.fileIndex),
          netAmount: Math.max(0, Math.round(Number(doc.neto) || 0)),
          ivaAmount: Math.max(0, Math.round(Number(doc.iva) || 0)),
          exento: Math.max(0, Math.round(Number(doc.exento) || 0)),
          ivaRecargo: Math.max(0, Math.round(Number(doc.ivaRecargo) || 0)),
          totalAmount: Math.max(0, Math.round(Number(doc.total) || 0)),
          tasaIVA: doc.tasaIVA ? Number(doc.tasaIVA) : null,
          formaPago: doc.formaPago || null,
          notes: [doc.terminoPago, doc.formaPago ? `Forma pago: ${doc.formaPago}` : null, doc.estadoReceptor ? `Estado receptor: ${doc.estadoReceptor}` : null]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 500),
          status: "PENDING",
        },
      });

      await createPurchaseItems(
        purchase.id,
        ctx.company.id,
        prepareDocItems(indiceProductos, doc.itemsDetalle),
      );

      const purchaseSync = await syncPurchaseItemsToInventory({
        companyId: ctx.company.id,
        purchaseId: purchase.id,
        date: fecha,
        createdById: ctx.user.id,
      });
      if (!purchaseSync.ok) {
        errores.push(`Folio ${folio}: stock no actualizado (${purchaseSync.errors.join("; ")}).`);
      }


      foliosCreados.add(folio);
      imported += 1;
    } catch {
      errores.push(`Folio ${folio}: no se pudo guardar.`);
    }
  }

  if (imported > 0 || updated > 0) {
    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "Purchase",
      entityId: "import-xml",
      summary: `Importó ${imported} compra(s) y completó ${updated} desde XML DTE de proveedor.`,
    });
    revalidatePath("/dashboard/compras");
    revalidatePath("/dashboard");
  }

  return { ok: true, imported, updated, errores: errores.length > 0 ? errores : undefined };
}


/**
 * Recarga el detalle de items de una venta importada desde XML cuando quedó
 * vacía por un import parcial. Usa el XML guardado en la venta.
 */
export async function backfillSaleItemsFromXml(saleId: string): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    select: { id: true, documentType: true, documentNumber: true, date: true, xmlContent: true },
  });
  if (!sale || !sale.xmlContent) redirect(`/dashboard/ventas/${saleId}`);

  const parsed = parseDteXml(sale.xmlContent);
  const doc = parsed.documentos.find((d) => d.folio === sale.documentNumber);
  if (!doc || !doc.itemsDetalle?.length) redirect(`/dashboard/ventas/${saleId}`);

  const index = await loadProductIndex(ctx.company.id);
  await createSaleItems(sale.id, ctx.company.id, prepareDocItems(index, doc.itemsDetalle));
  await syncSaleItemsToInventory({
    companyId: ctx.company.id,
    saleId: sale.id,
    date: sale.date,
    createdById: ctx.user.id,
  });

  revalidatePath(`/dashboard/ventas/${saleId}`);
  redirect(`/dashboard/ventas/${saleId}`);
}
