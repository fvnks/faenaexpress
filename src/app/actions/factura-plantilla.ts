"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";

import { requireContext, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { CAMPOS_PLANTILLA, esCampoPlantillaValido } from "@/lib/factura-plantilla-campos";

export type FacturaPlantillaState = { error?: string; ok?: boolean } | undefined;

/** Convierte el JSON del formulario en un objeto plano (o `null` si no lo es). */
function parsearConfiguracion(valor: FormDataEntryValue | null) {
  try {
    const data = JSON.parse(String(valor ?? "{}"));
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as Record<string, boolean>;
  } catch {
    return null;
  }
}

/**
 * Obtener todas las plantillas de factura de la empresa activa
 */
export async function obtenerPlantillasFactura() {
  const ctx = await requireContext();

  const plantillas = await db.facturaPlantilla.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ esPredeterminada: "desc" }, { creadoEn: "desc" }],
  });

  return plantillas;
}

/**
 * Obtener una plantilla de factura por ID
 */
export async function obtenerPlantillaFactura(id: string) {
  const ctx = await requireContext();

  const plantilla = await db.facturaPlantilla.findFirst({
    where: { id, companyId: ctx.company.id },
  });

  return plantilla;
}

/**
 * Crear una nueva plantilla de factura
 */
export async function guardarPlantillaFactura(
  _prev: FacturaPlantillaState,
  formData: FormData,
): Promise<FacturaPlantillaState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar plantillas de factura." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const configuracion = parsearConfiguracion(formData.get("configuracion"));
  const esPredeterminada = formData.get("esPredeterminada") === "on";
  // El formulario no expone «inactiva»: lo que se crea desde la UI queda activo.
  const esActiva = formData.has("esActiva")
    ? formData.get("esActiva") === "on"
    : true;

  if (!nombre) {
    return { error: "El nombre de la plantilla es requerido." };
  }
  if (!configuracion) {
    return { error: "La configuración de la plantilla no es válida." };
  }

  try {
    const plantilla = await db.facturaPlantilla.create({
      data: {
        companyId: ctx.company.id,
        nombre,
        configuracion,
        esPredeterminada,
        esActiva,
      },
    });

    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "FacturaPlantilla",
      entityId: plantilla.id,
      summary: `Creó plantilla de factura "${plantilla.nombre}"`,
    });

    revalidatePath("/facturas/plantillas");
    return { ok: true };
  } catch (error) {
    console.error("Error creando plantilla de factura:", error);
    return { error: "No se pudo guardar la plantilla de factura." };
  }
}

/**
 * Actualizar una plantilla de factura existente
 */
export async function actualizarPlantillaFactura(
  id: string,
  _prev: FacturaPlantillaState,
  formData: FormData,
): Promise<FacturaPlantillaState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar plantillas de factura." };

  const plantillaExistente = await db.facturaPlantilla.findFirst({
    where: { id, companyId: ctx.company.id },
  });

  if (!plantillaExistente) return { error: "Plantilla no encontrada." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const configuracion = parsearConfiguracion(formData.get("configuracion"));
  const esPredeterminada = formData.get("esPredeterminada") === "on";
  const esActiva = formData.has("esActiva")
    ? formData.get("esActiva") === "on"
    : plantillaExistente.esActiva;

  if (!nombre) {
    return { error: "El nombre de la plantilla es requerido." };
  }
  if (!configuracion) {
    return { error: "La configuración de la plantilla no es válida." };
  }

  try {
    const plantilla = await db.facturaPlantilla.update({
      where: { id },
      data: {
        nombre,
        configuracion,
        esPredeterminada,
        esActiva,
      },
    });

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "FacturaPlantilla",
      entityId: plantilla.id,
      summary: `Actualizó plantilla de factura "${plantilla.nombre}"`,
    });

    revalidatePath("/facturas/plantillas");
    return { ok: true };
  } catch (error) {
    console.error("Error actualizando plantilla de factura:", error);
    return { error: "No se pudo actualizar la plantilla de factura." };
  }
}

/**
 * Eliminar una plantilla de factura
 */
export async function eliminarPlantillaFactura(id: string): Promise<FacturaPlantillaState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar plantillas de factura." };

  const plantilla = await db.facturaPlantilla.findFirst({
    where: { id, companyId: ctx.company.id },
  });

  if (!plantilla) return { error: "Plantilla no encontrada." };

  try {
    await db.facturaPlantilla.delete({ where: { id } });

    await recordAudit(ctx, {
      action: "DELETE",
      entityType: "FacturaPlantilla",
      entityId: plantilla.id,
      summary: `Eliminó plantilla de factura "${plantilla.nombre}"`,
    });

    revalidatePath("/facturas/plantillas");
    return { ok: true };
  } catch (error) {
    console.error("Error eliminando plantilla de factura:", error);
    return { error: "No se pudo eliminar la plantilla de factura." };
  }
}

/**
 * Crear la plantilla de ejemplo (todos los campos visibles) para la empresa.
 * Sirve para ver en el PDF qué aspectos se reconocen antes de armar la propia.
 */
