"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DocumentType } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DefontanaError,
  downloadXml,
  getMasterData,
  listPurchaseDocuments,
  listSaleDocuments,
  loginDefontana,
  type DefontanaDocumento,
} from "@/lib/defontana/client";
import {
  clearDefontanaCredentials,
  saveDefontanaCredentials,
  withDefontanaSession,
} from "@/lib/defontana/credentials";
import { createPurchaseItems, createSaleItems, loadProductIndex, prepareDocItems } from "@/lib/doc-items";
import { decodeDteXml, dteDate, parseDteXml } from "@/lib/dte";
import { setFlash } from "@/lib/flash";
import { syncPurchaseItemsToInventory, syncSaleItemsToInventory } from "@/lib/inventory-sync";
import { formatRut, normalizeRut } from "@/lib/rut";
import { secretsKeyConfigured } from "@/lib/secrets";

// ── Credenciales por empresa ────────────────────────────────────────────────
// La cuenta de Defontana se guarda con la clave CIFRADA (ver src/lib/secrets.ts)
// y solo para usuarios ADMIN. Al guardar se valida en vivo: si Defontana no
// acepta el login, o si la cuenta abre otra empresa, no se guarda nada.

export type DefontanaCredentialsState = { error?: string; ok?: boolean } | undefined;

export async function saveDefontanaCredentialsAction(
  _prev: DefontanaCredentialsState,
  formData: FormData,
): Promise<DefontanaCredentialsState> {
  const ctx = await requireContext("configuracion");
  if (!canWrite(ctx, "configuracion")) {
    return { error: "Solo un administrador puede guardar las credenciales de Defontana." };
  }
  if (!secretsKeyConfigured()) {
    return {
      error:
        "Falta SII_SECRET_KEY en el entorno. Define una llave para cifrar las credenciales.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  if (!email) return { error: "Ingresa el correo de la cuenta de Defontana." };
  if (!clave) return { error: "Ingresa la clave de la cuenta de Defontana." };

  let session;
  try {
    session = await loginDefontana(email, clave);
  } catch (error) {
    return {
      error:
        error instanceof DefontanaError
          ? error.message
          : "No se pudo iniciar sesión en Defontana. Revisa el correo y la clave.",
    };
  }

  // La cuenta entra a la empresa que Defontana tenga por defecto. Si no es esta
  // empresa, guardar el token haría que se bajen documentos de otra: se avisa.
  const rutEmpresa = ctx.company.rut ? normalizeRut(ctx.company.rut) : "";
  try {
    const masterData = await getMasterData(session.token);
    const empresaDefontana = masterData.companyConfig.legalCode;
    if (
      rutEmpresa &&
      empresaDefontana &&
      normalizeRut(empresaDefontana) !== rutEmpresa
    ) {
      return {
        error: `La cuenta de Defontana abre ${empresaDefontana}, no ${ctx.company.rut}. Usa una cuenta que entre a esta empresa.`,
      };
    }
  } catch {
    // Si no se pudo leer la configuración, se guarda igual: la verificación es
    // una ayuda, no un requisito para tener las credenciales.
  }

  await saveDefontanaCredentials(ctx.company.id, { email, clave, session });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Company",
    entityId: ctx.company.id,
    summary: `Guardó las credenciales de Defontana (${email}) para traer XML a pedido.`,
  });

  revalidatePath("/facturas/configuracion");
  return { ok: true };
}

export async function clearDefontanaCredentialsAction(): Promise<void> {
  const ctx = await requireContext("configuracion");
  if (!canWrite(ctx, "configuracion")) {
    setFlash("error", "Solo un administrador puede borrar las credenciales de Defontana.");
    redirect("/facturas/configuracion");
    return;
  }

  await clearDefontanaCredentials(ctx.company.id);
  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "Company",
    entityId: ctx.company.id,
    summary: "Borró las credenciales de Defontana.",
  });

  setFlash("success", "Credenciales de Defontana borradas.");
  revalidatePath("/facturas/configuracion");
  redirect("/facturas/configuracion");
}

// ── Traer el XML de una factura de compra, a pedido ─────────────────────────

export type FetchPurchaseXmlState =
  | { error?: string; ok?: boolean; message?: string }
  | undefined;

