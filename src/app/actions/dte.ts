"use server";

import { revalidatePath } from "next/cache";

import { canWrite, requireContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { parseDteXml, type DteDocumento, type DteEstado } from "@/lib/dte";
import {
  createPurchaseItems,
  createSaleItems,
  loadProductIndex,
  prepareDocItems,
} from "@/lib/doc-items";
import { dteMotivoOmision, dteTipoLabel } from "@/lib/labels";
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
};

export type DteImportState = {
  error?: string;
  fileName?: string;
  xmlContent?: string;
  resumen?: { nuevas: number; duplicadas: number; omitidas: number; conError: number };
  rows?: DtePreviewRow[];
} | undefined;

export type DteConfirmState = {
  error?: string;
  ok?: boolean;
  imported?: number;
  errores?: string[];
} | undefined;

const MAX_XML_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENTOS = 200;

function dteDate(value: string): Date {
  // El DTE usa fechas AAAA-MM-DD; misma convención que el importador Excel (UTC).
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Fecha inválida");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** Analiza el XML y arma la vista previa con el estado de cada documento. */
export async function previewDteImport(_prev: DteImportState, formData: FormData): Promise<DteImportState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    return { error: "No tienes permiso para importar datos." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo XML." };
  }
  if (file.size > MAX_XML_BYTES) {
    return { error: "El archivo supera el máximo de 5 MB." };
  }
  if (!/\.xml$/i.test(file.name)) {
    return { error: "El archivo debe ser .xml (EnvioDTE del SII)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseDteXml(buffer);
  if (parsed.error) return { error: parsed.error, fileName: file.name };

  const documentos = parsed.documentos.slice(0, MAX_DOCUMENTOS);

  // Folios ya registrados en la empresa activa (facturas y notas comparten folio).
  const folios = documentos.map((doc) => doc.folio);
  const existentes = await db.sale.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: { documentNumber: true },
  });
  const foliosExistentes = new Set(existentes.map((row) => row.documentNumber));

  const rutEmpresa = ctx.company.rut ? normalizeRut(ctx.company.rut) : null;

  // RUT de trabajadores: si el receptor del DTE es un trabajador, el documento
  // no se importa (los trabajadores no se registran como clientes).
  const rutsReceptores = documentos
    .map((doc) => doc.rutReceptor)
    .filter((rut) => rut && /^\d{6,8}[0-9K]$/i.test(normalizeRut(rut)))
    .map((rut) => normalizeRut(rut));
  const trabajadoresConRut = rutsReceptores.length
    ? await db.worker.findMany({
        where: { companyId: ctx.company.id, rut: { not: null } },
        select: { rut: true },
      })
    : [];
  const rutsTrabajadores = new Set(trabajadoresConRut.map((worker) => normalizeRut(worker.rut!)));

  const rows: DtePreviewRow[] = documentos.map((doc) => {
    const motivo = dteMotivoOmision(doc.tipoDTE);
    if (motivo) {
      return { ...rowBase(doc), estado: "omitida", mensaje: motivo };
    }
    if (doc.rutReceptor && rutsTrabajadores.has(normalizeRut(doc.rutReceptor))) {
      return {
        ...rowBase(doc),
        estado: "error",
        mensaje: `El receptor ${doc.rutReceptor} es un trabajador de RRHH; los trabajadores no se registran como clientes.`,
      };
    }
    if (foliosExistentes.has(doc.folio)) {
      return { ...rowBase(doc), estado: "duplicada", mensaje: "El folio ya está registrado en ventas." };
    }
    if (rutEmpresa && normalizeRut(doc.rutEmisor) !== rutEmpresa) {
      return {
        ...rowBase(doc),
        estado: "error",
        mensaje: `El emisor ${doc.rutEmisor} no coincide con el RUT de ${ctx.company.name}.`,
      };
    }
    if (doc.total <= 0) {
      return { ...rowBase(doc), estado: "error", mensaje: "El total del documento es cero." };
    }
    return { ...rowBase(doc), estado: "nueva", mensaje: null };
  });

  const resumen = {
    nuevas: rows.filter((r) => r.estado === "nueva").length,
    duplicadas: rows.filter((r) => r.estado === "duplicada").length,
    omitidas: rows.filter((r) => r.estado === "omitida").length,
    conError: rows.filter((r) => r.estado === "error").length,
  };

  return { fileName: file.name, xmlContent: buffer.toString("utf8"), rows, resumen };
}