export async function crearPlantillaEjemplo() {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) {
    return { error: "Solo un administrador puede crear plantillas de factura." };
  }

  const configuracion: Record<string, boolean> = {
    mostrarEmpresa: true,
    mostrarRUT: true,
    mostrarDireccion: true,
    mostrarTelefono: true,
    mostrarCorreo: true,
    mostrarReceptor: true,
    mostrarRUTReceptor: true,
    mostrarDireccionReceptor: true,
    mostrarFechaEmision: true,
    mostrarFechaVencimiento: true,
    mostrarFolio: true,
    mostrarTipoDocumento: true,
    mostrarItems: true,
    mostrarTotales: true,
    mostrarRetencion: false,
    mostrarExento: false,
    mostrarRecargo: false,
    mostrarFormaPago: true,
    mostrarPagado: true,
    mostrarPendiente: true,
    mostrarImporteLetras: true,
    mostrarReferencias: true,
    mostrarVendedor: true,
    mostrarHES: true,
  };

  // Una empresa tiene una sola plantilla (UNIQUE en companyId): si ya existe,
  // la actualizamos a la de ejemplo en vez de crear otra.
  const plantilla = await db.facturaPlantilla.upsert({
    where: { companyId_nombre: { companyId: ctx.company.id, nombre: "Plantilla de ejemplo" } },
    update: { configuracion, esPredeterminada: true, esActiva: true },
    create: {
      companyId: ctx.company.id,
      nombre: "Plantilla de ejemplo",
      configuracion,
      esPredeterminada: true,
      esActiva: true,
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "FacturaPlantilla",
    entityId: plantilla.id,
    summary: `Creó plantilla de ejemplo de factura "${plantilla.nombre}"`,
  });

  revalidatePath("/facturas/plantillas");
  return { ok: true };
}

/**
 * Establecer una plantilla como predeterminada para la empresa
 */
export async function establecerPlantillaPredeterminada(id: string): Promise<FacturaPlantillaState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar plantillas de factura." };

  const plantilla = await db.facturaPlantilla.findFirst({
    where: { id, companyId: ctx.company.id },
  });

  if (!plantilla) return { error: "Plantilla no encontrada." };

  try {
    // Desactivar todas las plantillas predeterminadas de la empresa
    await db.facturaPlantilla.updateMany({
      where: { companyId: ctx.company.id },
      data: { esPredeterminada: false },
    });

    // Establecer la seleccionada como predeterminada
    await db.facturaPlantilla.update({
      where: { id },
      data: { esPredeterminada: true },
    });

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "FacturaPlantilla",
      entityId: plantilla.id,
      summary: `Estableció plantilla "${plantilla.nombre}" como predeterminada`,
    });

    revalidatePath("/facturas/plantillas");
    return { ok: true };
  } catch (error) {
    console.error("Error estableciendo plantilla predeterminada:", error);
    return { error: "No se pudo establecer la plantilla predeterminada." };
  }
}

/**
 * Importar una plantilla de factura desde un archivo Excel (.xlsx) subido por
 * el usuario. La hoja debe llamarse «Plantilla» y tener las columnas Campo /
 * Etiqueta / Visible (la descarga la genera automáticamente).
 */
export async function importarPlantillaExcel(formData: FormData): Promise<FacturaPlantillaState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) {
    return { error: "Solo un administrador puede importar plantillas de factura." };
  }

  const id = String(formData.get("id") ?? "");
  const plantilla = await db.facturaPlantilla.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!plantilla) return { error: "Plantilla no encontrada." };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return { error: "Falta el archivo de plantilla." };
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: "El archivo no tiene hojas de cálculo." };

  // Las filas: 1 = encabezado (Campo, Etiqueta, Visible), a partir de la 2.
  const configuracion: Record<string, boolean> = {};
  for (const campo of CAMPOS_PLANTILLA) configuracion[campo.campo] = campo.porDefecto;

  let leidas = 0;
  for (let i = 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const campo = String(row.getCell(1).value ?? "").trim();
    const visibleValue = row.getCell(3).value;
    const visible =
      visibleValue === true ||
      visibleValue === "true" ||
      visibleValue === 1 ||
      visibleValue === "TRUE";

    if (!campo) continue;
    if (!esCampoPlantillaValido(campo)) continue;
    configuracion[campo] = visible;
    leidas += 1;
  }

  if (leidas === 0) {
    return { error: "El archivo no trajo campos reconocibles." };
  }

  const plantillaActualizada = await db.facturaPlantilla.update({
    where: { id: plantilla.id },
    data: { configuracion },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "FacturaPlantilla",
    entityId: plantillaActualizada.id,
    summary: `Importó plantilla de factura "${plantillaActualizada.nombre}" desde Excel`,
  });

  revalidatePath("/facturas/plantillas");
  return { ok: true };
}

/**
 * Obtener la plantilla predeterminada de la empresa (o la primera activa si no hay predeterminada)
 */
export async function obtenerPlantillaPredeterminada(companyId: string) {
  const plantilla = await db.facturaPlantilla.findFirst({
    where: { companyId, esActiva: true, esPredeterminada: true },
  });

  if (!plantilla) {
    // Si no hay predeterminada, devolver la primera activa
    return await db.facturaPlantilla.findFirst({
      where: { companyId, esActiva: true },
    });
  }

  return plantilla;
}
