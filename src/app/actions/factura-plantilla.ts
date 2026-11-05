"use server";

import { revalidatePath } from "next/cache";

import { requireContext, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

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

    revalidatePath("/facturas/configuracion/factura-plantillas");
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

    revalidatePath("/facturas/configuracion/factura-plantillas");
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

    revalidatePath("/facturas/configuracion/factura-plantillas");
    return { ok: true };
  } catch (error) {
    console.error("Error eliminando plantilla de factura:", error);
    return { error: "No se pudo eliminar la plantilla de factura." };
  }
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

    revalidatePath("/facturas/configuracion/factura-plantillas");
    return { ok: true };
  } catch (error) {
    console.error("Error estableciendo plantilla predeterminada:", error);
    return { error: "No se pudo establecer la plantilla predeterminada." };
  }
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