// Qué tipos del SII corresponden a cada tipo de documento nuestro, para no
// confundir una factura con una nota del mismo folio.
const TIPOS_POR_DOCUMENTO: Record<DocumentType, number[]> = {
  INVOICE: [33, 34],
  RECEIPT: [39, 41],
  CREDIT_NOTE: [61],
  DEBIT_NOTE: [56],
  QUOTATION: [],
  OTHER: [],
};

const sinCeros = (value: string) => value.trim().replace(/^0+/, "");

/**
 * Busca en el Libro de Compras de Defontana el documento que corresponde a la
 * compra, baja su XML y lo guarda completando la ficha (montos, ítems, stock),
 * igual que cuando el XML se importa a mano: solo se pide ese documento.
 */
export async function fetchPurchaseXmlAction(
  _prev: FetchPurchaseXmlState,
  formData: FormData,
): Promise<FetchPurchaseXmlState> {
  const ctx = await requireContext("compras");
  if (!canWrite(ctx, "compras")) {
    return { error: "Solo contabilidad o administración puede traer el XML." };
  }

  const purchaseId = String(formData.get("purchaseId") ?? "");
  const purchase = await db.purchase.findFirst({
    where: { id: purchaseId, companyId: ctx.company.id },
    select: {
      id: true,
      date: true,
      documentType: true,
      documentNumber: true,
      xmlContent: true,
      partner: { select: { name: true, rut: true } },
      _count: { select: { items: true } },
    },
  });
  if (!purchase) return { error: "No se encontró la compra." };
  if (purchase.xmlContent) return { ok: true, message: "La compra ya tiene su XML guardado." };

  const folio = sinCeros(purchase.documentNumber ?? "");
  if (!folio) return { error: "La compra no tiene folio: no se puede buscar en Defontana." };

  const rutProveedor = purchase.partner.rut ? normalizeRut(purchase.partner.rut) : "";
  if (!rutProveedor) {
    return { error: `El proveedor ${purchase.partner.name} no tiene RUT registrado.` };
  }

  const tipos = TIPOS_POR_DOCUMENTO[purchase.documentType] ?? [];
  const desde = new Date(purchase.date.getTime() - 366 * 24 * 60 * 60 * 1000);
  const hasta = new Date(purchase.date.getTime() + 366 * 24 * 60 * 60 * 1000);
  const rango = { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) };

  let resultado;
  try {
    resultado = await withDefontanaSession(ctx.company.id, async (session) => {
      const masterData = await getMasterData(session.token);
      // El folio acota en el servidor; el RUT se verifica acá (el filtro
      // `proveedor` del ERP no sirve: ver client.ts).
      const lista = (r: { desde: string; hasta: string }, f: string | null) =>
        listPurchaseDocuments(session.token, masterData, { ...r, folio: f, limite: 500 });

      const cerca = {
        desde: new Date(purchase.date.getTime() - 45 * 864e5).toISOString().slice(0, 10),
        hasta: new Date(purchase.date.getTime() + 45 * 864e5).toISOString().slice(0, 10),
      };
      // El folio se repite entre proveedores: se descarta el que declara otro RUT.
      const deOtroTercero = (docs: DefontanaDocumento[]) =>
        docs.find(
          (doc) =>
            sinCeros(doc.folio) === folio &&
            Boolean(doc.rutTercero) &&
            normalizeRut(doc.rutTercero) !== rutProveedor,
        );

      const conFolio = await lista(rango, folio);
      let documento = elegirDocumento(conFolio, folio, tipos, rutProveedor);
      let deOtro = deOtroTercero(conFolio);
      if (!documento) {
        // Solo si el folio no bastó: se lista una ventana corta sin folio, por si
        // el ERP lo numera distinto (ceros a la izquierda u otro formato).
        const sinFolio = await lista(cerca, null);
        documento = elegirDocumento(sinFolio, folio, tipos, rutProveedor);
        deOtro = deOtro ?? deOtroTercero(sinFolio);
      }

      if (!documento) {
        // El folio aparece en el ERP pero de otro proveedor: se avisa en vez de
        // guardar un XML que no es de esta compra.
        if (deOtro) return { estado: "otro-proveedor" as const, documento: deOtro };
        return { estado: "sin-documento" as const };
      }
      if (!documento.platformId) return { estado: "sin-xml" as const, documento };
      const xml = decodeDteXml(await downloadXml(session.token, documento.platformId));
      return { estado: "ok" as const, documento, xml };
    });
  } catch (error) {
    return {
      error:
        error instanceof DefontanaError
          ? error.message
          : "No se pudo consultar Defontana. Revisa las credenciales en Configuración.",
    };
  }

  if (resultado.estado === "sin-documento") {
    // Es el caso más común: la factura está en el RCV pero todavía no en el Libro
    // de Compras del ERP (o entró con otro folio). Desde Defontana no hay nada
    // que bajar: ese XML solo se puede cargar a mano.
    return {
      error: `La factura ${folio} de ${purchase.partner.name} no está en el Libro de Compras de Defontana: puede que aún no se haya ingresado al ERP, o que esté con otro folio. Ese XML hay que cargarlo a mano.`,
    };
  }
  if (resultado.estado === "sin-xml") {
    return {
      error: `La factura folio ${folio} está en Defontana pero sin XML de plataforma (fue ingresada a mano).`,
    };
  }
  if (resultado.estado === "otro-proveedor") {
    return {
      error: `El folio ${folio} está en Defontana, pero del proveedor ${resultado.documento?.rutTercero ?? "(sin RUT)"}, no de ${purchase.partner.name}. No se guardó nada.`,
    };
  }

  const parsed = parseDteXml(resultado.xml);
  const documento =
    parsed.documentos.find(
      (doc) => sinCeros(String(doc.folio)) === folio && (!tipos.length || tipos.includes(doc.tipoDTE)),
    ) ?? parsed.documentos.find((doc) => sinCeros(String(doc.folio)) === folio);

  if (!documento) {
    return {
      error: parsed.error ?? `El XML que entregó Defontana no trae la factura folio ${folio}.`,
    };
  }
  if (documento.rutEmisor && normalizeRut(documento.rutEmisor) !== rutProveedor) {
    return {
      error: `El XML viene del emisor ${documento.rutEmisor}, que no es ${purchase.partner.name}. No se guardó nada.`,
    };
  }

  const fechaDoc = /^\d{4}-\d{2}-\d{2}$/.test(documento.fecha) ? dteDate(documento.fecha) : purchase.date;
  const fechaOpcional = (value: string | null) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? dteDate(value) : undefined;

  await db.purchase.update({
    where: { id: purchase.id },
    data: {
      xmlContent: resultado.xml,
      date: fechaDoc,
      dueDate: fechaOpcional(documento.vencimiento),
      purchaseOrder: documento.ordenCompra?.slice(0, 80),
      dispatchGuide: documento.guiaDespacho?.slice(0, 80),
      hesNumber: documento.hesNumber?.slice(0, 80),
      facturaOriginal: documento.facturaOriginal?.slice(0, 60),
      tipoDocRefOriginal: documento.tipoDocRefOriginal?.slice(0, 10),
      fechaRecepcion: fechaOpcional(documento.fechaRecepcion),
      estadoReceptor: documento.estadoReceptor?.slice(0, 30),
      description: documento.descripcion?.slice(0, 200),
      formaPago: documento.formaPago?.slice(0, 60),
      netAmount: Math.max(0, Math.round(documento.neto)),
      ivaAmount: Math.max(0, Math.round(documento.iva)),
      exento: Math.max(0, Math.round(documento.exento)),
      ivaRecargo: Math.max(0, Math.round(documento.ivaRecargo)),
      totalAmount: Math.max(0, Math.round(documento.total)),
      tasaIVA: documento.tasaIVA ? Number(documento.tasaIVA) : undefined,
    },
  });

  let aviso = "";
  const items = documento.itemsDetalle ?? [];
  if (purchase._count.items === 0 && items.length > 0) {
    const indice = await loadProductIndex(ctx.company.id);
    await createPurchaseItems(purchase.id, ctx.company.id, prepareDocItems(indice, items));
    const sync = await syncPurchaseItemsToInventory({
      companyId: ctx.company.id,
      purchaseId: purchase.id,
      date: fechaDoc,
      createdById: ctx.user.id,
    });
    if (!sync.ok) aviso = ` El stock no se actualizó (${sync.errors.join("; ")}).`;
  }

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: purchase.id,
    summary: `Trajo de Defontana el XML de la factura ${formatRut(rutProveedor)} folio ${documento.folio}.`,
  });
  revalidatePath("/facturas/compras");
  revalidatePath(`/facturas/compras/${purchase.id}`);

  return {
    ok: true,
    message: `XML de la factura ${documento.folio} guardado con ${items.length} ítem(s).${aviso}`,
  };
}

