"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";

export type SiiConfigState = { error?: string; ok?: boolean } | undefined;

async function requireSiiAdmin() {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { ctx: null as any, error: "No tienes permiso para configurar el SII." };
  }
  return { ctx, error: null as string | null };
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

export async function upsertPosSiiConfig(
  _prev: SiiConfigState,
  formData: FormData,
): Promise<SiiConfigState> {
  const { ctx, error } = await requireSiiAdmin();
  if (error) return { error };

  const config = await db.posSiiConfig.findUnique({
    where: { companyId: ctx.company.id },
  });
  if (!config) return { error: "No hay configuración SII. Guarda la config primero." };

  const tipoDte = Number(formData.get("tipoDte") ?? 0);
  const folioInicio = Number(formData.get("folioInicio") ?? 0);
  const folioFinal = Number(formData.get("folioFinal") ?? 0);
  const vigenteDesde = String(formData.get("vigenteDesde") ?? "");
  const vigenteHasta = String(formData.get("vigenteHasta") ?? "");

  if (![33, 39, 61, 56].includes(tipoDte)) return { error: "Tipo de DTE inválido." };
  if (folioInicio <= 0 || folioFinal <= 0 || folioInicio > folioFinal) {
    return { error: "Rango de folios inválido." };
  }
  if (!vigenteDesde || !vigenteHasta) return { error: "Faltan fechas de vigencia." };

  const existing = await db.posCaf.findFirst({
    where: { configId: config.id, tipoDte },
  });

  if (existing) {
    await db.posCaf.update({
      where: { id: existing.id },
      data: {
        folioInicio,
        folioFinal,
        vigenteDesde: new Date(vigenteDesde),
        vigenteHasta: new Date(vigenteHasta),
      },
    });
  } else {
    await db.posCaf.create({
      data: {
        companyId: ctx.company.id,
        configId: config.id,
        tipoDte,
        folioInicio,
        folioFinal,
        folioActual: 0,
        vigenteDesde: new Date(vigenteDesde),
        vigenteHasta: new Date(vigenteHasta),
      },
    });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosCaf",
    entityId: "",
    summary: `Registró CAF tipo ${tipoDte} (folios ${folioInicio}-${folioFinal}).`,
  });

  await setFlash("success", "CAF guardado", "El rango de folios quedó registrado.");
  revalidatePath("/pos/sii");
  redirect("/pos/sii");
}

export async function deletePosCaf(
  _prev: SiiConfigState,
  formData: FormData,
): Promise<SiiConfigState> {
  const { ctx, error } = await requireSiiAdmin();
  if (error) return { error };

  const cafId = String(formData.get("cafId") ?? "");
  if (!cafId) return { error: "Falta el ID del CAF." };

  await db.posCaf.delete({ where: { id: cafId } });
  await setFlash("success", "CAF eliminado", "El rango de folios fue eliminado.");
  revalidatePath("/pos/sii");
  redirect("/pos/sii");
}

export async function togglePosSiiEnabledAction(
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

export { upsertPosSiiConfig as upsertPosCaf };
export { deletePosCaf as deletePosCafAction };