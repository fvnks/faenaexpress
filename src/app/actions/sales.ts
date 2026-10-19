"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { computeTotal, formatCLP, todayDate } from "@/lib/money";
import { recomputeStatus } from "@/lib/payments";
import { safeReturnTo } from "@/lib/return-to";
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
    confirmingAt: formData.get("confirmingAt"),
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
    paymentDate: paid ? input.paymentDate : null,
    paymentMethod: null,
    confirmingAt: input.confirmingAt ?? null,
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
  if (!data.salespersonId) {
    const partner = await db.partner.findFirst({
      where: { id: parsed.data.partnerId, companyId: ctx.company.id },
      select: { salespersonId: true },
    });
    if (partner?.salespersonId) data.salespersonId = partner.salespersonId;
  }
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
  revalidatePath("/facturas/ventas");
  revalidatePath("/facturas");
  redirect("/facturas/ventas");
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

  // Si la venta tiene abonos, el estado se deriva de ellos: el formulario no
  // puede pisarlo (el selector solo ofrece por cobrar/cobrada).
  const abonos = await db.payment.count({ where: { companyId: ctx.company.id, saleId: id } });
  if (abonos > 0) await recomputeStatus(ctx.company.id, "sale", id);

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Editó una ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Venta actualizada", describe(data));
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
  redirect(`/facturas/ventas/${id}`);
}

