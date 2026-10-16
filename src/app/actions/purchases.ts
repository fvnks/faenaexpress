"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { safeReturnTo } from "@/lib/return-to";
import { computeTotal, formatCLP, todayDate } from "@/lib/money";
import { paymentMethodValues, purchaseSchema, type PurchaseInput } from "@/lib/validation";

export type PurchaseFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  return {
    partnerId: formData.get("partnerId"),
    categoryId: formData.get("categoryId"),
    areaId: formData.get("areaId"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    referenceDocumentNumber: formData.get("referenceDocumentNumber"),
    date: formData.get("date"),
    dueDate: formData.get("dueDate"),
    description: formData.get("description"),
    netAmount: formData.get("netAmount"),
    ivaAmount: formData.get("ivaAmount"),
    status: formData.get("status"),
    paymentMethod: formData.get("paymentMethod"),
    paymentDate: formData.get("paymentDate"),
    notes: formData.get("notes"),
  };
}

function toData(input: PurchaseInput) {
  const paid = input.status === "PAID";
  return {
    partnerId: input.partnerId,
    categoryId: input.categoryId ?? null,
    areaId: input.areaId ?? null,
    documentType: input.documentType,
    documentNumber: input.documentNumber ?? null,
    referenceDocumentNumber: input.referenceDocumentNumber ?? null,
    date: input.date,
    dueDate: input.dueDate ?? null,
    description: input.description ?? null,
    netAmount: input.netAmount,
    ivaAmount: input.ivaAmount,
    // El total siempre se recalcula: nunca se confía en lo que llega del cliente.
    totalAmount: computeTotal(input.netAmount, input.ivaAmount),
    status: input.status,
    paymentMethod: paid ? (input.paymentMethod ?? "OTHER") : null,
    // Si se marca pagada sin fecha, se usa el día de Chile (medianoche UTC),
    // no la hora exacta: el dominio guarda días de calendario.
    paymentDate: paid ? (input.paymentDate ?? todayDate()) : null,
    notes: input.notes ?? null,
  };
}

function describe(input: { documentNumber?: string | null; netAmount: number; ivaAmount: number }) {
  const folio = input.documentNumber ? `N° ${input.documentNumber} ` : "";
  return `compra ${folio}por ${formatCLP(computeTotal(input.netAmount, input.ivaAmount))}`;
}

export async function createPurchase(
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    return { error: "No tienes permiso para registrar compras." };
  }

  const parsed = purchaseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  // Verificar que el número de documento no esté repetido en la misma empresa.
  const existing = await db.purchase.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber },
  });
  if (existing) {
    return { error: "Ya existe una compra con ese número de documento en esta empresa." };
  }

  const data = toData(parsed.data);
  const purchase = await db.purchase.create({
    data: { ...data, companyId: ctx.company.id, createdById: ctx.user.id },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Purchase",
    entityId: purchase.id,
    summary: `Registró una ${describe(data)}.`,
  });

  await setFlash("success", "Compra guardada", describe(data));
  revalidatePath("/dashboard/compras");
  revalidatePath("/dashboard");
  redirect("/dashboard/compras");
}

