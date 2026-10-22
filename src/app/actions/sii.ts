"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { RcvSide } from "@albertomarturelo/sii-core";
import { consoleLogin } from "@albertomarturelo/sii-core/cli";
import { logout as siiLogout } from "@albertomarturelo/sii-core";

import type { PartnerType } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { dteTipoLabel } from "@/lib/labels";
import { ensurePartnerRole } from "@/lib/partners";
import { formatRut, isValidRut, normalizeRut } from "@/lib/rut";
import { fetchRcvRows, type RcvRow } from "@/lib/sii/rcv";
import { importarGuiaSii, type PartnerInfo } from "@/lib/sii/import-guides";
import { createAppRuntime } from "@/lib/sii/runtime";
import {
  encryptSiiClave,
  getStoredSiiCredentials,
  siiSecretKeyConfigured,
  type StoredSiiCredentials,
} from "@/lib/sii-credentials";
import { workerRutExists } from "@/lib/rrhh";

export type RcvSyncState = {
  error?: string;
  advertencia?: string;
  side?: RcvSide;
  periodo?: string;
  resumen?: { nuevas: number; duplicadas: number; omitidas: number; conError: number; total: number };
  rows?: (RcvRow & {
    estado: "nueva" | "duplicada" | "omitida" | "error";
    mensaje: string | null;
    tipoDocLabel: string;
  })[];
} | undefined;

export type RcvConfirmState = {
  error?: string;
  ok?: boolean;
  imported?: number;
  errores?: string[];
} | undefined;

// Tipos que se importan como compras/ventas/guías; el resto se informa como omitido.
// Las notas de crédito (61) y las guías de despacho (52) ya no se omiten: se
// guardan como CREDIT_NOTE o como DispatchGuide, respectivamente.
const TIPOS_IMPORTABLES: Record<number, "INVOICE" | "DEBIT_NOTE" | "CREDIT_NOTE" | "GUIDE"> = {
  33: "INVOICE", // factura electrónica
  34: "INVOICE", // factura exenta
  50: "GUIDE", // guía de despacho
  52: "DEBIT_NOTE", // nota de débito
  61: "CREDIT_NOTE", // nota de crédito
};

const MOTIVOS_OMISION: Record<number, string> = {
  39: "Boleta electrónica",
  41: "Boleta exenta",
};

function parsePeriodo(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  return /^\d{4}-\d{2}$/.test(text) ? text : null;
}

function parseSide(raw: unknown): RcvSide | null {
  return raw === "VENTA" ? "VENTA" : raw === "COMPRA" ? "COMPRA" : null;
}

/**
 * Los folios NO son únicos a nivel global: cada emisor tiene su propia
 * numeración y las notas/guías llevan secuencias separadas de las facturas.
 * Comparar un folio de venta contra las compras (o contra las guías) hacía
 * que ventas legítimas se marcaran como "duplicada" y se saltaran.
 */

// Fecha simple del DTE; acepta "AAAA-MM-DD" con o sin hora y descarta el resto.
function fechaDteISO(value: unknown): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? "").trim());
  return match ? match[1] : null;
}

type FoliosExistentes = {
  compras: Set<string>; // folio del documento de compra
  ventas: Set<string>; // folio del documento de venta (el emisor es la empresa)
  guias: Set<string>; // número de guía
};

async function cargarFoliosExistentes(
  companyId: string,
  folios: string[],
): Promise<FoliosExistentes> {
  const [compras, ventas, guias] = await Promise.all([
    db.purchase.findMany({
      where: { companyId, documentNumber: { in: folios } },
      select: { documentNumber: true },
    }),
    db.sale.findMany({
      where: { companyId, documentNumber: { in: folios } },
      select: { documentNumber: true },
    }),
    db.dispatchGuide.findMany({
      where: { companyId, guideNumber: { in: folios } },
      select: { guideNumber: true },
    }),
  ]);

  return {
    compras: new Set(compras.map((row) => row.documentNumber).filter(Boolean) as string[]),
    ventas: new Set(ventas.map((row) => row.documentNumber).filter(Boolean) as string[]),
    guias: new Set(guias.map((row) => row.guideNumber)),
  };
}

function esFolioExistente(
  row: { tipoDoc: number; folio: string },
  side: RcvSide,
  sets: FoliosExistentes,
): boolean {
  const importable = TIPOS_IMPORTABLES[row.tipoDoc];
  if (importable === "GUIDE") return sets.guias.has(row.folio);
  return side === "COMPRA" ? sets.compras.has(row.folio) : sets.ventas.has(row.folio);
}