function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\//g, "-");
  let match = /^\d{4}-\d{2}-\d{2}$/.exec(cleaned);
  if (match) return cleaned;
  match = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3] ?? String(new Date().getFullYear());
  const iso = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export async function markSalePaid(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const rawDate = formData.get("paymentDate");
  const wired = normalizeDateInput(rawDate);
  if (!wired) return;
  const paymentDate = new Date(`${wired}T00:00:00.000Z`);

  const rawSalespersonId = formData.get("salespersonId");
  const salespersonId = typeof rawSalespersonId === "string" ? rawSalespersonId.trim() : null;
  if (salespersonId) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonId, companyId: ctx.company.id },
    });
    if (!salesperson) redirect("/facturas/ventas");
  }

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  if ((await db.payment.count({ where: { companyId: ctx.company.id, saleId: id } })) > 0) {
    await setFlash("error", "Esta venta tiene abonos: administra el cobro desde su panel de abonos.");
    redirect(`/facturas/ventas/${id}`);
  }

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: {
      status: "PAID",
      paymentDate,
      ...(rawSalespersonId !== null ? { salespersonId: salespersonId || null } : {}),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó como cobrada la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
    changes: { status: { before: sale.status, after: "PAID" } },
  });

  await setFlash("success", "Venta marcada como cobrada");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function markSaleConfirming(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const rawDate = formData.get("confirmingDate") ?? formData.get("confirmingAt");
  const wired = normalizeDateInput(rawDate);
  if (!wired) return;
  const confirmingDate = new Date(`${wired}T00:00:00.000Z`);

  const rawSalespersonId = formData.get("salespersonId");
  const salespersonId = typeof rawSalespersonId === "string" ? rawSalespersonId.trim() : null;
  if (salespersonId) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonId, companyId: ctx.company.id },
    });
    if (!salesperson) redirect("/facturas/ventas");
  }

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: {
      confirmingAt: confirmingDate,
      ...(rawSalespersonId !== null ? { salespersonId: salespersonId || null } : {}),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}en Confirming.`,
    changes: { confirmingAt: { before: sale.confirmingAt, after: new Date() } },
  });

  await setFlash("success", "Venta marcada como Confirming");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function clearSaleConfirming(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

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
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function markSalePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  if ((await db.payment.count({ where: { companyId: ctx.company.id, saleId: id } })) > 0) {
    await setFlash("error", "Esta venta tiene abonos: administra el cobro desde su panel de abonos.");
    redirect(`/facturas/ventas/${id}`);
  }

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
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas/cotizaciones");
  if (sale.documentType !== "QUOTATION") redirect(`/facturas/ventas/${id}`);

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
  revalidatePath("/facturas/ventas");
  revalidatePath("/facturas/ventas/cotizaciones");
  revalidatePath(`/facturas/ventas/${id}`);
  redirect(`/facturas/ventas/${id}/editar`);
}
export async function deleteSale(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

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
  revalidatePath("/facturas/ventas");
  redirect("/facturas/ventas");
}

// Cambia el estado de cobro de varias ventas a la vez.
export async function bulkSetSaleStatus(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const rawStatus = String(formData.get("status") ?? "");
  const validStatuses = ["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"] as const;
  const status = validStatuses.find((s) => s === rawStatus) ?? "PENDING";
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/ventas");
  if (ids.length === 0) redirect(returnTo);

  const result = await db.sale.updateMany({
    // Las ventas con abonos quedan fuera: su estado se deriva de los abonos.
    where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
    // Fecha de cobro = día de Chile (medianoche UTC), no la hora exacta del
    // navegador: el dominio guarda días de calendario.
    data: { status, paymentDate: status === "PAID" ? todayDate() : null },
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
  revalidatePath("/facturas/ventas");
  redirect(returnTo);
}

/**
 * Asigna un vendedor a todas las ventas seleccionadas (masivo).
 * No borra la información existente: solo actualiza salespersonId.
 */
export async function bulkAssignSalesperson(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/ventas");
  if (!canWrite(ctx, "ventas")) redirect(returnTo);

  const ids = formData
    .getAll("ids")
    // El formulario manda un `ids` por fila marcada; el formato viejo venía
    // unido por comas. Se aceptan los dos.
    .flatMap((value) => String(value).split(","))
    .map((id) => id.trim())
    .filter(Boolean);
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();

  if (ids.length === 0) {
    await setFlash("error", "No hay ventas seleccionadas.", "Selecciona al menos una venta.");
    redirect(returnTo);
  }
  if (!salespersonId) {
    await setFlash("error", "Debes seleccionar un vendedor.");
    redirect(returnTo);
  }

  // Validar que el vendedor pertenece a la empresa
  const salesperson = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId: ctx.company.id },
  });
  if (!salesperson) {
    await setFlash("error", "Vendedor no encontrado.");
    redirect(returnTo);
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

  revalidatePath("/facturas/ventas");
  redirect(returnTo);
}

/**
 * Anula una venta asociándola a una nota de crédito/débito del SII o a una razón.
 * Se usa desde el modal de cancelación.
 */
export async function cancelSale(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const saleId = String(formData.get("saleId") ?? "");
  const cancellationType = String(formData.get("cancellationType") ?? "");
  const cancellationNoteNumber = String(formData.get("cancellationNoteNumber") ?? "").trim();
  const cancellationReason = String(formData.get("cancellationReason") ?? "").trim();
  const cancellationComment = String(formData.get("cancellationComment") ?? "").trim();
  const refacturadaNumber = String(formData.get("refacturadaNumber") ?? "").trim();

  if (!saleId) redirect("/facturas/ventas");

  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
  });
  if (!sale) redirect("/facturas/ventas");

  // Si ya tiene una nota asociada, no se puede cambiar
  if (sale.cancellationNoteNumber) {
    await setFlash("error", "Esta venta ya tiene una nota asociada y no se puede modificar.");
    redirect("/facturas/ventas");
  }

  // Validaciones según el tipo
  if (cancellationType === "CREDIT_NOTE" || cancellationType === "DEBIT_NOTE") {
    if (!cancellationNoteNumber) {
      await setFlash("error", "Debes indicar el número de la nota de crédito o débito.");
      redirect("/facturas/ventas");
    }
  } else if (cancellationType === "REASON") {
    if (!cancellationReason) {
      await setFlash("error", "Debes indicar la razón de la cancelación.");
      redirect("/facturas/ventas");
    }
  } else {
    await setFlash("error", "Tipo de cancelación inválido.");
    redirect("/facturas/ventas");
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
  revalidatePath("/facturas/ventas");
  redirect("/facturas/ventas");
}

export async function assignSaleSalesperson(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "").trim();
  const salespersonIdRaw = String(formData.get("salespersonId") ?? "").trim();
  if (!id) redirect("/facturas/ventas");

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  if (salespersonIdRaw) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonIdRaw, companyId: ctx.company.id },
    });
    if (!salesperson) redirect("/facturas/ventas");
    await db.sale.update({ where: { id, companyId: ctx.company.id }, data: { salespersonId: salespersonIdRaw } });
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: id,
      summary: `Asignó vendedor ${salesperson.name} a la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}.`,
    });
  } else {
    await db.sale.update({ where: { id, companyId: ctx.company.id }, data: { salespersonId: null } });
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: id,
      summary: `Quitó el vendedor de la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}.`,
    });
  }

  await setFlash("success", "Vendedor actualizado.");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