function rowBase(doc: DteDocumento) {
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
};

/**
 * Proyección para COMPRAS: el tercero es el EMISOR del XML (el proveedor).
 * `rowBase` proyecta el RECEPTOR, que en una factura de compra es la propia
 * empresa — usarla tal cual daría la empresa como proveedor de sí misma.
 */
function rowBasePurchase(doc: DteDocumento) {
  return {
    ...rowBase(doc),
    rut: doc.rutEmisor,
    cliente: doc.razonSocialEmisor,
    giro: null,
    direccion: null,
    comuna: null,
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
    select: { documentNumber: true },
  });
  const foliosExistentes = new Set(existentes.map((row) => row.documentNumber));

  // RUT de trabajadores: no se crean como clientes (guarda igual que la vista previa).
  const trabajadoresConRut = await db.worker.findMany({
    where: { companyId: ctx.company.id, rut: { not: null } },
    select: { rut: true },
  });
  const rutsTrabajadores = new Set(trabajadoresConRut.map((worker) => normalizeRut(worker.rut!)));

  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: { id: true, name: true, rut: true, address: true },
  });
  const partnerPorRut = new Map<string, { id: string; address: string | null }>();
  const partnerPorNombre = new Map<string, { id: string; address: string | null }>();
  for (const partner of partners) {
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), { id: partner.id, address: partner.address });
    partnerPorNombre.set(partner.name.trim().toLowerCase(), { id: partner.id, address: partner.address });
  }

  const errores: string[] = [];
  let imported = 0;
  // Una sola consulta para vincular los ítems de todos los documentos.
  const indiceProductos = await loadProductIndex(ctx.company.id);

  for (const doc of documentos) {
    const folio = String(doc.folio ?? "").trim();
    try {
      if (foliosExistentes.has(folio)) {
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

      // Datos de contacto del XML (datos aparte del registro de la venta):
      // viven en el cliente, no en la venta.
      const xmlDireccion = [doc.direccion, doc.comuna]
        .map((parte) => String(parte ?? "").trim())
        .filter(Boolean)
        .join(", ") || null;

      if (!partner) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: "CUSTOMER",
            name: cliente,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
            address: xmlDireccion,
          },
        });
        partner = { id: creado.id, address: xmlDireccion };
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, partner);
        partnerPorNombre.set(cliente.toLowerCase(), partner);
      } else if (!partner.address && xmlDireccion) {
        // Cliente existente sin dirección: complétala con la del XML.
        await db.partner.update({ where: { id: partner.id }, data: { address: xmlDireccion } });
        partner.address = xmlDireccion;
      }
      const partnerId = partner.id;

      const fecha = dteDate(String(doc.fecha));
      const venc = doc.vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.vencimiento)) ? dteDate(String(doc.vencimiento)) : null;

      const fechaRecepcion = doc.fechaRecepcion && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fechaRecepcion)) ? dteDate(String(doc.fechaRecepcion)) : null;

      const sale = await db.sale.create({
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
          xmlContent: (formData.get("xmlContent") as string) || null,
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
        prepareDocItems(indiceProductos, doc.itemsDetalle),
      );

      foliosExistentes.add(folio);
      imported += 1;
    } catch {
      errores.push(`Folio ${folio}: no se pudo guardar (¿folio repetido por otro tipo de documento?).`);
    }
  }

  if (imported > 0) {
    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "Sale",
      entityId: "import-xml",
      summary: `Importó ${imported} venta(s) desde XML DTE del SII.`,
    });
    revalidatePath("/dashboard/ventas");
    revalidatePath("/dashboard");
  }

  return { ok: true, imported, errores: errores.length > 0 ? errores : undefined };
}

// ---------------------------------------------------------------------------
// Importación de XML DTE para COMPRAS (facturas de proveedores)
// ---------------------------------------------------------------------------

export type PurchaseXmlState = {
  error?: string;
  fileName?: string;
  xmlContent?: string;
  resumen?: { nuevas: number; duplicadas: number; omitidas: number; conError: number };
  rows?: DtePreviewRow[];
} | undefined;

