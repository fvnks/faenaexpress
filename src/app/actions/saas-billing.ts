// Acciones de facturación SaaS (Server Actions).
// Se usan desde el UI para crear pagos, verificar pagos y generar facturas.
//
"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireOrgManager } from "@/lib/auth";
import { getPaymentProvider, getDefaultProvider, isProviderConfigured, type PaymentProviderName } from "@/lib/saas-billing/providers";

export type BillingActionState =
  | { error?: string; ok?: boolean; url?: string; providerRef?: string }
  | undefined;

/** Crea una intención de pago para una factura. */
export async function createInvoicePayment(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requireOrgManager();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const providerNameParam = String(formData.get("provider") ?? "").trim();

  if (!invoiceId) return { error: "Falta la factura." };

  const invoice = await db.platformInvoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organization.id },
    select: {
      id: true,
      totalCLP: true,
      currency: true,
      description: true,
      planCode: true,
      planName: true,
      status: true,
      organizationId: true,
    },
  });
  if (!invoice) return { error: "Factura no encontrada." };
  if (invoice.status === "PAID") return { error: "Esta factura ya está pagada." };
  if (invoice.status === "VOID") return { error: "Esta factura está anulada." };

  // Determina proveedor
  let providerName: PaymentProviderName = providerNameParam as PaymentProviderName;
  if (!providerName) {
    providerName = await getDefaultProvider();
  }

  // Verifica que el proveedor esté configurado
  if (!(await isProviderConfigured(providerName))) {
    return { error: `El proveedor ${providerName} no está configurado.` };
  }

  const provider = await getPaymentProvider(providerName);

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing?paid=${invoice.id}`;

  const intent = await provider.createPayment({
    amountCLP: invoice.totalCLP,
    description: invoice.description,
    returnUrl,
    metadata: {
      invoiceId: invoice.id,
      organizationId: ctx.organization.id,
      planCode: invoice.planCode,
      planName: invoice.planName,
    },
  });

  // Crea registro de pago en PENDING
  await db.platformPayment.create({
    data: {
      invoiceId: invoice.id,
      organizationId: ctx.organization.id,
      provider: provider.name,
      providerRef: intent.providerRef,
      amountCLP: intent.amountCLP,
      currency: intent.currency,
      status: "PENDING",
      providerData: JSON.stringify(intent.metadata ?? {}),
    },
  });

  revalidatePath("/billing");

  if (provider.requiresRedirect && intent.paymentUrl) {
    return { ok: true, url: intent.paymentUrl, providerRef: intent.providerRef };
  }

  return { ok: true, providerRef: intent.providerRef };
}

/** Verifica el estado de un pago y actualiza la factura. */
export async function verifyInvoicePayment(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requireOrgManager();

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  if (!paymentId) return { error: "Falta el ID del pago." };

  const payment = await db.platformPayment.findFirst({
    where: { id: paymentId, organizationId: ctx.organization.id },
    include: { invoice: true },
  });
  if (!payment) return { error: "Pago no encontrado." };

  // Obtiene el proveedor
  const provider = await getPaymentProvider(payment.provider);

  // Verifica en el proveedor
  const verification = await provider.verifyPayment(payment.providerRef!);

  // Actualiza el pago
  await db.platformPayment.update({
    where: { id: payment.id },
    data: {
      status: verification.status,
      paidAt: verification.status === "COMPLETED" ? new Date() : null,
      providerData: JSON.stringify(verification.rawData ?? {}),
    },
  });

  // Si el pago se completó, actualiza factura
  if (verification.status === "COMPLETED") {
    const invoice = await db.platformInvoice.findUnique({
      where: { id: payment.invoiceId },
      select: { totalCLP: true, status: true },
    });

    if (invoice && invoice.status !== "PAID") {
      const pagadoTotal = await db.platformPayment.aggregate({
        where: { invoiceId: payment.invoiceId, status: "COMPLETED" },
        _sum: { amountCLP: true },
      });

      const totalPagado = pagadoTotal._sum.amountCLP ?? 0;
      const nuevoStatus = totalPagado >= invoice.totalCLP ? "PAID" : "PARTIAL";

      await db.platformInvoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: nuevoStatus,
          paidAt: nuevoStatus === "PAID" ? new Date() : null,
        },
      });
    }
  }

  revalidatePath("/billing");
  return { ok: true };
}

/** Paga una factura con método MANUAL (confirmación administrativa). */
export async function confirmManualPayment(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const ctx = await requireOrgManager();
  if (ctx.orgRole !== "OWNER" && ctx.orgRole !== "ADMIN") {
    return { error: "Solo OWNER y ADMIN pueden confirmar pagos manuales." };
  }

  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const providerRef = String(formData.get("providerRef") ?? "").trim();
  const amountCLP = Number(formData.get("amountCLP") ?? 0);

  if (!invoiceId || !providerRef || !amountCLP) {
    return { error: "Faltan datos obligatorios." };
  }

  const invoice = await db.platformInvoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organization.id },
  });
  if (!invoice) return { error: "Factura no encontrada." };

  await db.$transaction([
    db.platformPayment.create({
      data: {
        invoiceId,
        organizationId: ctx.organization.id,
        provider: "MANUAL",
        providerRef,
        amountCLP,
        currency: "CLP",
        status: "COMPLETED",
        paidAt: new Date(),
        providerData: JSON.stringify({ confirmedBy: ctx.user.id, confirmedAt: new Date().toISOString() }),
      },
    }),
    db.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/billing");
  return { ok: true };
}