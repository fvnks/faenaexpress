import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/money";

export type ExpenseFilters = {
  q: string;
  categoryId?: string;
  paidById?: string;
  workerId?: string;
  reimbursed: "ALL" | "yes" | "no";
  from?: Date;
  to?: Date;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
};

export const EXPENSE_SORT_KEYS = ["fecha", "descripcion", "pagador", "reembolso", "total"] as const;
const PAGE_SIZE = 50;

export function parseExpenseFilters(searchParams: {
  q?: string;
  categoria?: string;
  pagador?: string;
  trabajador?: string;
  reembolso?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  dir?: string;
  pagina?: string;
}): ExpenseFilters {
  const reimbursed: ExpenseFilters["reimbursed"] =
    searchParams.reembolso === "si" ? "yes" : searchParams.reembolso === "no" ? "no" : "ALL";

  return {
    q: (searchParams.q ?? "").trim(),
    categoryId: searchParams.categoria || undefined,
    paidById: searchParams.pagador || undefined,
    workerId: searchParams.trabajador || undefined,
    reimbursed,
    from: searchParams.desde ? new Date(`${searchParams.desde}T00:00:00.000Z`) : undefined,
    to: searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59.999Z`) : undefined,
    sort: searchParams.orden,
    dir: searchParams.dir === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(searchParams.pagina) || 1),
  };
}

function buildWhere(companyId: string, filters: ExpenseFilters): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { companyId };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.paidById) where.paidById = filters.paidById;
  if (filters.workerId) where.workerId = filters.workerId;
  if (filters.reimbursed !== "ALL") where.reimbursed = filters.reimbursed === "yes";

  if (filters.q) {
    where.OR = [
      { description: { contains: filters.q, mode: "insensitive" } },
      { documentNumber: { contains: filters.q, mode: "insensitive" } },
      { paidBy: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  return where;
}

export async function listExpenses(companyId: string, filters: ExpenseFilters) {
  const where = buildWhere(companyId, filters);

  const orderBy = (() => {
    const dir = filters.dir ?? "desc";
    switch (filters.sort) {
      case "descripcion": return { description: dir } as const;
      case "pagador": return { paidBy: { name: dir } } as const;
      case "reembolso": return { reimbursed: dir } as const;
      case "total": return { totalAmount: dir } as const;
      default: return { date: dir } as const;
    }
  })();
  const page = filters.page ?? 1;

  const [items, grouped, totalCount] = await Promise.all([
    db.expense.findMany({
      where,
      include: { category: true, centroCosto: true, area: true, paidBy: true, worker: true },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.expense.groupBy({
      by: ["reimbursed"],
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    db.expense.count({ where }),
  ]);

  const reimbursed = grouped.find((group) => group.reimbursed)?._sum.totalAmount ?? 0;
  const pending = grouped.find((group) => !group.reimbursed)?._sum.totalAmount ?? 0;

  return {
    items,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totals: {
      count: totalCount,
      total: Number(reimbursed) + Number(pending),
      reimbursed: Number(reimbursed),
      pending: Number(pending),
    },
  };
}

/** Sin paginar: el CSV exporta toda la lista filtrada. */
export async function listAllExpenses(companyId: string, filters: ExpenseFilters) {
  const where = buildWhere(companyId, filters);
  return db.expense.findMany({
    where,
    include: { category: true, centroCosto: true, area: true, paidBy: true, worker: true },
    orderBy: filters.sort === "total" ? { totalAmount: filters.dir ?? "desc" } : { date: "desc" },
  });
}

export async function getExpense(companyId: string, id: string) {
  return db.expense.findFirst({
    where: { id, companyId },
    include: {
      category: true,
      centroCosto: true,
      area: true,
      paidBy: true,
      worker: true,
      createdBy: true,
      // De dónde salió el reembolso: el movimiento bancario con que se concilió.
      bankReconciliations: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { movement: { include: { account: { select: { label: true, bankId: true } } } } },
      },
    },
  });
}

export type ExpenseForForm = {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  centroCostoId: string;
  areaId: string;
  workerId: string;
  documentNumber: string;
  paymentMethod: string;
  netAmount: number;
  ivaAmount: number;
  paidById: string;
  reimbursed: boolean;
  reimbursedAt: string;
  notes: string;
};

export function serializeExpense(expense: {
  id: string;
  date: Date;
  description: string;
  categoryId: string | null;
  centroCostoId: string | null;
  areaId: string | null;
  workerId: string | null;
  documentNumber: string | null;
  paymentMethod: string;
  netAmount: { toString(): string };
  ivaAmount: { toString(): string };
  paidById: string;
  reimbursed: boolean;
  reimbursedAt: Date | null;
  notes: string | null;
}): ExpenseForForm {
  return {
    id: expense.id,
    date: toISODate(expense.date),
    description: expense.description,
    categoryId: expense.categoryId ?? "",
    centroCostoId: expense.centroCostoId ?? "",
    areaId: expense.areaId ?? "",
    workerId: expense.workerId ?? "",
    documentNumber: expense.documentNumber ?? "",
    paymentMethod: expense.paymentMethod,
    netAmount: Number(expense.netAmount.toString()),
    ivaAmount: Number(expense.ivaAmount.toString()),
    paidById: expense.paidById,
    reimbursed: expense.reimbursed,
    reimbursedAt: expense.reimbursedAt ? toISODate(expense.reimbursedAt) : "",
    notes: expense.notes ?? "",
  };
}
