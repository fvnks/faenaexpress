"use server";

// Acciones de facturación SaaS: métodos de pago y planes.
//
"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireOrgManager } from "@/lib/auth";

export type BillingActionState =
  | { error?: string; ok?: boolean }
  | undefined;

/** Agrega un método de pago guardado. */
export async function addPaymentMethod(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requireOrgManager();
  if (ctx.orgRole !== "OWNER" && ctx.orgRole !== "ADMIN") {
    return { error: "Solo OWNER y ADMIN pueden gestionar métodos de pago." };
  }

  const provider = String(formData.get("provider") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const providerToken = String(formData.get("providerToken") ?? "").trim();

  const validProviders = ["FLOW", "MERCADOPAGO", "TRANSFER", "MANUAL", "CARD"];
  if (!provider || !validProviders.includes(provider)) {
    return { error: "Proveedor inválido." };
  }
  if (!displayName) return { error: "El nombre visible es obligatorio." };

  // Si es el primero, lo ponemos por defecto
  const existing = await db.platformPaymentMethod.count({
    where: { organizationId: ctx.organization.id },
  });
  const isDefault = existing === 0;

  // Si marcamos como default, quitamos el default de los otros
  if (isDefault) {
    await db.platformPaymentMethod.updateMany({
      where: { organizationId: ctx.organization.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  await db.platformPaymentMethod.create({
    data: {
      organizationId: ctx.organization.id,
      provider: provider as "FLOW" | "MERCADOPAGO" | "TRANSFER" | "MANUAL" | "CARD",
      providerToken: providerToken || null,
      displayName,
      isDefault,
      active: true,
    },
  });

  revalidatePath("/billing");
  return { ok: true };
}

/** Elimina un método de pago. */
export async function removePaymentMethod(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requireOrgManager();
  if (ctx.orgRole !== "OWNER" && ctx.orgRole !== "ADMIN") {
    return { error: "Solo OWNER y ADMIN pueden gestionar métodos de pago." };
  }

  const methodId = String(formData.get("methodId") ?? "").trim();
  if (!methodId) return { error: "Falta el ID del método." };

  const method = await db.platformPaymentMethod.findFirst({
    where: { id: methodId, organizationId: ctx.organization.id },
    select: { id: true, isDefault: true },
  });
  if (!method) return { error: "Método no encontrado." };

  await db.platformPaymentMethod.delete({ where: { id: methodId } });

  // Si borramos el default, ponemos otro como default si existe
  if (method.isDefault) {
    const otro = await db.platformPaymentMethod.findFirst({
      where: { organizationId: ctx.organization.id, active: true },
      orderBy: { createdAt: "asc" },
    });
    if (otro) {
      await db.platformPaymentMethod.update({
        where: { id: otro.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath("/billing");
  return { ok: true };
}

/** Marca un método como predeterminado. */
export async function setDefaultPaymentMethod(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requireOrgManager();
  if (ctx.orgRole !== "OWNER" && ctx.orgRole !== "ADMIN") {
    return { error: "Solo OWNER y ADMIN pueden gestionar métodos de pago." };
  }

  const methodId = String(formData.get("methodId") ?? "").trim();
  if (!methodId) return { error: "Falta el ID del método." };

  const method = await db.platformPaymentMethod.findFirst({
    where: { id: methodId, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!method) return { error: "Método no encontrado." };

  await db.$transaction([
    db.platformPaymentMethod.updateMany({
      where: { organizationId: ctx.organization.id, isDefault: true },
      data: { isDefault: false },
    }),
    db.platformPaymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/billing");
  return { ok: true };
}