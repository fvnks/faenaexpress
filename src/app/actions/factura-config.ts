"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireContext, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export type FacturaConfiguracionState = { error?: string; ok?: boolean } | undefined;

/**
 * Guarda o actualiza el logo y las opciones de la factura comercial para la
 * empresa activa. Solo el ADMIN de la empresa puede hacerlo.
 */
export async function saveFacturaConfiguracion(
  _prev: FacturaConfiguracionState,
  formData: FormData,
): Promise<FacturaConfiguracionState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede editar la configuración de facturas." };

  const logo = String(formData.get("logo") ?? "").trim() || null;
  const mostrarLogo = formData.get("mostrarLogo") === "on";
  const mostrarTimbreSii = formData.get("mostrarTimbreSii") === "on";
  const textoPie = String(formData.get("textoPie") ?? "").trim() || null;

  const empresaId = ctx.company.id;

  try {
    await db.facturaConfiguracion.upsert({
      where: { companyId: empresaId },
      update: {
        logo,
        mostrarLogo,
        mostrarTimbreSii,
        textoPie,
      },
      create: {
        companyId: empresaId,
        logo,
        mostrarLogo,
        mostrarTimbreSii,
        textoPie,
      },
    });

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "FacturaConfiguracion",
      entityId: empresaId,
      summary: `Actualizó la configuración de factura de la empresa «${ctx.company.name}» (logo: ${logo ? "sí" : "no"}, timbre SII: ${mostrarTimbreSii ? "sí" : "no"}).`,
    });

    revalidatePath("/facturas/configuracion");
    return { ok: true };
  } catch (error) {
    console.error("Error guardando configuración de factura:", error);
    return { error: "No se pudo guardar la configuración de factura." };
  }
}

/**
 * Obtiene la configuración de factura de la empresa activa.
 */
export async function getFacturaConfiguracion() {
  const ctx = await requireContext();

  const config = await db.facturaConfiguracion.findUnique({
    where: { companyId: ctx.company.id },
  });

  return config ?? null;
}
