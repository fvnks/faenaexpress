import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { daysBetween, formatDate, todayDate } from "@/lib/money";
import { pendingTotals } from "@/lib/reports";

const DUE_SOON_DAYS = 5;
const DUE_TYPES: NotificationType[] = [
  "PURCHASE_DUE_SOON",
  "PURCHASE_OVERDUE",
  "SALE_DUE_SOON",
  "SALE_OVERDUE",
];
const LIMIT_TYPE: NotificationType = "LIMIT_EXCEEDED";

type Alert = {
  type: NotificationType;
  dedupeKey: string;
  title: string;
  message: string;
  href: string;
};

// Recalcula las alertas de vencimiento. Es idempotente: no duplica las que ya
// existen (conserva el estado leído) y borra las que dejaron de aplicar.
export async function syncDueNotifications(companyId: string): Promise<void> {
  const today = todayDate();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { alertDueSoonDays: true, alertPorCobrarLimit: true, alertPorPagarLimit: true, alertReembolsosLimit: true },
  });
  const dueSoonDays = company?.alertDueSoonDays ?? 5;

  const [purchases, sales] = await Promise.all([
    db.purchase.findMany({
      where: { companyId, status: { in: ["PENDING", "PARTIAL"] }, dueDate: { not: null } },
      select: {
        id: true,
        dueDate: true,
        documentNumber: true,
        partner: { select: { name: true } },
      },
    }),
    db.sale.findMany({
      where: { companyId, confirmingAt: null, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, dueDate: { not: null } },
      select: {
        id: true,
        dueDate: true,
        documentNumber: true,
        partner: { select: { name: true } },
      },
    }),
  ]);

  const alerts: Alert[] = [];

  const push = (
    kind: "PURCHASE" | "SALE",
    row: { id: string; dueDate: Date | null; documentNumber: string | null; partner: { name: string } },
  ) => {
    if (!row.dueDate) return;
    const days = daysBetween(today, row.dueDate);
    const overdue = days < 0;
    if (!overdue && days > dueSoonDays) return;

    const type = `${kind}_${overdue ? "OVERDUE" : "DUE_SOON"}` as NotificationType;
    const label = kind === "PURCHASE" ? "compra" : "venta";
    const pending = kind === "PURCHASE" ? "por pagar" : "por cobrar";
    const doc = row.documentNumber ? `N° ${row.documentNumber}` : "documento";
    const due = formatDate(row.dueDate);

    alerts.push({
      type,
      dedupeKey: `${type}:${row.id}`,
      title: overdue
        ? `Vencida: ${row.partner.name}`
        : `Por vencer: ${row.partner.name}`,
      message: overdue
        ? `La ${label} ${doc} venció el ${due} y sigue ${pending} (${Math.abs(days)} días de atraso).`
        : `La ${label} ${doc} vence el ${due} (en ${days} días) y sigue ${pending}.`,
      href: kind === "PURCHASE" ? `/facturas/compras/${row.id}` : `/facturas/ventas/${row.id}`,
    });
  };

  for (const purchase of purchases) push("PURCHASE", purchase);
  for (const sale of sales) push("SALE", sale);

  const keys = alerts.map((alert) => alert.dedupeKey);

  if (alerts.length > 0) {
    await db.notification.createMany({
      data: alerts.map((alert) => ({ companyId, ...alert })),
      skipDuplicates: true,
    });
  }

  await db.notification.deleteMany({
    where: {
      companyId,
      type: { in: DUE_TYPES },
      ...(keys.length > 0 ? { dedupeKey: { notIn: keys } } : {}),
    },
  });

  // --- Alertas por umbrales configurables -------------------------------
  const pending = await pendingTotals(companyId);
  const limitAlerts: Alert[] = [];
  if (company?.alertPorCobrarLimit && pending.porCobrar > company.alertPorCobrarLimit) {
    limitAlerts.push({
      type: LIMIT_TYPE,
      dedupeKey: "LIMIT:POR_COBRAR",
      title: "Por cobrar alto",
      message: `El monto por cobrar (${pending.porCobrar}) supera el límite configurado (${company.alertPorCobrarLimit}).`,
      href: "/facturas/reportes",
    });
  }
  if (company?.alertPorPagarLimit && pending.porPagar > company.alertPorPagarLimit) {
    limitAlerts.push({
      type: LIMIT_TYPE,
      dedupeKey: "LIMIT:POR_PAGAR",
      title: "Por pagar alto",
      message: `El monto por pagar (${pending.porPagar}) supera el límite configurado (${company.alertPorPagarLimit}).`,
      href: "/facturas/reportes",
    });
  }
  if (company?.alertReembolsosLimit && pending.reembolsosPendientes > company.alertReembolsosLimit) {
    limitAlerts.push({
      type: LIMIT_TYPE,
      dedupeKey: "LIMIT:REEMBOLSOS",
      title: "Reembolsos pendientes altos",
      message: `Los reembolsos pendientes (${pending.reembolsosPendientes}) superan el límite configurado (${company.alertReembolsosLimit}).`,
      href: "/facturas/reportes/pagos",
    });
  }

  const limitKeys = limitAlerts.map((a) => a.dedupeKey);
  if (limitAlerts.length > 0) {
    await db.notification.createMany({
      data: limitAlerts.map((alert) => ({ companyId, ...alert })),
      skipDuplicates: true,
    });
  }
  await db.notification.deleteMany({
    where: {
      companyId,
      type: LIMIT_TYPE,
      ...(limitKeys.length > 0 ? { dedupeKey: { notIn: limitKeys } } : {}),
    },
  });
}

export async function listNotifications(companyId: string, limit = 50) {
  return db.notification.findMany({
    where: { companyId },
    orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function countUnreadNotifications(companyId: string): Promise<number> {
  return db.notification.count({ where: { companyId, readAt: null } });
}

export async function markNotificationRead(companyId: string, id: string): Promise<void> {
  await db.notification.updateMany({
    where: { id, companyId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(companyId: string): Promise<void> {
  await db.notification.updateMany({
    where: { companyId, readAt: null },
    data: { readAt: new Date() },
  });
}
