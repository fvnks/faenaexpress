"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { computeTotal, formatCLP } from "@/lib/money";
import { saleSchema, type SaleInput } from "@/lib/validation";

export type SaleFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  return {
    partnerId: formData.get("partnerId"),
    categoryId: formData.get("categoryId"),
    areaId: formData.get("areaId"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    referenceDocumentNumber: formData.get("referenceDocumentNumber"),
    date: formData.get("date"),
    salespersonId: formData.get("salespersonId"),
    purchaseOrder: formData.get("purchaseOrder"),
    dispatchGuide: formData.get("dispatchGuide"),
    hesNumber: formData.get("hesNumber"),
    netAmount: formData.get("netAmount"),
    ivaAmount: formData.get("ivaAmount"),
    retentionAmount: formData.get("retentionAmount"),
    status: formData.get("status"),
    paymentDate: formData.get("paymentDate"),
    notes: formData.get("notes"),
  };
}

function toData(input: SaleInput) {
  const paid = input.status === "PAID";
  return {
    partnerId: input.partnerId,
    categoryId: input.categoryId ?? null,
    areaId: input.areaId ?? null,
    documentType: input.documentType,
    documentNumber: input.documentNumber ?? null,
    referenceDocumentNumber: input.referenceDocumentNumber ?? null,
    date: input.date,
    salespersonId: input.salespersonId ?? null,
    purchaseOrder: input.purchaseOrder ?? null,
    dispatchGuide: input.dispatchGuide ?? null,
    hesNumber: input.hesNumber ?? null,
    netAmount: input.netAmount,
    ivaAmount: input.ivaAmount,
    // El total siempre se recalcula: nunca se confía en lo que llega del cliente.
    totalAmount: computeTotal(input.netAmount, input.ivaAmount),
    retentionAmount: input.retentionAmount ?? 0,
    status: input.status,
    paymentDate: paid ? (input.paymentDate ?? new Date()) : null,
    paymentMethod: null,
    notes: input.notes ?? null,
  };
}

function describe(input: { documentNumber?: string | null; netAmount: number; ivaAmount: number }) {
  const folio = input.documentNumber ? `N° ${input.documentNumber} ` : "";
  return `venta ${folio}por ${formatCLP(computeTotal(input.netAmount, input.ivaAmount))}`;
}

export async function createSale(_prev: SaleFormState, formData: FormData): Promise<SaleFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) return { error: "No tienes permiso para registrar ventas." };

  const parsed = saleSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  // Verificar que el número de documento no esté repetido en la misma empresa.
  const existing = await db.sale.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber ?? "" },
  });
  if (existing) {
    return { error: "Ya existe una venta con ese número de factura en esta empresa." };
  }

  const data = toData(parsed.data);
  const sale = await db.sale.create({
    data: { ...data, companyId: ctx.company.id, createdById: ctx.user.id },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Sale",
    entityId: sale.id,
    summary: `Registró una ${describe(data)}.`,
  });

  await setFlash("success", "Venta guardada", describe(data));
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
  redirect("/dashboard/ventas");
}

export async function updateSale(
  id: string,
  _prev: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) return { error: "No tienes permiso para editar ventas." };

  const parsed = saleSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  // Verificar que el número de documento no esté repetido por otra venta en la misma empresa.
  const existing = await db.sale.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber ?? "" },
  });
  if (existing && existing.id !== id) {
    return { error: "Ya existe otra venta con ese número de factura en esta empresa." };
  }

  const before = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!before) return { error: "La venta no existe." };

  const data = toData(parsed.data);
  await db.sale.update({ where: { id, companyId: ctx.company.id }, data });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Editó una ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Venta actualizada", describe(data));
  revalidatePath("/dashboard/ventas");
  revalidatePath(`/dashboard/ventas/${id}`);
  redirect(`/dashboard/ventas/${id}`);
}