function registrarFolio(
  sets: FoliosExistentes,
  row: { tipoDoc: number; folio: string },
  side: RcvSide,
): void {
  const importable = TIPOS_IMPORTABLES[row.tipoDoc];
  if (importable === "GUIDE") sets.guias.add(row.folio);
  else if (side === "COMPRA") sets.compras.add(row.folio);
  else sets.ventas.add(row.folio);
}

// Aviso legible cuando el SII no entregó el detalle de uno o más tipos.
function avisoIncompleto(rejectedTypes: readonly string[]): string | null {
  if (rejectedTypes.length === 0) return null;
  const tipos = rejectedTypes.map(Number).filter((n) => Number.isFinite(n)).join(", ");
  return `El SII no devolvió el detalle de ${rejectedTypes.length} tipo(s) de documento (${tipos}). Esos folios pueden faltar; reintenta la sincronización o revisa el RCV en el portal.`;
}

// --- Sesión (login desde la web) ------------------------------------------------
//
// La Clave Tributaria viaja una sola vez por HTTPS a esta acción, se usa con
// el login headless del core (llena el formulario real del SII y la descarta
// con el frame) y aquí NUNCA se guarda, loguea ni audita. El SII bloquea cuentas
// tras intentos fallidos, así que limitamos intentos por usuario.
//
// Si el usuario eligió guardar credenciales para el login automático, van por
// `saveSiiCredentials`/`siiAutoLoginAction` (más abajo), cifradas con
// SII_SECRET_KEY.

export type SiiLoginState = { error?: string; ok?: boolean } | undefined;

const intentos = new Map<string, { cuenta: number; primera: number; bloqueadoHasta: number }>();
const VENTANA_MS = 5 * 60 * 1000;
const MAX_INTENTOS = 3;
const BLOQUEO_MS = 5 * 60 * 1000;

function chequearLimite(userId: string): string | null {
  const ahora = Date.now();
  const estado = intentos.get(userId);
  if (!estado) return null;
  if (estado.bloqueadoHasta > ahora) {
    const minutos = Math.ceil((estado.bloqueadoHasta - ahora) / 60000);
    return `Demasiados intentos fallidos. Espera ${minutos} minuto${minutos === 1 ? "" : "s"} antes de reintentar (el SII bloquea cuentas).`;
  }
  if (ahora - estado.primera > VENTANA_MS) {
    intentos.delete(userId);
    return null;
  }
  return null;
}

function registrarFallo(userId: string): void {
  const ahora = Date.now();
  const estado = intentos.get(userId);
  if (!estado || ahora - estado.primera > VENTANA_MS) {
    intentos.set(userId, { cuenta: 1, primera: ahora, bloqueadoHasta: 0 });
    return;
  }
  estado.cuenta += 1;
  if (estado.cuenta >= MAX_INTENTOS) {
    estado.bloqueadoHasta = ahora + BLOQUEO_MS;
  }
}

export async function siiLoginAction(_prev: SiiLoginState, formData: FormData): Promise<SiiLoginState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) return { error: "No tienes permiso para gestionar la sesión del SII." };

  const limite = chequearLimite(ctx.user.id);
  if (limite) return { error: limite };

  const rut = String(formData.get("rut") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");

  if (!isValidRut(rut)) return { error: "Ingresa un RUT válido (con dígito verificador)." };
  if (clave.length < 4) return { error: "Ingresa tu Clave Tributaria." };

  try {
    const resultado = await consoleLogin(createAppRuntime(ctx.company.id), { rut: normalizeRut(rut), clave });
    // La Clave ya no existe en ningún scope: vivió solo en el argumento arriba.
    revalidatePath("/facturas/importar");
    if (resultado.authenticated) {
      await recordAudit(ctx, {
        action: "UPDATE",
        entityType: "SiiSession",
        entityId: normalizeRut(rut),
        summary: `Inició sesión en el SII como ${formatRut(normalizeRut(rut))} desde la web.`,
      });
    }
    return { ok: true };
  } catch (error) {
    registrarFallo(ctx.user.id);
    const message = error instanceof Error ? error.message : "No se pudo iniciar sesión en el SII.";
    return { error: message };
  }
}

// ── Credenciales guardadas por empresa (login automático) ───────────────────
// A diferencia de `siiLoginAction`, aquí la Clave Tributaria SÍ se persiste,
// pero siempre cifrada con SII_SECRET_KEY (AES-256-GCM) y solo para usuarios
// ADMIN. El RUT guardado es el de la cuenta con la que se inició sesión.

