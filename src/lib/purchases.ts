import type { DocumentType, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/money";
import { compareFolio, compareText, parseSortDir, type SortDir } from "@/lib/sort";
import { documentTypeValues } from "@/lib/validation";

export type PurchaseFilters = {
  status: PaymentStatus | "ALL";
  q: string;
  partnerId?: string;
  categoryId?: string;
  documentType?: DocumentType;
  from?: Date;
  to?: Date;
  sort?: string;
  dir?: SortDir;
};

// Orden de los estados al ordenar la columna "Estado".
const PURCHASE_STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
};

export function parsePurchaseFilters(searchParams: {
  estado?: string;
  q?: string;
  proveedor?: string;
  categoria?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  dir?: string;
}): PurchaseFilters {
  const status: PurchaseFilters["status"] =
    searchParams.estado === "pendientes"
      ? "PENDING"
      : searchParams.estado === "pagadas"
        ? "PAID"
        : "ALL";

  const documentType = documentTypeValues.find((value) => value === searchParams.tipo);

  return {
    status,
    q: (searchParams.q ?? "").trim(),
    partnerId: searchParams.proveedor || undefined,
    categoryId: searchParams.categoria || undefined,
    documentType,
    from: searchParams.desde ? new Date(`${searchParams.desde}T00:00:00.000Z`) : undefined,
    to: searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59.999Z`) : undefined,
    sort: searchParams.orden || undefined,
    dir: searchParams.orden ? parseSortDir(searchParams.dir) : undefined,
  };
}

function buildWhere(companyId: string, filters: PurchaseFilters): Prisma.PurchaseWhereInput {
  const where: Prisma.PurchaseWhereInput = { companyId };

  if (filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.partnerId) {
    where.partnerId = filters.partnerId;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.documentType) {
    where.documentType = filters.documentType;
  }

  if (filters.q) {
    where.OR = [
      { partner: { name: { contains: filters.q, mode: "insensitive" } } },
      { documentNumber: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.from || filters.to) {
    where.date = { gte: filters.from, lte: filters.to };
  }

  return where;
}

export async function listPurchases(companyId: string, filters: PurchaseFilters) {
  const where = buildWhere(companyId, filters);

  const [rawItems, grouped] = await Promise.all([
    db.purchase.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { partner: true, category: true, area: true },
    }),
    db.purchase.groupBy({
      by: ["status"],
      where,
      _sum: { totalAmount: true },
    }),
  ]);

  const sortKey = filters.sort ?? "fecha";
  const dir: SortDir = filters.dir ?? "desc";
  const sign = dir === "asc" ? 1 : -1;

  const items = [...rawItems].sort((a, b) => {
    let result = 0;
    switch (sortKey) {
      case "proveedor":
        result = compareText(a.partner.name, b.partner.name);
        break;
      case "folio":
        result = compareFolio(a.documentNumber, b.documentNumber);
        break;
      case "estado":
        result = (PURCHASE_STATUS_ORDER[a.status] ?? 99) - (PURCHASE_STATUS_ORDER[b.status] ?? 99);
        break;
      case "total":
        result = a.totalAmount - b.totalAmount;
        break;
      case "fecha":
      default:
        result = a.date.getTime() - b.date.getTime();
        break;
    }
    if (result === 0) result = a.id.localeCompare(b.id);
    return result * sign;
  });

  const paid = Number(grouped.find((group) => group.status === "PAID")?._sum.totalAmount ?? 0);
  const pending = Number(grouped.find((group) => group.status === "PENDING")?._sum.totalAmount ?? 0);

  return {
    items,
    totals: { count: items.length, total: paid + pending, paid, pending },
  };
}

export async function getPurchase(companyId: string, id: string) {
  return db.purchase.findFirst({
    where: { id, companyId },
    include: {
      partner: true,
      category: true,
      area: true,
      createdBy: true,
      items: { orderBy: { position: "asc" }, include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
}

export type PurchaseForForm = {
  id: string;
  partnerId: string;
  partnerName: string;
  categoryId: string;
  areaId: string;
  documentType: string;
  documentNumber: string;
  referenceDocumentNumber: string;
  date: string;
  dueDate: string;
  description: string;
  netAmount: number;
  ivaAmount: number;
  status: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
};

export function serializePurchase(purchase: {
  id: string;
  partnerId: string;
  partner?: { name: string };
  categoryId: string | null;
  areaId: string | null;
  documentType: string;
  documentNumber: string | null;
  referenceDocumentNumber: string | null;
  date: Date;
  dueDate: Date | null;
  description: string | null;
  netAmount: { toString(): string };
  ivaAmount: { toString(): string };
  status: string;
  paymentMethod: string | null;
  paymentDate: Date | null;
  notes: string | null;
}): PurchaseForForm {
  return {
    id: purchase.id,
    partnerId: purchase.partnerId,
    partnerName: purchase.partner?.name ?? "",
    categoryId: purchase.categoryId ?? "",
    areaId: purchase.areaId ?? "",
    documentType: purchase.documentType,
    documentNumber: purchase.documentNumber ?? "",
    referenceDocumentNumber: purchase.referenceDocumentNumber ?? "",
    date: toISODate(purchase.date),
    dueDate: purchase.dueDate ? toISODate(purchase.dueDate) : "",
    description: purchase.description ?? "",
    netAmount: Number(purchase.netAmount.toString()),
    ivaAmount: Number(purchase.ivaAmount.toString()),
    status: purchase.status,
    paymentMethod: purchase.paymentMethod ?? "",
    paymentDate: purchase.paymentDate ? toISODate(purchase.paymentDate) : "",
    notes: purchase.notes ?? "",
  };
}
