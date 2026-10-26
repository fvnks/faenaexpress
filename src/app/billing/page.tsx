import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireOrgManager } from "@/lib/auth";
import { subscriptionState } from "@/lib/plans";
import { cardClass } from "@/lib/ui";
import { BillingInvoices } from "@/app/billing/invoices";
import { BillingPlan } from "@/app/billing/plan";
import { BillingPaymentMethods } from "@/app/billing/payment-methods";
import { PayInvoice } from "@/app/billing/pay-invoice";

/**
 * Portal de facturación SaaS para la organización.
 *
 * Accesible para OWNER y ADMIN. Muestra:
 * - Plan actual y estado de suscripción
 * - Facturas (pendientes, pagadas, vencidas)
 * - Botón para pagar facturas pendientes
 * - Métodos de pago guardados
 */
export default async function BillingPage() {
  const ctx = await requireOrgManager();
  const orgId = ctx.organization.id;

  const [subscription, invoices, paymentMethods] = await Promise.all([
    subscriptionState(orgId),
    db.platformInvoice.findMany({
      where: { organizationId: orgId },
      orderBy: { period: "desc" },
      take: 24,
      select: {
        id: true,
        number: true,
        period: true,
        status: true,
        totalCLP: true,
        dueAt: true,
        paidAt: true,
      },
    }),
    db.platformPaymentMethod.findMany({
      where: { organizationId: orgId, active: true },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  const invoicesFormatted = invoices.map((i) => ({
    id: i.id,
    number: i.number,
    period: i.period,
    status: i.status,
    totalCLP: i.totalCLP,
    dueAt: i.dueAt.toISOString(),
    paidAt: i.paidAt?.toISOString() ?? null,
  }));

  const payableInvoices = invoicesFormatted.filter(
    (i) => i.status === "PENDING" || i.status === "OVERDUE" || i.status === "PARTIAL",
  );

  const hasOverdue = invoices.some((i) => i.status === "OVERDUE");
  const hasPending = invoices.some((i) => i.status === "PENDING");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <h1 className="text-2xl font-bold tracking-tight">Facturación SaaS</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestiona tu plan, facturas y métodos de pago de Yellow ERP.
        </p>
      </div>

      {/* Estado de suscripción */}
      <section className={cardClass + " p-6"}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Plan actual</p>
            <h2 className="text-lg font-semibold">
              {subscription.plan?.name ?? "Sin plan"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {subscription.plan
                ? `${subscription.plan.priceCLP.toLocaleString("es-CL")} CLP / ${subscription.plan.period === "YEARLY" ? "año" : "mes"}`
                : "—"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Estado</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              subscription.status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : subscription.status === "TRIAL"
                ? "bg-blue-100 text-blue-700"
                : subscription.status === "PAST_DUE"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-700"
            }`}>
              {subscription.status === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>}
              {subscription.status === "PAST_DUE" && <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>}
              {subscription.status}
            </span>
          </div>

          {hasOverdue && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Estado de pagos</p>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                Facturas vencidas
              </span>
            </div>
          )}
          {hasPending && !hasOverdue && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Estado de pagos</p>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                Pendientes de pago
              </span>
            </div>
          )}
        </div>

        {subscription.warning && (
          <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
            <p className="text-sm">{subscription.warning}</p>
          </div>
        )}
      </section>

      {/* Pagar facturas pendientes */}
      {payableInvoices.length > 0 && (
        <section className={cardClass + " p-6"}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pagar facturas pendientes</h2>
            <PayInvoice payableInvoices={payableInvoices} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {payableInvoices.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{inv.number}</span>
                  <span className="text-xs tabular font-bold">{formatCLP(inv.totalCLP)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inv.period} · {formatDate(inv.dueAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Facturas */}
      <section className={cardClass + " p-6"}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Facturas</h2>
        </div>
        <div className="mt-4">
          <BillingInvoices invoices={invoicesFormatted} />
        </div>
      </section>

      {/* Métodos de pago */}
      <section className={cardClass + " p-6"}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Métodos de pago</h2>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground mb-4">
          Guarda tarjetas o cuentas para pagos rápidos. Los pagos manuales (transferencia)
          se confirman manualmente por el equipo de Yellow ERP.
        </p>
        <div className="mt-4">
          <BillingPaymentMethods methods={paymentMethods} />
        </div>
      </section>
    </div>
  );
}

function formatCLP(valor: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(valor);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}