/**
 * Elige, entre los documentos, el del folio y proveedor pedidos (prefiriendo el
 * tipo del SII esperado). El folio no es único entre proveedores, así que el RUT
 * normalizado desempata; si ninguna fila declara RUT, se conservan todas para no
 * descartar el documento por falta de dato.
 */
function elegirDocumento(
  documentos: DefontanaDocumento[],
  folio: string,
  tipos: number[],
  rutTercero: string,
): DefontanaDocumento | undefined {
  const mismoFolio = documentos.filter((doc) => sinCeros(doc.folio) === folio);
  if (mismoFolio.length === 0) return undefined;

  const delTercero = mismoFolio.filter(
    (doc) => !doc.rutTercero || normalizeRut(doc.rutTercero) === rutTercero,
  );
  if (delTercero.length === 0) return undefined;

  if (tipos.length === 0) return delTercero[0];
  return delTercero.find((doc) => tipos.includes(Number(doc.tipoSii))) ?? delTercero[0];
}

// ── Traer el XML de una venta, a pedido ───────────────────────────────────────
// Ventas: Defontana usa otro GraphQL (`getSalesByCompany`, endpoint de ventas),
// pero el XML se baja del mismo `purchase/getdte` con el `documentId` de la fila.

/**
 * Busca en el Libro de Ventas de Defontana el documento que corresponde a la
 * venta, baja su XML y lo guarda completando la ficha, igual que el
 * `confirmDteImport`: solo se pide ese documento.
 */
