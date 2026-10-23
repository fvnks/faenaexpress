// Planes, suscripciones y uso.
//
// Tres piezas que no se mezclan:
//
//   Plan          el CATÁLOGO: lo que vendes (Free, Pro, Business).
//   Subscription  lo que una cuenta tiene contratado.
//   UsageRecord   el consumo del período en curso, como contador.
//
// El enforcement vive en la Server Action, no en la interfaz: si el límite se
// comprueba en el botón, un POST directo lo salta.
//
// El mensaje de bloqueo importa (es donde se pierde o se gana un cliente):
// «Llegaste a los 50 documentos del mes en el plan Free. Tus documentos no se
// perdieron; pasa a Pro para seguir registrando este mes.»

import { db } from "@/lib/db";
import { currentPeriod } from "@/lib/money";
import { isOrganizationMorosa } from "@/lib/saas-billing/invoice-generation";

export type PlanLimits = {
  maxCompanies: number | null;
  maxUsers: number | null;
  maxDocsPerMonth: number | null;
};

export type LimitKind = "documents" | "users" | "companies";

/** Todos los planes del catálogo, con las cuentas que los tienen contratados. */
export async function listPlans() {
  const plans = await db.plan.findMany({
    orderBy: [{ active: "desc" }, { priceCLP: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { subscriptions: true } },
    },
  });
  return plans;
}

/** La suscripción de una organización, con su plan. */
export async function subscriptionFor(organizationId: string) {
  return db.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
}

/**
 * Consumo del período en curso. Si no hay registro todavía, se crea en cero
 * (así el contador y el plan nunca se contradicen).
 */
export async function usageFor(organizationId: string, period = currentPeriod()) {
  const existing = await db.usageRecord.findUnique({
    where: { organizationId_period: { organizationId, period } },
  });
  if (existing) return existing;

  return db.usageRecord.upsert({
    where: { organizationId_period: { organizationId, period } },
    update: {},
    create: { organizationId, period },
  });
}

/** Suma al contador del período. */
export async function incrementUsage(
  organizationId: string,
  delta: { documents?: number; users?: number; bankSyncs?: number },
  period = currentPeriod(),
): Promise<void> {
  await db.usageRecord.upsert({
    where: { organizationId_period: { organizationId, period } },
    update: {
      documentsCreated: { increment: delta.documents ?? 0 },
      activeUsers: { increment: delta.users ?? 0 },
      bankSyncs: { increment: delta.bankSyncs ?? 0 },
      computedAt: new Date(),
    },
    create: {
      organizationId,
      period,
      documentsCreated: delta.documents ?? 0,
      activeUsers: delta.users ?? 0,
      bankSyncs: delta.bankSyncs ?? 0,
    },
  });
}

/**
 * Recalcula el uso real desde los datos (conteos de verdad). El contador se
 * lleva al día al crear, pero se puede desviar: una eliminación, una importación
 * o un cambio de período. La consola lo puede rehacer cuando haga falta.
 */
export async function recomputeUsage(organizationId: string, period = currentPeriod()) {
  const companies = await db.company.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  if (companyIds.length === 0) {
    return usageFor(organizationId, period);
  }

  const desde = new Date(`${period}-01T00:00:00.000Z`);
  const hasta = new Date(`${period}-01T00:00:00.000Z`);
  hasta.setUTCMonth(hasta.getUTCMonth() + 1);

  const [ventas, compras, gastos, miembros, syncs] = await Promise.all([
    db.sale.count({ where: { companyId: { in: companyIds }, createdAt: { gte: desde, lt: hasta } } }),
    db.purchase.count({ where: { companyId: { in: companyIds }, createdAt: { gte: desde, lt: hasta } } }),
    db.expense.count({ where: { companyId: { in: companyIds }, createdAt: { gte: desde, lt: hasta } } }),
    db.membership.count({
      where: { companyId: { in: companyIds }, active: true, user: { active: true } },
    }),
    db.bankSync.count({ where: { companyId: { in: companyIds }, startedAt: { gte: desde, lt: hasta } } }),
  ]);

  return db.usageRecord.upsert({
    where: { organizationId_period: { organizationId, period } },
    update: {
      documentsCreated: ventas + compras + gastos,
      activeUsers: miembros,
      bankSyncs: syncs,
      computedAt: new Date(),
    },
    create: {
      organizationId,
      period,
      documentsCreated: ventas + compras + gastos,
      activeUsers: miembros,
      bankSyncs: syncs,
    },
  });
}

/**
 * El corte: ¿esta organización puede crear un documento, un usuario o una
 * empresa más? Devuelve el mensaje si no puede, o `null` si puede.
 *
 * Sin suscripción o sin plan: no hay corte (la maqueta no bloquea a nadie).
 */
export async function checkPlanLimit(
  organizationId: string | null,
  kind: LimitKind,
): Promise<string | null> {
  if (!organizationId) return null;

  // Morosidad: si hay facturas vencidas o suscripción PAST_DUE, se bloquea todo
  const morosa = await isOrganizationMorosa(organizationId);
  if (morosa) {
    return "Tu organización tiene facturas vencidas. Regulariza el pago para seguir usando la plataforma.";
  }

  const subscription = await subscriptionFor(organizationId);
  if (!subscription) return null;

  const plan = subscription.plan;
  const usage = await usageFor(organizationId);

  if (kind === "documents") {
    if (plan.maxDocsPerMonth === null) return null;
    if (usage.documentsCreated < plan.maxDocsPerMonth) return null;
    return `Llegaste al límite de ${plan.maxDocsPerMonth} documentos del mes en el plan ${plan.name}. Tus documentos no se perdieron; cambia de plan para seguir registrando este mes.`;
  }

  if (kind === "users") {
    if (plan.maxUsers === null) return null;
    if (usage.activeUsers < plan.maxUsers) return null;
    return `Llegaste al límite de ${plan.maxUsers} usuarios en el plan ${plan.name}. Los que ya están no se pueden borrar; cambia de plan para sumar más.`;
  }

  if (plan.maxCompanies === null) return null;
  const companies = await db.company.count({ where: { organizationId } });
  if (companies < plan.maxCompanies) return null;
  return `Llegaste al límite de ${plan.maxCompanies} empresas en el plan ${plan.name}. Cambia de plan para agregar más.`;
}

/** ¿La cuenta está al día con su plan? (para los avisos en la app) */
export async function subscriptionState(organizationId: string | null) {
  if (!organizationId) return { status: "ACTIVE" as const, plan: null, warning: null as string | null };

  const subscription = await subscriptionFor(organizationId);
  if (!subscription) return { status: "ACTIVE" as const, plan: null, warning: null as string | null };

  const { plan, status } = subscription;

  if (status === "TRIAL" && subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
    return {
      status,
      plan,
      warning: `Tu prueba del plan ${plan.name} terminó. Tus datos se conservan; escríbenos para continuar.`,
    };
  }
  if (status === "PAST_DUE") {
    return {
      status,
      plan,
      warning: `El plan ${plan.name} tiene una factura pendiente. Tus datos se conservan; regularízala para no perder acceso.`,
    };
  }
  if (status === "CANCELED") {
    return {
      status,
      plan,
      warning: `El plan ${plan.name} está cancelado. Tus datos se conservan por si vuelves.`,
    };
  }
  return { status, plan, warning: null };
}