export type SiiCredentialsState = { error?: string; ok?: boolean } | undefined;

export async function saveSiiCredentials(
  _prev: SiiCredentialsState,
  formData: FormData,
): Promise<SiiCredentialsState> {
  const ctx = await requireContext("configuracion");
  if (!canWrite(ctx, "configuracion")) {
    return { error: "Solo un administrador puede guardar las credenciales del SII." };
  }
  if (!siiSecretKeyConfigured()) {
    return {
      error:
        "Falta SII_SECRET_KEY en el entorno. Define una llave para cifrar las credenciales del SII.",
    };
  }

  const rut = String(formData.get("rut") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");

  if (!isValidRut(rut)) return { error: "Ingresa un RUT válido (con dígito verificador)." };

  // Si no se escribe una clave nueva, se conserva la que ya está guardada
  // (así se puede corregir solo el RUT sin volver a tipear la Clave).
  let claveEnc: string;
  if (clave.length > 0) {
    if (clave.length < 4) return { error: "Ingresa tu Clave Tributaria." };
    claveEnc = encryptSiiClave(clave);
  } else {
    const actual = await db.company.findUnique({
      where: { id: ctx.company.id },
      select: { siiClaveEnc: true },
    });
    if (!actual?.siiClaveEnc) return { error: "Ingresa tu Clave Tributaria." };
    claveEnc = actual.siiClaveEnc;
  }

  const normalizado = normalizeRut(rut);
  await db.company.update({
    where: { id: ctx.company.id },
    data: { siiRut: normalizado, siiClaveEnc: claveEnc },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Company",
    entityId: ctx.company.id,
    summary: `Guardó las credenciales del SII (${formatRut(normalizado)}) para el login automático.`,
  });

  revalidatePath("/facturas/configuracion");
  revalidatePath("/facturas/importar");
  return { ok: true };
}

export async function clearSiiCredentials(): Promise<void> {
  const ctx = await requireContext("configuracion");
  if (!canWrite(ctx, "configuracion")) {
    setFlash("error", "Solo un administrador puede borrar las credenciales del SII.");
    redirect("/facturas/configuracion");
    return;
  }

  await db.company.update({
    where: { id: ctx.company.id },
    data: { siiRut: null, siiClaveEnc: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Company",
    entityId: ctx.company.id,
    summary: "Borró las credenciales guardadas del SII.",
  });

  revalidatePath("/facturas/configuracion");
  revalidatePath("/facturas/importar");
}

/** Un clic: abre la sesión del SII con las credenciales guardadas de la empresa. */
export async function siiAutoLoginAction(): Promise<SiiLoginState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) return { error: "No tienes permiso para gestionar la sesión del SII." };

  const limite = chequearLimite(ctx.user.id);
  if (limite) return { error: limite };

  let stored: StoredSiiCredentials | null;
  try {
    stored = await getStoredSiiCredentials(ctx.company.id);
  } catch {
    return {
      error:
        "No se pudo leer la clave guardada: cambió SII_SECRET_KEY. Vuelve a guardarla en Configuración.",
    };
  }

  if (!stored) {
    return {
      error:
        "Esta empresa no tiene credenciales guardadas. Guárdalas en Configuración → Credenciales del SII.",
    };
  }

  try {
    const resultado = await consoleLogin(createAppRuntime(ctx.company.id), {
      rut: normalizeRut(stored.rut),
      clave: stored.clave,
    });
    revalidatePath("/facturas/importar");
    if (resultado.authenticated) {
      await recordAudit(ctx, {
        action: "UPDATE",
        entityType: "SiiSession",
        entityId: normalizeRut(stored.rut),
        summary: `Inició sesión en el SII como ${formatRut(normalizeRut(stored.rut))} con las credenciales guardadas.`,
      });
      return { ok: true };
    }
    return {
      error:
        "El SII no aceptó las credenciales guardadas. Revisa la Clave Tributaria en Configuración.",
    };
  } catch (error) {
    registrarFallo(ctx.user.id);
    const message = error instanceof Error ? error.message : "No se pudo iniciar sesión en el SII.";
    return { error: `${message} Si la clave cambió, actualízala en Configuración.` };
  }
}

export async function siiLogoutAction(): Promise<void> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    redirect403();
    return;
  }
  await siiLogout(createAppRuntime(ctx.company.id));
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "SiiSession",
    summary: "Cerró la sesión del SII.",
  });
  revalidatePath("/facturas/importar");
}