export async function updatePurchase(
  id: string,
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    return { error: "No tienes permiso para editar compras." };
  }

  const parsed = purchaseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  // Verificar que el número de documento no esté repetido por otra compra en la misma empresa.
  const existing = await db.purchase.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber },
  });
  if (existing && existing.id !== id) {
    return { error: "Ya existe otra compra con ese número de documento en esta empresa." };
  }

  const before = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!before) {
    return { error: "La compra no existe." };
  }

  const data = toData(parsed.data);
  await db.purchase.update({ where: { id, companyId: ctx.company.id }, data });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: id,
    summary: `Editó una ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Compra actualizada", describe(data));
  revalidatePath("/dashboard/compras");
  revalidatePath(`/dashboard/compras/${id}`);
  redirect(`/dashboard/compras/${id}`);
}

function normalizePaymentDate(value: unknown): string | null {
  if (!(typeof value === "string")) return null;
  const cleaned = value.trim().replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const match = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3] ?? String(new Date().getFullYear());
  const iso = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export async function markPurchasePaid(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    redirect("/dashboard/compras");
  }

  const id = String(formData.get("id") ?? "");
  const rawMethod = formData.get("paymentMethod");
  const paymentMethod = paymentMethodValues.find((value) => value === rawMethod) ?? "OTHER";

  const rawDate = formData.get("paymentDate");
  const wired = normalizePaymentDate(rawDate);
  if (!wired) {
    await setFlash("error", "Ingresa la fecha de pago en formato DD-MM o DD-MM-AAAA.");
    redirect(`/dashboard/compras/${id}`);
  }
  const paymentDate = new Date(`${wired}T00:00:00.000Z`);

  const purchase = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!purchase) redirect("/dashboard/compras");

  await db.purchase.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PAID", paymentMethod, paymentDate },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: id,
    summary: `Marcó como pagada la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}por ${formatCLP(purchase.totalAmount)}.`,
    changes: { status: { before: purchase.status, after: "PAID" } },
  });

  await setFlash("success", "Compra marcada como pagada");
  revalidatePath("/dashboard/compras");
  revalidatePath(`/dashboard/compras/${id}`);
  redirect(`/dashboard/compras/${id}`);
}

export async function markPurchasePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    redirect("/dashboard/compras");
  }

  const id = String(formData.get("id") ?? "");
  const purchase = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!purchase) redirect("/dashboard/compras");

  await db.purchase.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PENDING", paymentMethod: null, paymentDate: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: id,
    summary: `Marcó como pendiente la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}por ${formatCLP(purchase.totalAmount)}.`,
    changes: { status: { before: purchase.status, after: "PENDING" } },
  });

  await setFlash("success", "Compra marcada como pendiente");
  revalidatePath("/dashboard/compras");
  revalidatePath(`/dashboard/compras/${id}`);
  redirect(`/dashboard/compras/${id}`);
}

export async function deletePurchase(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    redirect("/dashboard/compras");
  }

  const id = String(formData.get("id") ?? "");
  if (id) {
    const purchase = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
    if (purchase) {
      await db.purchase.delete({ where: { id, companyId: ctx.company.id } });
      await recordAudit(ctx, {
        action: "DELETE",
        entityType: "Purchase",
        entityId: id,
        summary: `Eliminó la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}por ${formatCLP(purchase.totalAmount)}.`,
      });
      await setFlash("success", "Compra eliminada", purchase.documentNumber ? `N° ${purchase.documentNumber}` : undefined);
    }
  }
  revalidatePath("/dashboard/compras");
  redirect("/dashboard/compras");
}

// Cambia el estado de pago de varias compras a la vez.
export async function bulkSetPurchaseStatus(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const returnTo = safeReturnTo(formData.get("returnTo"), "/dashboard/compras");
  if (!canWrite(ctx, "compras")) {
    redirect(returnTo);
  }

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const status = formData.get("status") === "PAID" ? "PAID" : "PENDING";
  if (ids.length === 0) redirect(returnTo);

  const result = await db.purchase.updateMany({
    where: { id: { in: ids }, companyId: ctx.company.id },
    data: { status, paymentDate: status === "PAID" ? todayDate() : null },
  });

  if (result.count > 0) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Purchase",
      entityId: "bulk",
      summary: `Marcó ${result.count} ${result.count === 1 ? "compra" : "compras"} como ${status === "PAID" ? "pagadas" : "pendientes"}.`,
    });
    await setFlash(
      "success",
      `${result.count} ${result.count === 1 ? "compra actualizada" : "compras actualizadas"}`,
      status === "PAID" ? "Marcadas como pagadas." : "Marcadas como pendientes.",
    );
  }
  revalidatePath("/dashboard/compras");
  redirect(returnTo);
}