export type PurchaseXmlConfirmState = {
  error?: string;
  ok?: boolean;
  imported?: number;
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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo XML." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "El archivo supera el máximo de 5 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseDteXml(buffer);
  if (parsed.error) return { error: parsed.error, fileName: file.name };

  const documentos = parsed.documentos.slice(0, 200);

  // Folios ya registrados en compras.
  const folios = documentos.map((doc) => doc.folio);
  const existentes = await db.purchase.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: { documentNumber: true },
  });
  const foliosExistentes = new Set(existentes.map((row) => row.documentNumber));

  const rutEmpresa = ctx.company.rut ? normalizeRut(ctx.company.rut) : null;

  const rows: DtePreviewRow[] = documentos.map((doc) => {
    const motivo = dteMotivoOmision(doc.tipoDTE);
    if (motivo) {
      return { ...rowBasePurchase(doc), estado: "omitida" as const, mensaje: motivo };
    }
    if (foliosExistentes.has(doc.folio)) {
      return { ...rowBasePurchase(doc), estado: "duplicada" as const, mensaje: "El folio ya está registrado en compras." };
    }
    // En compras, el RECEPTOR debe ser la empresa activa.
    if (rutEmpresa && normalizeRut(doc.rutReceptor) !== rutEmpresa) {
      return {
        ...rowBasePurchase(doc),
        estado: "error" as const,
        mensaje: `El receptor ${doc.rutReceptor} no coincide con el RUT de ${ctx.company.name}.`,
      };
    }
    if (doc.total <= 0) {
      return { ...rowBasePurchase(doc), estado: "error" as const, mensaje: "El total del documento es cero." };
    }
    if (!doc.rutEmisor || !doc.razonSocialEmisor) {
      return { ...rowBasePurchase(doc), estado: "error" as const, mensaje: "El XML no trae los datos del proveedor (emisor)." };
    }
    return { ...rowBasePurchase(doc), estado: "nueva" as const, mensaje: null };
  });

  const resumen = {
    nuevas: rows.filter((r) => r.estado === "nueva").length,
    duplicadas: rows.filter((r) => r.estado === "duplicada").length,
    omitidas: rows.filter((r) => r.estado === "omitida").length,
    conError: rows.filter((r) => r.estado === "error").length,
  };

  return {
    fileName: file.name,
    xmlContent: buffer.toString("utf8"),
    rows,
    resumen,
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

  const xmlContent = (formData.get("xmlContent") as string) || null;

  // Revalidar duplicados.
  const folios = documentos.map((doc) => String(doc.folio ?? "")).filter(Boolean);
  const existentes = await db.purchase.findMany({
    where: { companyId: ctx.company.id, documentNumber: { in: folios } },
    select: { documentNumber: true },
  });
  const foliosExistentes = new Set(existentes.map((row) => row.documentNumber));

  // Proveedores: buscar o crear por RUT.
  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: { id: true, name: true, rut: true },
  });
  const partnerPorRut = new Map<string, { id: string }>();
  const partnerPorNombre = new Map<string, { id: string }>();
  for (const partner of partners) {
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), { id: partner.id });
    partnerPorNombre.set(partner.name.trim().toLowerCase(), { id: partner.id });
  }

  const errores: string[] = [];
  let imported = 0;
  // Una sola consulta para vincular los ítems de todos los documentos.
  const indiceProductos = await loadProductIndex(ctx.company.id);

  for (const doc of documentos) {
    const folio = String(doc.folio ?? "").trim();
    try {
      if (foliosExistentes.has(folio)) {
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
      let partnerId = rutNormalizado ? partnerPorRut.get(rutNormalizado)?.id : undefined;
      if (!partnerId) partnerId = partnerPorNombre.get(nombre.toLowerCase())?.id;
      if (!partnerId) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: "SUPPLIER",
            name: nombre,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
          },
        });
        partnerId = creado.id;
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, { id: creado.id });
        partnerPorNombre.set(nombre.toLowerCase(), { id: creado.id });
      }

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
          xmlContent,
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

      foliosExistentes.add(folio);
      imported += 1;
    } catch {
      errores.push(`Folio ${folio}: no se pudo guardar.`);
    }
  }

  if (imported > 0) {
    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "Purchase",
      entityId: "import-xml",
      summary: `Importó ${imported} compra(s) desde XML DTE de proveedor.`,
    });
    revalidatePath("/dashboard/compras");
    revalidatePath("/dashboard");
  }

  return { ok: true, imported, errores: errores.length > 0 ? errores : undefined };
}
