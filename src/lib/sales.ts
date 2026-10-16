import type { DocumentType, SaleStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { documentSign } from "@/lib/money";
import { toISODate } from "@/lib/money";
import { compareFolio, compareText, parseSortDir, type SortDir } from "@/lib/sort";
import { documentTypeValues } from "@/lib/validation";

export type SaleFilters = {
  status: SaleStatus | "ALL";
  q: string;
  partnerId?: string;
  categoryId?: string;
  salespersonId?: string;
  documentType?: DocumentType;
  from?: Date;
  to?: Date;
  sort?: string;
  dir?: SortDir;
};

// Orden de los estados al ordenar la columna "Estado": primero lo que exige
// acción (por cobrar, parcial, vencida) y al final lo cerrado.
const SALE_STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PARTIAL: 1,
  OVERDUE: 2,
  PAID: 3,
  CANCELLED: 4,
};

export function parseSaleFilters(searchParams: {
  estado?: string;
  q?: string;
  cliente?: string;
  categoria?: string;
  vendedor?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  dir?: string;
}): SaleFilters {
  const status: SaleFilters["status"] =
    searchParams.estado === "pendientes"
      ? "PENDING"
      : searchParams.estado === "cobradas"
        ? "PAID"
        : searchParams.estado === "parciales"
          ? "PARTIAL"
          : searchParams.estado === "vencidas"
            ? "OVERDUE"
            : searchParams.estado === "anuladas"
              ? "CANCELLED"
              : "ALL";

  const documentType = documentTypeValues.find((value) => value === searchParams.tipo);

  return {
    status,
    q: (searchParams.q ?? "").trim(),
    partnerId: searchParams.cliente || undefined,
    categoryId: searchParams.categoria || undefined,
    salespersonId: searchParams.vendedor || undefined,
    documentType,
    from: searchParams.desde ? new Date(`${searchParams.desde}T00:00:00.000Z`) : undefined,
    to: searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59.999Z`) : undefined,
    sort: searchParams.orden || undefined,
    dir: searchParams.orden ? parseSortDir(searchParams.dir) : undefined,
  };
}

function buildWhere(companyId: string, filters: SaleFilters): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = { companyId };

  if (filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.partnerId) {
    where.partnerId = filters.partnerId;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.salespersonId) {
    where.salespersonId = filters.salespersonId;
  }

  if (filters.documentType) {
    where.documentType = filters.documentType;
  }

  if (filters.q) {
    where.OR = [
      { partner: { name: { contains: filters.q, mode: "insensitive" } } },
      { documentNumber: { contains: filters.q, mode: "insensitive" } },
      { purchaseOrder: { contains: filters.q, mode: "insensitive" } },
      { dispatchGuide: { contains: filters.q, mode: "insensitive" } },
      { hesNumber: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.from || filters.to) {
    where.date = { gte: filters.from, lte: filters.to };
  }

  return where;
}

export async function listSales(companyId: string, filters: SaleFilters) {
  const where = buildWhere(companyId, filters);

  const [rawItems, grouped] = await Promise.all([
    db.sale.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { partner: true, salesperson: true },
    }),
    db.sale.groupBy({
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
      case "cliente":
        result = compareText(a.partner.name, b.partner.name);
        break;
      case "folio":
        result = compareFolio(a.documentNumber, b.documentNumber);
        break;
      case "oc":
        result = compareText(a.purchaseOrder, b.purchaseOrder);
        break;
      case "hes":
        result = compareText(a.hesNumber, b.hesNumber);
        break;
      case "estado":
        result = (SALE_STATUS_ORDER[a.status] ?? 99) - (SALE_STATUS_ORDER[b.status] ?? 99);
        break;
      case "vendedor":
        result = compareText(a.salesperson?.name, b.salesperson?.name);
        break;
      case "total":
        result = a.totalAmount - b.totalAmount;
        break;
      case "fecha":
      default:
        result = a.date.getTime() - b.date.getTime();
        break;
    }
    // Desempate estable para que la lista no cambie entre cargas.
    if (result === 0) result = a.id.localeCompare(b.id);
    return result * sign;
  });

  const paid = Number(grouped.find((group) => group.status === "PAID")?._sum.totalAmount ?? 0);
  const pending = Number(grouped.find((group) => group.status === "PENDING")?._sum.totalAmount ?? 0);
  const partial = Number(grouped.find((group) => group.status === "PARTIAL")?._sum.totalAmount ?? 0);
  const overdue = Number(grouped.find((group) => group.status === "OVERDUE")?._sum.totalAmount ?? 0);
  const cancelled = Number(grouped.find((group) => group.status === "CANCELLED")?._sum.totalAmount ?? 0);

  // Por cobrar: solo facturas (INVOICE), no NC. Las NC no representan
  // dinero por cobrar, son abonos. Se calculan separando por tipo de documento.
  const facturasPendientes = items.filter(
    (sale) =>
      sale.documentType === "INVOICE" &&
      (sale.status === "PENDING" || sale.status === "PARTIAL" || sale.status === "OVERDUE"),
  );
  const porCobrar = facturasPendientes.reduce((acc, sale) => acc + sale.totalAmount, 0);

  // Total facturado: solo facturas (INVOICE), no NC.
  const totalFacturas = items
    .filter((sale) => sale.documentType === "INVOICE")
    .reduce((acc, sale) => acc + sale.totalAmount, 0);

  return {
    items,
    totals: {
      count: items.length,
      total: totalFacturas,
      paid,
      pending: porCobrar,
      partial,
      overdue,
      cancelled,
    },
  };
}

export async function getSale(companyId: string, id: string) {
  return db.sale.findFirst({
    where: { id, companyId },
    include: {
      partner: true,
      salesperson: true,
      category: true,
      area: true,
      createdBy: true,
      items: { orderBy: { position: "asc" }, include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
}

export type SaleForForm = {
  id: string;
  partnerId: string;
  partnerName: string;
  categoryId: string;
  areaId: string;
  documentType: string;
  documentNumber: string;
  referenceDocumentNumber: string;
  date: string;
  salespersonId: string;
  purchaseOrder: string;
  dispatchGuide: string;
  hesNumber: string;
  netAmount: number;
  ivaAmount: number;
  retentionAmount: number;
  status: string;
  paymentDate: string;
  confirmingAt: string;
  notes: string;
};

export function serializeSale(sale: {
  id: string;
  partnerId: string;
  partner?: { name: string };
  categoryId: string | null;
  areaId: string | null;
  documentType: string;
  documentNumber: string | null;
  referenceDocumentNumber: string | null;
  date: Date;
  salespersonId: string | null;
  purchaseOrder: string | null;
  dispatchGuide: string | null;
  hesNumber: string | null;
  netAmount: { toString(): string };
  ivaAmount: { toString(): string };
  retentionAmount: { toString(): string };
  status: string;
  paymentDate: Date | null;
  confirmingAt: Date | null;
  notes: string | null;
}): SaleForForm {
  return {
    id: sale.id,
    partnerId: sale.partnerId,
    partnerName: sale.partner?.name ?? "",
    categoryId: sale.categoryId ?? "",
    areaId: sale.areaId ?? "",
    documentType: sale.documentType,
    documentNumber: sale.documentNumber ?? "",
    referenceDocumentNumber: sale.referenceDocumentNumber ?? "",
    date: toISODate(sale.date),
    salespersonId: sale.salespersonId ?? "",
    purchaseOrder: sale.purchaseOrder ?? "",
    dispatchGuide: sale.dispatchGuide ?? "",
    hesNumber: sale.hesNumber ?? "",
    netAmount: Number(sale.netAmount.toString()),
    ivaAmount: Number(sale.ivaAmount.toString()),
    retentionAmount: Number(sale.retentionAmount.toString()),
    status: sale.status,
    paymentDate: sale.paymentDate ? toISODate(sale.paymentDate) : "",
    confirmingAt: sale.confirmingAt ? toISODate(sale.confirmingAt) : "",
    notes: sale.notes ?? "",
  };
}