export async function fetchSaleXmlAction(
  _prev: FetchSaleXmlState,
  formData: FormData,
): Promise<FetchSaleXmlState> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) {
    return { error: "Solo contabilidad o administración puede traer el XML." };
  }

  const saleId = String(formData.get("saleId") ?? "");
  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    select: {
      id: true,
      date: true,
      documentType: true,
      documentNumber: true,
      xmlContent: true,
      partner: { select: { name: true, rut: true } },
      _count: { select: { items: true } },
    },
  });
  if (!sale) return { error: "No se encontró la venta." };
  if (sale.xmlContent) return { ok: true, message: "La venta ya tiene su XML guardado." };

  const folio = sinCeros(sale.documentNumber ?? "");
  if (!folio) return { error: "La venta no tiene folio: no se puede buscar en Defontana." };

  const rutCliente = sale.partner.rut ? normalizeRut(sale.partner.rut) : "";
  if (!rutCliente) {
    return { error: `El cliente ${sale.partner.name} no tiene RUT registrado.` };
  }

  const tipos = TIPOS_POR_DOCUMENTO[sale.documentType ?? "INVOICE"];
  const desde = new Date(sale.date.getTime() - 366 * 24 * 60 * 60 * 1000);
  const hasta = new Date(sale.date.getTime() + 366 * 24 * 60 * 60 * 1000);
  const rango = { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) };

  let resultado;
  try {
    resultado = await withDefontanaSession(ctx.company.id, async (session) => {
      const masterData = await getMasterData(session.token);
      // El folio acota en el servidor; el RUT se verifica acá (el `clientSearch`
      // del ERP no cruza el RUT: ver client.ts).
      const lista = (r: { desde: string; hasta: string }, f: string | null) =>
        listSaleDocuments(session.token, masterData, { ...r, folio: f, limite: 500 });

      const cerca = {
        desde: new Date(sale.date.getTime() - 45 * 864e5).toISOString().slice(0, 10),
        hasta: new Date(sale.date.getTime() + 45 * 864e5).toISOString().slice(0, 10),
      };
      const deOtroTercero = (docs: DefontanaDocumento[]) =>
        docs.find(
          (doc) =>
            sinCeros(doc.folio) === folio &&
            Boolean(doc.rutTercero) &&
            normalizeRut(doc.rutTercero) !== rutCliente,
        );

      const conFolio = await lista(rango, folio);
      let documento = elegirDocumento(conFolio, folio, tipos, rutCliente);
      let deOtro = deOtroTercero(conFolio);
      if (!documento) {
        const sinFolio = await lista(cerca, null);
        documento = elegirDocumento(sinFolio, folio, tipos, rutCliente);
        deOtro = deOtro ?? deOtroTercero(sinFolio);
      }

      if (!documento) {
        if (deOtro) return { estado: "otro-cliente" as const, documento: deOtro };
        return { estado: "sin-documento" as const };
      }
      if (!documento.platformId) return { estado: "sin-xml" as const, documento };
      const xml = decodeDteXml(await downloadXml(session.token, documento.platformId));
      return { estado: "ok" as const, documento, xml };
    });
  } catch (error) {
    return {
      error:
        error instanceof DefontanaError
          ? error.message
          : "No se pudo consultar Defontana. Revisa las credenciales en Configuración.",
    };
  }

  if (resultado.estado === "sin-documento") {
    return {
      error: `La venta ${folio} de ${sale.partner.name} no está en el Libro de Ventas de Defontana (puede que esté con otro folio).`,
    };
  }
  if (resultado.estado === "sin-xml") {
    return {
      error: `La venta folio ${folio} está en Defontana pero sin XML de plataforma (fue ingresada a mano).`,
    };
  }
  if (resultado.estado === "otro-cliente") {
    return {
      error: `El folio ${folio} está en Defontana, pero del cliente ${resultado.documento?.rutTercero ?? "(sin RUT)"}, no de ${sale.partner.name}. No se guardó nada.`,
    };
  }

  const parsed = parseDteXml(resultado.xml);
  const documento =
    parsed.documentos.find(
      (doc) => sinCeros(String(doc.folio)) === folio && (!tipos.length || tipos.includes(doc.tipoDTE)),
    ) ?? parsed.documentos.find((doc) => sinCeros(String(doc.folio)) === folio);

  if (!documento) {
    return {
      error: parsed.error ?? `El XML que entregó Defontana no trae la venta folio ${folio}.`,
    };
  }
  // En ventas el DTE lo emitimos nosotros: `rutEmisor` es la empresa y
  // `rutReceptor` el cliente. Se verifica el emisor; el cliente ya quedó
  // verificado al elegir el documento por su RUT.
  const rutEmpresa = ctx.company.rut ? normalizeRut(ctx.company.rut) : "";
  if (documento.rutEmisor && rutEmpresa && normalizeRut(documento.rutEmisor) !== rutEmpresa) {
    return {
      error: `El XML fue emitido por ${documento.rutEmisor}, no por ${ctx.company.rut}. No se guardó nada.`,
    };
  }

  const fechaDoc = /^\d{4}-\d{2}-\d{2}$/.test(documento.fecha) ? dteDate(documento.fecha) : sale.date;
  const fechaOpcional = (value: string | null) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? dteDate(value) : undefined;

  await db.sale.update({
    where: { id: sale.id },
    data: {
      xmlContent: resultado.xml,
      date: fechaDoc,
      dueDate: fechaOpcional(documento.vencimiento),
      purchaseOrder: documento.ordenCompra?.slice(0, 80),
      dispatchGuide: documento.guiaDespacho?.slice(0, 80),
      hesNumber: documento.hesNumber?.slice(0, 80),
      facturaOriginal: documento.facturaOriginal?.slice(0, 60),
      tipoDocRefOriginal: documento.tipoDocRefOriginal?.slice(0, 10),
      fechaRecepcion: fechaOpcional(documento.fechaRecepcion),
      estadoReceptor: documento.estadoReceptor?.slice(0, 30),
      description: documento.descripcion?.slice(0, 200),
      formaPago: documento.formaPago?.slice(0, 60),
    },
  });

  let aviso = "";
  const items = documento.itemsDetalle ?? [];
  if (sale._count.items === 0 && items.length > 0) {
    const index = await loadProductIndex(ctx.company.id);
    await createSaleItems(sale.id, ctx.company.id, prepareDocItems(index, items));
    const sync = await syncSaleItemsToInventory({
      companyId: ctx.company.id,
      saleId: sale.id,
      date: fechaDoc,
      createdById: ctx.user.id,
    });
    if (!sync.ok) aviso = ` El stock no se actualizó (${sync.errors.join("; ")}).`;
  }

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: sale.id,
    summary: `Trajo de Defontana el XML de la venta ${formatRut(rutCliente)} folio ${documento.folio}.`,
  });
  revalidatePath("/facturas/ventas");
  revalidatePath(`/facturas/ventas/${sale.id}`);

  return {
    ok: true,
    message: `XML de la venta ${documento.folio} guardado con ${items.length} ítem(s).${aviso}`,
  };
}

export type FetchSaleXmlState = { error?: string; ok?: boolean; message?: string } | undefined;
