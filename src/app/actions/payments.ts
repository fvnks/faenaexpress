"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP } from "@/lib/money";
import { recomputeStatus, saleSettleTotal, type PaymentKind } from "@/lib/payments";

// Acepta AAAA-MM-DD y DD-MM-AAAA (lo que el normalizador de fechas deja en el
// input). Mismo criterio que las fechas de pago de compras y ventas.
function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
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

function readKind(formData: FormData): PaymentKind {
  return formData.get("kind") === "sale" ? "sale" : "purchase";
}

function documentHref(kind: PaymentKind, id: string): string {
  return kind === "purchase" ? `/facturas/compras/${id}` : `/facturas/ventas/${id}`;
}

function listHref(kind: PaymentKind): string {
  return kind === "purchase" ? "/facturas/compras" : "/facturas/ventas";
}

// Documento al que se abona: se relee dentro de la empresa para no confiar en
// el id del formulario.
async function loadDocument(companyId: string, kind: PaymentKind, id: string) {
  if (kind === "purchase") {
    const purchase = await db.purchase.findFirst({
      where: { id, companyId },
      select: { id: true, totalAmount: true, documentNumber: true, status: true },
    });
    if (!purchase) return null;
    return {
      id: purchase.id,
      documentNumber: purchase.documentNumber,
      total: purchase.totalAmount,
      retention: 0,
      cancelled: false,
    };
  }

  const sale = await db.sale.findFirst({
    where: { id, companyId },
    select: { id: true, totalAmount: true, retentionAmount: true, documentNumber: true, status: true },
  });
  if (!sale) return null;
  return {
    id: sale.id,
    documentNumber: sale.documentNumber,
    total: sale.totalAmount,
    retention: sale.retentionAmount,
    cancelled: sale.status === "CANCELLED",
  };
}

async function paidSoFar(companyId: string, kind: PaymentKind, documentId: string): Promise<number> {
  const aggregate = await db.payment.aggregate({
    where: { companyId, ...(kind === "purchase" ? { purchaseId: documentId } : { saleId: documentId }) },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

export async function registerPayment(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const kind = readKind(formData);
  const documentId = String(formData.get("documentId") ?? "");
  const back = documentId ? documentHref(kind, documentId) : listHref(kind);

  if (!canWrite(ctx, kind === "purchase" ? "compras" : "ventas")) {
    redirect(back);
  }

  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  const wired = normalizeDate(formData.get("date"));
  if (!documentId || !Number.isInteger(amount) || amount <= 0 || !wired) {
    await setFlash("error", "Revisa el monto y la fecha del abono.");
    redirect(back);
  }

  const document = await loadDocument(ctx.company.id, kind, documentId);
  if (!document) redirect(listHref(kind));
  if (document.cancelled) {
    await setFlash("error", "La venta está anulada: no admite abonos.");
    redirect(back);
  }

  const settleTotal =
    kind === "purchase" ? document.total : saleSettleTotal(document.total, document.retention);
  const saldo = Math.max(settleTotal - (await paidSoFar(ctx.company.id, kind, documentId)), 0);
  if (saldo <= 0) {
    await setFlash("error", "El documento ya está saldado.");
    redirect(back);
  }
  if (amount > saldo) {
    await setFlash("error", `El abono supera el saldo pendiente (${formatCLP(saldo)}).`);
    redirect(back);
  }

  const rawMethod = String(formData.get("method") ?? "").trim();
  // El medio de pago es el nombre del catálogo de la empresa.
  const method = rawMethod || null;
  const notes = String(formData.get("notes") ?? "").trim();
  const date = new Date(`${wired}T00:00:00.000Z`);

  await db.payment.create({
    data: {
      companyId: ctx.company.id,
      date,
      amount,
      method,
      notes: notes || null,
      purchaseId: kind === "purchase" ? documentId : null,
      saleId: kind === "sale" ? documentId : null,
      createdById: ctx.user.id,
    },
  });
  await recomputeStatus(ctx.company.id, kind, documentId);

  const folio = document.documentNumber ? ` N° ${document.documentNumber}` : "";
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Payment",
    entityId: documentId,
    summary: `Registró un abono de ${formatCLP(amount)} a la ${
      kind === "purchase" ? "compra" : "venta"
    }${folio}.`,
    changes: { amount: { before: null, after: amount } },
  });

  await setFlash("success", `Abono de ${formatCLP(amount)} registrado`);
  revalidatePath(back);
  revalidatePath(listHref(kind));
  redirect(back);
}

export async function deletePayment(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const kind = readKind(formData);
  const id = String(formData.get("id") ?? "");

  const payment = await db.payment.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, amount: true, purchaseId: true, saleId: true },
  });
  if (!payment) redirect(listHref(kind));

  const documentId = kind === "purchase" ? payment.purchaseId : payment.saleId;
  const back = documentId ? documentHref(kind, documentId) : listHref(kind);

  if (!canWrite(ctx, kind === "purchase" ? "compras" : "ventas")) {
    redirect(back);
  }

  await db.payment.delete({ where: { id: payment.id, companyId: ctx.company.id } });
  if (documentId) await recomputeStatus(ctx.company.id, kind, documentId);

  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "Payment",
    entityId: documentId ?? payment.id,
    summary: `Eliminó un abono de ${formatCLP(payment.amount)}.`,
  });

  await setFlash("success", "Abono eliminado");
  revalidatePath(back);
  revalidatePath(listHref(kind));
  redirect(back);
}