export async function markSalePaid(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const id = String(formData.get("id") ?? "");
  const rawDate = formData.get("paymentDate");
  const paymentDate =
    typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? new Date(`${rawDate}T00:00:00.000Z`)
      : new Date();

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/dashboard/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PAID", paymentDate },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó como cobrada la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
    changes: { status: { before: sale.status, after: "PAID" } },
  });

  await setFlash("success", "Venta marcada como cobrada");
  revalidatePath("/dashboard/ventas");
  revalidatePath(`/dashboard/ventas/${id}`);
  redirect(`/dashboard/ventas/${id}`);
}

export async function markSaleConfirming(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/dashboard/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { confirmingAt: new Date() },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}en Confirming.`,
    changes: { confirmingAt: { before: sale.confirmingAt, after: new Date() } },
  });

  await setFlash("success", "Venta marcada como Confirming");
  revalidatePath("/dashboard/ventas");
  revalidatePath(`/dashboard/ventas/${id}`);
  redirect(`/dashboard/ventas/${id}`);
}

export async function clearSaleConfirming(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/dashboard/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { confirmingAt: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Quitó Confirming de la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}.`,
    changes: { confirmingAt: { before: sale.confirmingAt, after: null } },
  });

  await setFlash("success", "Confirming quitado");
  revalidatePath("/dashboard/ventas");
  revalidatePath(`/dashboard/ventas/${id}`);
  redirect(`/dashboard/ventas/${id}`);
}

export async function markSalePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/dashboard/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PENDING", paymentDate: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó como por cobrar la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
    changes: { status: { before: sale.status, after: "PENDING" } },
  });

  await setFlash("success", "Venta marcada como por cobrar");
  revalidatePath("/dashboard/ventas");
  revalidatePath(`/dashboard/ventas/${id}`);
  redirect(`/dashboard/ventas/${id}`);
}

export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/dashboard/ventas/cotizaciones");
  if (sale.documentType !== "QUOTATION") redirect(`/dashboard/ventas/${id}`);

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { documentType: "INVOICE" },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Convirtió la cotización en factura de venta por ${formatCLP(sale.totalAmount)}.`,
    changes: { documentType: { before: "QUOTATION", after: "INVOICE" } },
  });

  await setFlash("success", "Cotización convertida a factura");
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard/ventas/cotizaciones");
  revalidatePath(`/dashboard/ventas/${id}`);
  redirect(`/dashboard/ventas/${id}/editar`);
}
export async function deleteSale(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const id = String(formData.get("id") ?? "");
  if (id) {
    const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
    if (sale) {
      await db.sale.delete({ where: { id, companyId: ctx.company.id } });
      await recordAudit(ctx, {
        action: "DELETE",
        entityType: "Sale",
        entityId: id,
        summary: `Eliminó la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
      });
      await setFlash("success", "Venta eliminada", sale.documentNumber ? `N° ${sale.documentNumber}` : undefined);
    }
  }
  revalidatePath("/dashboard/ventas");
  redirect("/dashboard/ventas");
}

// Cambia el estado de cobro de varias ventas a la vez.
export async function bulkSetSaleStatus(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const rawStatus = String(formData.get("status") ?? "");
  const validStatuses = ["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"] as const;
  const status = validStatuses.find((s) => s === rawStatus) ?? "PENDING";
  if (ids.length === 0) redirect("/dashboard/ventas");

  const result = await db.sale.updateMany({
    where: { id: { in: ids }, companyId: ctx.company.id },
    data: { status, paymentDate: status === "PAID" ? new Date() : null },
  });

  if (result.count > 0) {
    const statusLabels: Record<string, string> = {
      PENDING: "por cobrar",
      PAID: "cobradas",
      PARTIAL: "parciales",
      OVERDUE: "vencidas",
      CANCELLED: "anuladas",
    };
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: "bulk",
      summary: `Marcó ${result.count} ${result.count === 1 ? "venta" : "ventas"} como ${statusLabels[status]}.`,
    });
    await setFlash(
      "success",
      `${result.count} ${result.count === 1 ? "venta actualizada" : "ventas actualizadas"}`,
      `Marcadas como ${statusLabels[status]}.`,
    );
  }
  revalidatePath("/dashboard/ventas");
  redirect("/dashboard/ventas");
}

