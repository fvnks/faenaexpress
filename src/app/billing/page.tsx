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
 * Visible para OWNER y ADMIN. Muestra:
 * - Plan actual y estado de suscripción
 * - Facturas (pendientes, pagadas, vencidas)
 * - Métodos de pago guardados
 * - Botón para pagar facturas pendientes
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facturación SaaS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tu plan, facturas y métodos de pago de Yellow ERP.
        </p>
      </div>

      {/* Plan actual */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Plan actual</h2>
        <BillingPlan subscription={subscription} />
      </section>

      {/* Pagar facturas */}
      <section className={cardClass + " p-5"}>
        <PayInvoice payableInvoices={payableInvoices} />
      </section>

      {/* Facturas */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Facturas</h2>
        <div className="mt-4">
          <BillingInvoices invoices={invoicesFormatted} />
        </div>
      </section>

      {/* Métodos de pago */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Métodos de pago guardados</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Guarda tarjetas o cuentas para pagos rápidos. Los pagos manuales (transferencia) se
          confirman manualmente por el equipo de Yellow ERP.
        </p>
        <div className="mt-4">
          <BillingPaymentMethods methods={paymentMethods} />
        </div>
      </section>
    </div>
  );
}