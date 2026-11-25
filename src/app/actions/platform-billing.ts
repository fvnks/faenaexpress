"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePlatformStaff } from "@/lib/platform";
import { recordPlatformAudit } from "@/lib/platform-audit";
import { generateMonthlyInvoices, runOverdueJob } from "@/lib/saas-billing/invoice-generation";
import type { BillingActionState as SaasBillingActionState } from "./saas-billing";

export type BillingActionState = SaasBillingActionState;

/** Confirma un pago manual desde la consola (el cliente no puede hacerlo). */
export async function confirmPlatformPayment(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const providerRef = String(formData.get("providerRef") ?? "").trim();
  const amountRaw = String(formData.get("amountCLP") ?? "").replace(/[^\d.-]/g, "");
  const amount = Number(amountRaw);

  if (!invoiceId || !providerRef) return { error: "Faltan la factura y la referencia del pago." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Ingresa un monto válido." };

  const invoice = await db.platformInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true, number: true, organizationId: true, totalCLP: true,
      status: true, paidAt: true,
    },
  });
  if (!invoice) return { error: "La factura no existe." };
  if (invoice.status === "PAID" || invoice.status === "VOID") {
    return { error: "Esa factura ya está saldada o anulada." };
  }

  const completados = await db.platformPayment.aggregate({
    where: { invoiceId, status: "COMPLETED" },
    _sum: { amountCLP: true },
  });
  const yaPagado = completados._sum.amountCLP ?? 0;
  const estado = yaPagado + amount >= invoice.totalCLP ? "PAID" : "PARTIAL";

  await db.$transaction(async (tx) => {
    await tx.platformPayment.create({
      data: {
        invoiceId,
        organizationId: invoice.organizationId,
        provider: "MANUAL",
        providerRef,
        amountCLP: amount,
        currency: "CLP",
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });
    await tx.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        status: estado,
        ...(estado === "PAID" ? { paidAt: new Date() } : {}),
      },
    });
  });

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "PlatformInvoice",
    entityId: invoiceId,
    organizationId: invoice.organizationId,
    summary: `Confirmó el pago manual de ${invoice.number} por $${amount.toLocaleString("es-CL")} (${estado}).`,
    changes: { status: { before: invoice.status, after: estado } },
  });

  revalidatePath("/admin/facturacion");
  revalidatePath("/admin");
  revalidatePath("/billing");
  return { ok: true };
}

/** Genera las facturas del mes y marca las vencidas, desde la consola. */
export async function runPlatformBillingJobs(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");
  const tarea = String(formData.get("tarea") ?? "");
  if (tarea !== "facturas" && tarea !== "vencidas") {
    return { error: "Tarea no válida." };
  }

  let resumen = "";
  if (tarea === "facturas") {
    const resultado = await generateMonthlyInvoices();
    resumen = `Generó ${resultado.created} facturas del mes${resultado.errors.length > 0 ? ` (${resultado.errors.length} errores)` : ""}.`;
  } else {
    const resultado = await runOverdueJob();
    resumen = `Marcó ${resultado.updated} facturas vencidas.`;
  }

  await recordPlatformAudit(ctx, {
    action: "IMPORT",
    entityType: "PlatformInvoice",
    summary: resumen,
  });

  revalidatePath("/admin/facturacion");
  revalidatePath("/admin");
  revalidatePath("/billing");
  return { ok: true };
}
