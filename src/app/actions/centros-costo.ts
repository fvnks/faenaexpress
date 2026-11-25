"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";

export type CentroCostoFormState = { error?: string; ok?: boolean } | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

export async function createCentroCosto(
  _prev: CentroCostoFormState,
  formData: FormData,
): Promise<CentroCostoFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const codigo = texto(formData, "codigo").toUpperCase();
  const nombre = texto(formData, "nombre");
  const descripcion = texto(formData, "descripcion");
  if (codigo.length < 1 || nombre.length < 2) {
    return { error: "Indica un código y un nombre de al menos 2 caracteres." };
  }

  const clash = await db.centroCosto.findFirst({
    where: { companyId: ctx.company.id, OR: [{ codigo }, { nombre }] },
    select: { id: true },
  });
  if (clash) return { error: "Ya existe un centro de costo con ese código o nombre." };

  await db.centroCosto.create({
    data: {
      companyId: ctx.company.id,
      codigo: codigo.slice(0, 20),
      nombre: nombre.slice(0, 120),
      descripcion: descripcion ? descripcion.slice(0, 300) : null,
    },
  });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "CentroCosto",
    summary: `Creó el centro de costo «${nombre}» (${codigo}).`,
  });
  revalidatePath("/facturas/centros-costo");
  return { ok: true };
}

/**
 * Marca el centro «sin asignar» de la empresa: los gastos indirectos sin regla
 * caen aquí. Solo puede haber uno activo por empresa.
 */
export async function setCentroSinAsignar(id: string, _formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return;

  const centro = await db.centroCosto.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, nombre: true, esSinAsignar: true },
  });
  if (!centro) return;

  const activar = !centro.esSinAsignar;
  // Quitar la marca a los demás para que la imputación nunca sea ambigua.
  if (activar) {
    await db.centroCosto.updateMany({
      where: { companyId: ctx.company.id, esSinAsignar: true },
      data: { esSinAsignar: false },
    });
  }
  await db.centroCosto.update({
    where: { id, companyId: ctx.company.id },
    data: { esSinAsignar: activar },
  });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "CentroCosto",
    entityId: id,
    summary: activar
      ? `Marcó «${centro.nombre}» como centro sin asignar para gastos indirectos.`
      : `Quitó la marca de centro sin asignar a «${centro.nombre}».`,
    changes: { esSinAsignar: { before: centro.esSinAsignar, after: activar } },
  });
  revalidatePath("/facturas/centros-costo");
  revalidatePath("/facturas/reportes/centros-costo");
}

export async function updateCentroCosto(
  id: string,
  _prev: CentroCostoFormState,
  formData: FormData,
): Promise<CentroCostoFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const nombre = texto(formData, "nombre");
  const descripcion = texto(formData, "descripcion");
  const codigo = texto(formData, "codigo").toUpperCase();
  if (nombre.length < 2 || codigo.length < 1) return { error: "Código y nombre son obligatorios." };

  const clash = await db.centroCosto.findFirst({
    where: { companyId: ctx.company.id, OR: [{ codigo }, { nombre }] },
    select: { id: true },
  });
  if (clash && clash.id !== id) return { error: "Ya existe un centro de costo con ese código o nombre." };

  await db.centroCosto.update({
    where: { id, companyId: ctx.company.id },
    data: {
      codigo: codigo.slice(0, 20),
      nombre: nombre.slice(0, 120),
      descripcion: descripcion ? descripcion.slice(0, 300) : null,
      active: formData.get("active") !== null,
    },
  });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "CentroCosto",
    entityId: id,
    summary: `Editó el centro de costo «${nombre}».`,
  });
  revalidatePath("/facturas/centros-costo");
  revalidatePath("/facturas/reportes/centros-costo");
  return { ok: true };
}