function redirect403(): void {
  setFlash("error", "No tienes permiso para gestionar la sesión del SII.");
}

/** Consulta el RCV del período y arma la vista previa con estado por folio. */
export async function previewRcvSync(_prev: RcvSyncState, formData: FormData): Promise<RcvSyncState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) return { error: "No tienes permiso para importar datos." };

  const side = parseSide(formData.get("side"));
  const periodo = parsePeriodo(formData.get("periodo"));
  if (!side || !periodo) return { error: "Indica el lado (compras o ventas) y un período válido (AAAA-MM)." };

  const companyRut = ctx.company.rut;
  if (!companyRut) {
    return {
      error: `Configura el RUT de ${ctx.company.name} en Configuración antes de sincronizar con el SII.`,
    };
  }

  let rows: RcvRow[];
  let advertencia: string | undefined;
  try {
    const result = await fetchRcvRows({ companyId: ctx.company.id, companyRut, periodo, side });
    rows = result.rows;
    advertencia = result.incomplete ? avisoIncompleto(result.rejectedTypes) ?? undefined : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: message.includes("auth login")
        ? message
        : `No se pudo leer el RCV del SII: ${message}`,
      side,
      periodo,
    };
  }

  // RUT de trabajadores: nunca se registran como terceros.
  const ruts = rows.map((row) => row.rut).filter(Boolean);
  const trabajadores = ruts.length
    ? await db.worker.findMany({
        where: { companyId: ctx.company.id, rut: { not: null } },
        select: { rut: true },
      })
    : [];
  const rutsTrabajadores = new Set(trabajadores.map((worker) => normalizeRut(worker.rut!)));

  // Duplicados: cada folio se compara solo contra su propia familia (ventas
  // contra ventas, compras contra compras por RUT de proveedor, guías contra
  // guías). Antes se mezclaban los tres y se perdían documentos legítimos.
  const folios = rows.map((row) => row.folio).filter(Boolean);
  const foliosExistentes = await cargarFoliosExistentes(ctx.company.id, folios);

  const preview = rows.map((row) => {
    const importable = TIPOS_IMPORTABLES[row.tipoDoc];
    if (!importable) {
      return {
        ...row,
        estado: "omitida" as const,
        mensaje: MOTIVOS_OMISION[row.tipoDoc] ?? `Tipo de documento ${row.tipoDoc} no importable`,
        tipoDocLabel: dteTipoLabel(row.tipoDoc),
      };
    }
    if (row.rut && rutsTrabajadores.has(normalizeRut(row.rut))) {
      return {
        ...row,
        estado: "error" as const,
        mensaje: "El tercero es un trabajador de RRHH; los trabajadores no se registran como clientes o proveedores.",
        tipoDocLabel: dteTipoLabel(row.tipoDoc),
      };
    }
    if (!fechaDteISO(row.fecha)) {
      return {
        ...row,
        estado: "error" as const,
        mensaje: "El SII devolvió una fecha de emisión inválida; revisa el documento en el portal.",
        tipoDocLabel: dteTipoLabel(row.tipoDoc),
      };
    }
    if (esFolioExistente(row, side, foliosExistentes)) {
      return {
        ...row,
        estado: "duplicada" as const,
        mensaje: "El folio ya está registrado.",
        tipoDocLabel: dteTipoLabel(row.tipoDoc),
      };
    }
    return {
      ...row,
      estado: "nueva" as const,
      mensaje: null,
      tipoDocLabel: dteTipoLabel(row.tipoDoc),
    };
  });

  const resumen = {
    nuevas: preview.filter((row) => row.estado === "nueva").length,
    duplicadas: preview.filter((row) => row.estado === "duplicada").length,
    omitidas: preview.filter((row) => row.estado === "omitida").length,
    conError: preview.filter((row) => row.estado === "error").length,
    total: preview.length,
  };

  return { side, periodo, rows: preview, resumen, advertencia };
}

type PayloadRow = RcvRow & { tipoDoc: number };

/**
 * Sincronización rápida: consulta el RCV del período e importa todo lo nuevo
 * en un solo paso. Se usa desde los botones "Sincronizar SII" de Compras y
 * Ventas; redirige de vuelta a la sección con un toast.
 */
