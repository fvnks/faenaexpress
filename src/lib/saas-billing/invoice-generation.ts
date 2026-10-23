// Generación de facturas mensuales y job de morosidad.
// Estas funciones NO son Server Actions: se llaman desde un cron job o script.

import { db } from "@/lib/db";

/** Genera facturas mensuales para todas las organizaciones con suscripción ACTIVE o TRIAL. */
export async function generateMonthlyInvoices(): Promise<{ created: number; errors: string[] }> {
  const ahora = new Date();
  const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const vencimiento = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 10); // Vence día 10 del mes siguiente

  const suscripciones = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    include: { plan: true, organization: { select: { id: true, name: true } } },
  });

  let creadas = 0;
  const errores: string[] = [];

  for (const sub of suscripciones) {
    if (!sub.plan) {
      errores.push(`Org ${sub.organization.id}: plan no encontrado`);
      continue;
    }
    if (sub.plan.priceCLP === 0) continue; // Plan gratis no genera factura

    // Verifica si ya existe factura para este período
    const existe = await db.platformInvoice.findFirst({
      where: { organizationId: sub.organizationId, period: periodo },
      select: { id: true },
    });
    if (existe) continue;

    const numero = `F-${periodo.replace("-", "")}-${String(creadas + 1).padStart(4, "0")}`;
    const iva = Math.round(sub.plan.priceCLP * 0.19);
    const total = sub.plan.priceCLP + iva;

    try {
      await db.platformInvoice.create({
        data: {
          organizationId: sub.organizationId,
          number: numero,
          period: periodo,
          status: "PENDING",
          amountCLP: sub.plan.priceCLP,
          taxCLP: iva,
          totalCLP: total,
          currency: "CLP",
          description: `Plan ${sub.plan.name} - ${periodo}`,
          dueAt: new Date(vencimiento),
          planCode: sub.plan.code,
          planName: sub.plan.name,
          planPriceCLP: sub.plan.priceCLP,
        },
      });
      creadas++;
    } catch (e) {
      errores.push(`Org ${sub.organizationId}: ${e instanceof Error ? e.message : "Error desconocido"}`);
    }
  }

  return { created: creadas, errors: errores };
}

/**
 * Job de morosidad: marca facturas vencidas y actualiza suscripciones a PAST_DUE.
 * Se ejecuta diariamente (cron).
 */
export async function runOverdueJob(): Promise<{ updated: number; notifications: number }> {
  const ahora = new Date();

  // Facturas vencidas que estaban PENDING/PARTIAL
  const vencidas = await db.platformInvoice.updateMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueAt: { lt: ahora },
    },
    data: { status: "OVERDUE" },
  });

  // Suscripciones a PAST_DUE si tienen facturas OVERDUE
  const orgsConVencidas = await db.platformInvoice.findMany({
    where: { status: "OVERDUE" },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  let notificaciones = 0;
  for (const { organizationId } of orgsConVencidas) {
    const sub = await db.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (sub && sub.status === "ACTIVE") {
      await db.subscription.update({
        where: { organizationId },
        data: { status: "PAST_DUE" },
      });
      notificaciones++;
      // TODO: enviar email/notificación al OWNER de la organización
    }
  }

  return { updated: vencidas.count, notifications: notificaciones };
}

/** Verifica si una organización está morosa (tiene facturas OVERDUE o suscripción PAST_DUE). */
export async function isOrganizationMorosa(organizationId: string): Promise<boolean> {
  const facturasVencidas = await db.platformInvoice.findFirst({
    where: { organizationId, status: "OVERDUE" },
    select: { id: true },
  });
  if (facturasVencidas) return true;

  const sub = await db.subscription.findFirst({
    where: { organizationId, status: "PAST_DUE" },
    select: { id: true },
  });
  return !!sub;
}