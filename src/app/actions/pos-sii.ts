"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP } from "@/lib/money";

export type SiiConfigState = { error?: string; ok?: boolean } | undefined;

async function requireSiiAdmin() {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { ctx: null as any, error: "No tienes permiso para configurar el SII." };
  }
  return { ctx, error: null as string | null };
}

export async function upsertPosSiiConfig(
  _prev: SiiConfigState,
  formData: FormData,
): Promise<SiiConfigState> {
  const { ctx, error } = await requireSiiAdmin();
  if (error) return { error };

  const resolucionSii = String(formData.get("resolucionSii") ?? "").trim() || null;
  const resolucionFecha = String(formData.get("resolucionFecha") ?? "").trim();
  const acteco = String(formData.get("acteco") ?? "").trim() || null;
  const habilitado = String(formData.get("habilitado") ?? "off") === "on";

  let certificadoPfx: string | null = null;
  let certificadoPass: string | null = null;
  let certificadoVence: Date | null = null;

  const file = formData.get("certificadoPfx") as File | null;
  const pass = String(formData.get("certificadoPass") ?? "").trim();
  const vence = String(formData.get("certificadoVence") ?? "").trim();

  if (file && file.size > 0) {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pfx") && !name.endsWith(".p12")) {
      return { error: "El certificado debe ser un archivo .pfx o .p12." };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: "El certificado no puede superar 5 MB." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const { encryptBuffer } = await import("@/lib/sii-crypto");
    const certificadoPfx = encryptBuffer(buf);
    const certificadoPass = pass || null;
    const certificadoVence = vence ? new Date(vence) : null;

    try {
      await db.$transaction(async (tx) => {
        const data: Prisma.PosSiiConfigUpdateInput = {
          resolucionSii,
          resolucionFecha: resolucionFecha ? new Date(resolucionFecha) : null,
          acteco,
          habilitado,
          updatedAt: new Date(),
          certificadoPfx: certificadoPfx,
          certificadoPass: certificadoPass,
          certificadoVence: certificadoVence,
        };

        await tx.posSiiConfig.upsert({
          where: { companyId: ctx.company.id },
          create: {
            companyId: ctx.company.id,
            resolucionSii,
            resolucionFecha: resolucionFecha ? new Date(resolucionFecha) : null,
            acteco,
            habilitado,
            certificadoPfx: certificadoPfx,
            certificadoPass: certificadoPass,
            certificadoVence: certificadoVence,
          },
          update: data,
        });
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo guardar la configuración.";
      return { error: message };
    }

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosSiiConfig",
      entityId: ctx.company.id,
      summary: "Actualizó la configuración SII del punto de venta.",
    });

    await setFlash("success", "Configuración SII guardada", "Los cambios se aplicaron correctamente.");
    revalidatePath("/pos/sii");
    revalidatePath("/pos/venta");
    redirect("/pos/sii");
  }

  // Si no hay archivo, actualizar solo los campos de texto
  try {
    await db.posSiiConfig.upsert({
      where: { companyId: ctx.company.id },
      create: {
        companyId: ctx.company.id,
        resolucionSii,
        resolucionFecha: resolucionFecha ? new Date(resolucionFecha) : null,
        acteco,
        habilitado,
      },
      update: {
        resolucionSii,
        resolucionFecha: resolucionFecha ? new Date(resolucionFecha) : null,
        acteco,
        habilitado,
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo guardar la configuración.";
    return { error: message };
  }

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "PosSiiConfig",
    entityId: ctx.company.id,
    summary: "Actualizó la configuración SII del punto de venta.",
  });

  await setFlash("success", "Configuración SII guardada", "Los cambios se aplicaron correctamente.");
  revalidatePath("/pos/sii");
  revalidatePath("/pos/venta");
  redirect("/pos/sii");
}

export async function getPosSiiConfigForUI(companyId: string) {
  return db.posSiiConfig.findUnique({
    where: { companyId },
    select: {
      id: true,
      resolucionSii: true,
      resolucionFecha: true,
      acteco: true,
      habilitado: true,
      certificadoVence: true,
      certificadoPfx: true,
      certificadoPass: true,
      createdAt: true,
      updatedAt: true,
      cafs: {
        orderBy: { tipoDte: "asc" },
        select: {
          id: true,
          tipoDte: true,
          folioInicio: true,
          folioFinal: true,
          folioActual: true,
          vigenteDesde: true,
          vigenteHasta: true,
        },
      },
    },
  });
}

export async function deletePosSiiCertificate(
  _prev: SiiConfigState,
  formData: FormData,
): Promise<SiiConfigState> {
  const { ctx, error } = await requireSiiAdmin();
  if (error) return { error };

  await db.posSiiConfig.update({
    where: { companyId: ctx.company.id },
    data: {
      certificadoPfx: null,
      certificadoPass: null,
      certificadoVence: null,
    },
  });

  await setFlash("success", "Certificado eliminado", "La configuración SII queda sin certificado.");
  revalidatePath("/pos/sii");
  redirect("/pos/sii");
}

export async function togglePosSiiEnabled(
  _prev: SiiConfigState,
  formData: FormData,
): Promise<SiiConfigState> {
  const { ctx, error } = await requireSiiAdmin();
  if (error) return { error };

  const habilitado = String(formData.get("habilitado") ?? "off") === "on";

  if (habilitado) {
    const cfg = await db.posSiiConfig.findUnique({
      where: { companyId: ctx.company.id },
      select: { certificadoPfx: true, resolucionSii: true, acteco: true },
    });
    if (!cfg?.certificadoPfx) {
      return { error: "No hay certificado subido. Sube un .pfx antes de habilitar." };
    }
    if (!cfg?.resolucionSii) {
      return { error: "Falta la resolución SII." };
    }
    if (!cfg?.acteco) {
      return { error: "Falta el código de actividad económica (acteco)." };
    }
  }

  await db.posSiiConfig.update({
    where: { companyId: ctx.company.id },
    data: { habilitado },
  });

  await setFlash("success", habilitado ? "SII habilitado" : "SII deshabilitado", "El estado cambió correctamente.");
  revalidatePath("/pos/sii");
  revalidatePath("/pos/venta");
  redirect("/pos/sii");
}