export async function quickSyncRcv(formData: FormData): Promise<void> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    await setFlash("error", "No tienes permiso para importar datos.");
    redirect("/facturas");
  }

  const side = parseSide(formData.get("side"));
  const periodo = parsePeriodo(formData.get("periodo"));
  const companyRut = ctx.company.rut;
  const destino = side === "VENTA" ? "/facturas/ventas" : "/facturas/compras";
  const etiqueta = side === "VENTA" ? "ventas" : "compras";

  if (!side || !periodo) {
    await setFlash("error", "Indica el lado y el período.", "Vuelve a intentar.");
    redirect(destino);
  }
  if (!companyRut) {
    await setFlash("error", `Configura el RUT de ${ctx.company.name} en Configuración.`, "El SII necesita el RUT para leer el RCV.");
    redirect(destino);
  }

  // 1. Consultar el RCV
  let rows: RcvRow[];
  let advertenciaRcv: string | undefined;
  try {
    const result = await fetchRcvRows({ companyId: ctx.company.id, companyRut, periodo, side });
    rows = result.rows;
    advertenciaRcv = result.incomplete ? avisoIncompleto(result.rejectedTypes) ?? undefined : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setFlash("error", "No se pudo leer el RCV del SII", message);
    redirect(destino);
  }

  // 2. Clasificar (mismo criterio que la vista previa)
  const folios = rows.map((row) => row.folio).filter(Boolean);
  const foliosExistentes = await cargarFoliosExistentes(ctx.company.id, folios);

  const trabajadores = await db.worker.findMany({
    where: { companyId: ctx.company.id, rut: { not: null } },
    select: { rut: true },
  });
  const rutsTrabajadores = new Set(trabajadores.map((worker) => normalizeRut(worker.rut!)));

  const fallos: string[] = [];
  const nuevas = rows.filter((row) => {
    if (!TIPOS_IMPORTABLES[row.tipoDoc]) return false;
    if (row.rut && rutsTrabajadores.has(normalizeRut(row.rut))) return false;
    if (!fechaDteISO(row.fecha)) {
      fallos.push(`Folio ${row.folio}: fecha de emisión inválida (${row.fecha || "vacía"}).`);
      return false;
    }
    return !esFolioExistente(row, side, foliosExistentes);
  });
  const omitidas = rows.filter((row) => !TIPOS_IMPORTABLES[row.tipoDoc]).length;
  const duplicadas = rows.filter(
    (row) => TIPOS_IMPORTABLES[row.tipoDoc] && esFolioExistente(row, side, foliosExistentes),
  ).length;

  const diagnosticoBase = `SII devolvió ${rows.length} documentos: ${nuevas.length} nuevas, ${duplicadas} ya registradas, ${omitidas} omitidas, ${fallos.length} con problemas.` +
    (advertenciaRcv ? ` ${advertenciaRcv}` : "");

  if (nuevas.length === 0) {
    await setFlash(
      "success",
      "Todo al día",
      `El RCV del período ${periodo} no trae ${etiqueta} nuevas. ${diagnosticoBase}`,
    );
    redirect(destino);
  }

  // 3. Importar (misma lógica que confirmRcvSync)
  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: { id: true, name: true, rut: true, type: true, salespersonId: true },
  });
  const partnerPorRut = new Map<string, PartnerInfo>();
  const partnerPorNombre = new Map<string, PartnerInfo>();
  for (const partner of partners) {
    const info: PartnerInfo = { id: partner.id, type: partner.type, salespersonId: partner.salespersonId };
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), info);
    partnerPorNombre.set(partner.name.trim().toLowerCase(), info);
  }

  let imported = 0;
  for (const row of nuevas) {
    const folio = String(row.folio ?? "").trim();
    try {
      const importable = TIPOS_IMPORTABLES[row.tipoDoc];
      if (!importable) continue;
      const fechaIso = fechaDteISO(row.fecha);
      if (!fechaIso) {
        fallos.push(`Folio ${folio}: fecha de emisión inválida (${row.fecha || "vacía"}).`);
        continue;
      }

      const rut = String(row.rut ?? "").trim();
      const nombre = String(row.nombre ?? "").trim() || "(sin razón social)";
      const rutNormalizado = rut ? normalizeRut(rut) : "";
      if (rutNormalizado && (await workerRutExists(ctx.company.id, rutNormalizado))) continue;

      const rol: "SUPPLIER" | "CUSTOMER" = side === "COMPRA" ? "SUPPLIER" : "CUSTOMER";
      const partnerInfo = rutNormalizado ? partnerPorRut.get(rutNormalizado) : undefined;
      const partner = partnerInfo ?? partnerPorNombre.get(nombre.toLowerCase());
      let partnerId = partner?.id;
      if (!partnerId) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: rol,
            name: nombre,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
          },
        });
        partnerId = creado.id;
        const info: PartnerInfo = { id: creado.id, type: rol, salespersonId: null };
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, info);
        partnerPorNombre.set(nombre.toLowerCase(), info);
      } else {
        // Un tercero que solo tenía el otro rol pasa a BOTH.
        if (partner) await ensurePartnerRole(partner, rol);
      }

      const fecha = new Date(`${fechaIso}T00:00:00.000Z`);

      // Las guías de despacho no son facturas ni compras: se guardan como
      // DispatchGuide, sin vendedor (el RCV no indica quién despachó), y se
      // enlazan con la factura de venta que despachan. Después se asignan a un
      // mes de comisión en Comisiones → Asignaciones.
      if (importable === "GUIDE") {
        await importarGuiaSii({
          companyId: ctx.company.id,
          userId: ctx.user.id,
          row,
          folio,
          fecha,
          periodo,
          partnerPorRut,
          partnerPorNombre,
        });
      } else {
        const base = {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          partnerId,
          documentType: importable,
          documentNumber: folio,
          date: fecha,
          description: `${dteTipoLabel(row.tipoDoc)} ${folio} — ${nombre}`,
          netAmount: Math.max(0, Math.round(Number(row.neto) || 0)),
          ivaAmount: Math.max(0, Math.round(Number(row.iva) || 0)),
          totalAmount: Math.max(0, Math.round(Number(row.total) || 0)),
          notes: row.evento ? `RCV SII: ${row.evento}` : `RCV SII ${periodo}`,
          status: "PENDING" as const,
        };

        if (side === "COMPRA") {
          await db.purchase.create({ data: { ...base, dueDate: null, paymentMethod: null, paymentDate: null } });
        } else {
          await db.sale.create({
            data: {
              ...base,
              dueDate: null,
              salespersonId: partner?.salespersonId ?? null,
              purchaseOrder: row.purchaseOrder,
              dispatchGuide: null,
              hesNumber: row.hesNumber,
              retentionAmount: 0,
              paymentMethod: null,
              paymentDate: null,
            },
          });
        }
      }

      registrarFolio(foliosExistentes, row, side);
      imported += 1;
    } catch {
      // El resto sigue importándose; el conteo final refleja lo logrado.
      fallos.push(`Folio ${folio}: no se pudo guardar.`);
    }
  }

  const diagnostico = `SII devolvió ${rows.length} documentos: ${nuevas.length} nuevas, ${duplicadas} ya registradas, ${omitidas} omitidas, ${fallos.length} con problemas.` +
    (advertenciaRcv ? ` ${advertenciaRcv}` : "");

  if (imported > 0) {
    await recordAudit(ctx, {
      action: "CREATE",
      entityId: `rcv-quick-${(side ?? "compra").toLowerCase()}`,
      entityType: side === "COMPRA" ? "Purchase" : "Sale",
      summary: `Sincronizó ${imported} ${etiqueta} del RCV del SII (período ${periodo}).`,
    });
    revalidatePath(destino);
    revalidatePath("/facturas");
    await setFlash(
      "success",
      `${imported} ${imported === 1 ? (side === "COMPRA" ? "compra importada" : "venta importada") : `${etiqueta} importadas`}`,
      `${destino === "/facturas/ventas" ? "Ventas" : "Compras"} · ${periodo} · ${diagnostico}`,
    );
  } else {
    await setFlash("error", "No se importó ningún documento nuevo del RCV.", diagnostico);
  }
  redirect(destino);
}
export async function confirmRcvSync(_prev: RcvConfirmState, formData: FormData): Promise<RcvConfirmState> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) return { error: "No tienes permiso para importar datos." };

  const side = parseSide(formData.get("side"));
  const periodo = parsePeriodo(formData.get("periodo"));
  if (!side || !periodo) return { error: "La vista previa ya no es válida. Consulta el SII nuevamente." };

  let rows: PayloadRow[];
  try {
    rows = JSON.parse(String(formData.get("payload") ?? "")) as PayloadRow[];
  } catch {
    return { error: "La vista previa ya no es válida. Consulta el SII nuevamente." };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "No hay documentos nuevos para importar." };
  if (rows.length > 500) return { error: "Máximo 500 documentos por sincronización." };

  // Revalidación servidor-side (la acción es alcanzable por POST directo).
  const folios = rows.map((row) => String(row.folio ?? "")).filter(Boolean);
  const foliosExistentes = await cargarFoliosExistentes(ctx.company.id, folios);

  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: { id: true, name: true, rut: true, type: true, salespersonId: true },
  });
  const partnerPorRut = new Map<string, PartnerInfo>();
  const partnerPorNombre = new Map<string, PartnerInfo>();
  for (const partner of partners) {
    const info: PartnerInfo = { id: partner.id, type: partner.type, salespersonId: partner.salespersonId };
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), info);
    partnerPorNombre.set(partner.name.trim().toLowerCase(), info);
  }

  const errores: string[] = [];
  let imported = 0;

  for (const row of rows) {
    const folio = String(row.folio ?? "").trim();
    try {
      if (esFolioExistente(row, side, foliosExistentes)) {
        errores.push(`Folio ${folio}: ya estaba registrado.`);
        continue;
      }
      const importable = TIPOS_IMPORTABLES[Number(row.tipoDoc)];
      if (!importable) {
        errores.push(`Folio ${folio}: tipo ${dteTipoLabel(Number(row.tipoDoc))} no importable.`);
        continue;
      }
      const fechaIso = fechaDteISO(row.fecha);
      if (!fechaIso) {
        errores.push(`Folio ${folio}: fecha de emisión inválida (${row.fecha || "vacía"}).`);
        continue;
      }

      // Tercero: proveedor (compras) o cliente (ventas); se crea si no existe.
      const rut = String(row.rut ?? "").trim();
      const nombre = String(row.nombre ?? "").trim() || "(sin razón social)";
      const rutNormalizado = rut ? normalizeRut(rut) : "";
      if (rutNormalizado && (await workerRutExists(ctx.company.id, rutNormalizado))) {
        errores.push(`Folio ${folio}: el tercero es un trabajador de RRHH; no se registra como tercero.`);
        continue;
      }
      const rol: "SUPPLIER" | "CUSTOMER" = side === "COMPRA" ? "SUPPLIER" : "CUSTOMER";
      const partnerInfo = rutNormalizado ? partnerPorRut.get(rutNormalizado) : undefined;
      const partner = partnerInfo ?? partnerPorNombre.get(nombre.toLowerCase());
      let partnerId = partner?.id;
      if (!partnerId) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: rol,
            name: nombre,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
          },
        });
        partnerId = creado.id;
        const info: PartnerInfo = { id: creado.id, type: rol, salespersonId: null };
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, info);
        partnerPorNombre.set(nombre.toLowerCase(), info);
      } else {
        // Un tercero que solo tenía el otro rol pasa a BOTH.
        if (partner) await ensurePartnerRole(partner, rol);
      }

      const fecha = new Date(`${fechaIso}T00:00:00.000Z`);

      // Las guías de despacho no son facturas ni compras: se guardan como
      // DispatchGuide, sin vendedor (el RCV no indica quién despachó), y se
      // enlazan con la factura de venta que despachan. Después se asignan a un
      // mes de comisión en Comisiones → Asignaciones.
      if (importable === "GUIDE") {
        await importarGuiaSii({
          companyId: ctx.company.id,
          userId: ctx.user.id,
          row,
          folio,
          fecha,
          periodo,
          partnerPorRut,
          partnerPorNombre,
        });
      } else {
        const base = {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          partnerId,
          documentType: importable,
          documentNumber: folio,
          date: fecha,
          description: `${dteTipoLabel(row.tipoDoc)} ${folio} — ${nombre}`,
          netAmount: Math.max(0, Math.round(Number(row.neto) || 0)),
          ivaAmount: Math.max(0, Math.round(Number(row.iva) || 0)),
          totalAmount: Math.max(0, Math.round(Number(row.total) || 0)),
          notes: row.evento ? `RCV SII: ${row.evento}` : `RCV SII ${periodo}`,
          status: "PENDING" as const,
        };

        if (side === "COMPRA") {
          await db.purchase.create({ data: { ...base, dueDate: null, paymentMethod: null, paymentDate: null } });
        } else {
          await db.sale.create({
            data: {
              ...base,
              dueDate: null,
              salespersonId: partner?.salespersonId ?? null,
              purchaseOrder: row.purchaseOrder,
              dispatchGuide: null,
              hesNumber: row.hesNumber,
              retentionAmount: 0,
              paymentMethod: null,
              paymentDate: null,
            },
          });
        }
      }

      registrarFolio(foliosExistentes, row, side);
      imported += 1;
    } catch {
      errores.push(`Folio ${folio}: no se pudo guardar (¿folio repetido por otro tipo de documento?).`);
    }
  }

  if (imported > 0) {
    const etiqueta = side === "COMPRA" ? "compras" : "ventas";
    await recordAudit(ctx, {
      action: "CREATE",
      entityId: `rcv-${side.toLowerCase()}`,
      entityType: side === "COMPRA" ? "Purchase" : "Sale",
      summary: `Sincronizó ${imported} ${etiqueta} del RCV del SII (período ${periodo}).`,
    });
    await setFlash(
      "success",
      `${imported} ${imported === 1 ? (side === "COMPRA" ? "compra importada" : "venta importada") : `${etiqueta} importadas`}`,
      `RCV del SII — período ${periodo}`,
    );
    revalidatePath(side === "COMPRA" ? "/facturas/compras" : "/facturas/ventas");
    revalidatePath("/facturas");
  }

  return { ok: true, imported, errores: errores.length > 0 ? errores : undefined };
}