/**
 * Asigna un vendedor a todas las ventas seleccionadas (masivo).
 * No borra la información existente: solo actualiza salespersonId.
 */
export async function bulkAssignSalesperson(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();

  if (ids.length === 0) {
    await setFlash("error", "No hay ventas seleccionadas.", "Selecciona al menos una venta.");
    redirect("/dashboard/ventas");
  }
  if (!salespersonId) {
    await setFlash("error", "Debes seleccionar un vendedor.");
    redirect("/dashboard/ventas");
  }

  // Validar que el vendedor pertenece a la empresa
  const salesperson = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId: ctx.company.id },
  });
  if (!salesperson) {
    await setFlash("error", "Vendedor no encontrado.");
    redirect("/dashboard/ventas");
  }

  const result = await db.sale.updateMany({
    where: { id: { in: ids }, companyId: ctx.company.id },
    data: { salespersonId },
  });

  if (result.count > 0) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: "bulk",
      summary: `Asignó vendedor ${salesperson.name} a ${result.count} ${result.count === 1 ? "venta" : "ventas"}.`,
    });
    await setFlash(
      "success",
      `${result.count} ${result.count === 1 ? "venta actualizada" : "ventas actualizadas"}`,
      `Vendedor asignado: ${salesperson.name}.`,
    );
  } else {
    await setFlash("error", "Ninguna venta fue actualizada.", "Las ventas ya tenían ese vendedor o no existen.");
  }

  revalidatePath("/dashboard/ventas");
  redirect("/dashboard/ventas");
}

/**
 * Anula una venta asociándola a una nota de crédito/débito del SII o a una razón.
 * Se usa desde el modal de cancelación.
 */
export async function cancelSale(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas");

  const saleId = String(formData.get("saleId") ?? "");
  const cancellationType = String(formData.get("cancellationType") ?? "");
  const cancellationNoteNumber = String(formData.get("cancellationNoteNumber") ?? "").trim();
  const cancellationReason = String(formData.get("cancellationReason") ?? "").trim();
  const cancellationComment = String(formData.get("cancellationComment") ?? "").trim();
  const refacturadaNumber = String(formData.get("refacturadaNumber") ?? "").trim();

  if (!saleId) redirect("/dashboard/ventas");

  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
  });
  if (!sale) redirect("/dashboard/ventas");

  // Si ya tiene una nota asociada, no se puede cambiar
  if (sale.cancellationNoteNumber) {
    await setFlash("error", "Esta venta ya tiene una nota asociada y no se puede modificar.");
    redirect("/dashboard/ventas");
  }

  // Validaciones según el tipo
  if (cancellationType === "CREDIT_NOTE" || cancellationType === "DEBIT_NOTE") {
    if (!cancellationNoteNumber) {
      await setFlash("error", "Debes indicar el número de la nota de crédito o débito.");
      redirect("/dashboard/ventas");
    }
  } else if (cancellationType === "REASON") {
    if (!cancellationReason) {
      await setFlash("error", "Debes indicar la razón de la cancelación.");
      redirect("/dashboard/ventas");
    }
  } else {
    await setFlash("error", "Tipo de cancelación inválido.");
    redirect("/dashboard/ventas");
  }

  await db.sale.update({
    where: { id: saleId },
    data: {
      status: "CANCELLED",
      cancellationType,
      cancellationNoteNumber: cancellationType === "REASON" ? null : cancellationNoteNumber,
      cancellationReason: cancellationType === "REASON" ? cancellationReason : null,
      cancellationComment: cancellationComment || null,
      refacturadaNumber: refacturadaNumber || null,
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: saleId,
    summary: `Anuló la venta ${sale.documentNumber ?? saleId} (${cancellationType === "CREDIT_NOTE" ? "NC" : cancellationType === "DEBIT_NOTE" ? "ND" : "razón"}).`,
  });

  await setFlash("success", "Venta anulada", `Se registró la anulación correctamente.`);
  revalidatePath("/dashboard/ventas");
  redirect("/dashboard/ventas");
}
