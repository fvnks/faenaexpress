import { db } from "@/lib/db";
import { formatRut, normalizeRut } from "@/lib/rut";
import type { RemunerationType } from "@/generated/prisma/client";

/**
 * Guardas de RUT entre RRHH y terceros: un trabajador no debe aparecer como
 * cliente o proveedor (su RUT no debe entrar a los libros de compra/venta).
 * Los RUT se comparan normalizados porque históricamente se guardan con y
 * sin puntos.
 */
export async function workerRutExists(companyId: string, rut: string): Promise<boolean> {
  const target = normalizeRut(rut);
  const workers = await db.worker.findMany({
    where: { companyId, rut: { not: null } },
    select: { rut: true },
  });
  return workers.some((worker) => normalizeRut(worker.rut!) === target);
}

export async function partnerRutExists(companyId: string, rut: string): Promise<boolean> {
  const target = normalizeRut(rut);
  const partners = await db.partner.findMany({
    where: { companyId, rut: { not: null } },
    select: { rut: true },
  });
  return partners.some((partner) => normalizeRut(partner.rut!) === target);
}

export type WorkerWithTotals = {
  id: string;
  name: string;
  rut: string | null;
  active: boolean;
  yearTotal: number;
  lastPayment: Date | null;
};

/** Trabajadores con el total pagado en el año en curso y su último pago. */
export async function listWorkersWithTotals(companyId: string): Promise<WorkerWithTotals[]> {
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

  const workers = await db.worker.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      remunerations: {
        where: { date: { gte: yearStart } },
        orderBy: { date: "desc" },
        select: { amount: true, date: true },
      },
    },
  });

  return workers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    rut: worker.rut ? formatRut(normalizeRut(worker.rut)) : null,
    active: worker.active,
    yearTotal: worker.remunerations.reduce((acc, rem) => acc + rem.amount, 0),
    lastPayment: worker.remunerations[0]?.date ?? null,
  }));
}

export type RrhhFilters = {
  workerId?: string;
  paidById?: string;
  type?: RemunerationType;
  period?: string;
  from?: Date;
  to?: Date;
};

/** Últimas remuneraciones registradas (con trabajador y pagador), con filtros opcionales. */
export async function listRemunerations(
  companyId: string,
  filters: RrhhFilters = {},
  take = 500,
) {
  return db.remuneration.findMany({
    where: {
      companyId,
      ...(filters.workerId ? { workerId: filters.workerId } : {}),
      ...(filters.paidById ? { paidById: filters.paidById } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.period ? { period: filters.period } : {}),
      ...(filters.from || filters.to
        ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    orderBy: { date: "desc" },
    take,
    include: {
      worker: { select: { name: true } },
      paidBy: { select: { name: true } },
    },
  });
}

/** Total pagado a todo el personal en el año en curso. */
export async function rrhhYearTotal(companyId: string) {
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const result = await db.remuneration.aggregate({
    where: { companyId, date: { gte: yearStart } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