/**
 * Nota de crédito o débito disponible en el SII para asociar a una venta
 * que se está anulando.
 */
export type AvailableNote = {
  folio: string;
  tipoDoc: number;
  tipoDocLabel: string;
  fecha: string;
  rut: string;
  nombre: string;
  total: number;
};

/**
 * Consulta las notas de crédito y débito disponibles para asociar a una venta
 * que se está anula. Combina dos fuentes:
 * 1. NC/ND ya registradas en la BD (importadas previamente desde el SII)
 * 2. NC/ND del RCV del SII (consulta en tiempo real)
 * Se usa en el modal de cancelación de ventas.
 */
export async function getAvailableNotesForSale(
  saleId: string,
): Promise<{ notes: AvailableNote[]; error?: string }> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) return { notes: [], error: "No tienes permiso para cancelar ventas." };

  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    include: { partner: true },
  });
  if (!sale) return { notes: [], error: "No se encontró la venta." };

  const companyRut = ctx.company.rut;
  if (!companyRut) return { notes: [], error: "Configura el RUT de la empresa en Configuración." };

  const notes: AvailableNote[] = [];
  const seen = new Set<string>();

  // Fuente 1: NC/ND ya registradas en la BD (importadas previamente)
  const dbNotes = await db.sale.findMany({
    where: {
      companyId: ctx.company.id,
      partnerId: sale.partnerId,
      documentType: { in: ["CREDIT_NOTE", "DEBIT_NOTE"] },
    },
    select: {
      documentNumber: true,
      documentType: true,
      date: true,
      totalAmount: true,
    },
    orderBy: { date: "desc" },
  });

  for (const note of dbNotes) {
    if (!note.documentNumber) continue;
    const tipoDoc = note.documentType === "CREDIT_NOTE" ? 61 : 56;
    const key = `${tipoDoc}-${note.documentNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({
      folio: note.documentNumber,
      tipoDoc,
      tipoDocLabel: note.documentType === "CREDIT_NOTE" ? "Nota de crédito" : "Nota de débito",
      fecha: note.date.toISOString().split("T")[0],
      rut: sale.partner.rut ?? "",
      nombre: sale.partner.name,
      total: note.totalAmount,
    });
  }

  // Fuente 2: NC/ND del RCV del SII (consulta en tiempo real)
  const saleDate = new Date(sale.date);
  const periods: string[] = [];
  for (let i = 0; i <= 2; i++) {
    const d = new Date(saleDate.getFullYear(), saleDate.getMonth() + i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  for (const periodo of periods) {
    try {
      const result = await fetchRcvRows({ companyId: ctx.company.id, companyRut, periodo, side: "VENTA" });
      for (const row of result.rows) {
        if (row.tipoDoc !== 61 && row.tipoDoc !== 56) continue;
        if (row.rut !== sale.partner.rut) continue;
        const key = `${row.tipoDoc}-${row.folio}`;
        if (seen.has(key)) continue;
        seen.add(key);
        notes.push({
          folio: row.folio,
          tipoDoc: row.tipoDoc,
          tipoDocLabel: row.tipoDoc === 61 ? "Nota de crédito" : "Nota de débito",
          fecha: row.fecha,
          rut: row.rut,
          nombre: row.nombre,
          total: row.total,
        });
      }
    } catch {
      // Si un período falla (sin sesión, sin datos), sigue con el siguiente.
    }
  }

  // Ordenar por fecha descendente (más recientes primero)
  notes.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { notes };
}
