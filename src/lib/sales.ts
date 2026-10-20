import type { DocumentType, SaleStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/money";
import { paginate, parsePage } from "@/lib/pagination";
import { rutSearchPatterns } from "@/lib/rut";
import { compareFolio, compareText, parseSortDir, type SortDir } from "@/lib/sort";
import { documentTypeValues } from "@/lib/validation";

export type SaleFilters = {
  status: SaleStatus | "ALL";
  // Las ventas en confirming ya se cobraron, así que "por cobrar" las excluye
  // y "En confirming" las muestra por separado.
  confirming?: "only" | "exclude";
  q: string;
  partnerId?: string;
  categoryId?: string;
  salespersonId?: string;
  documentType?: DocumentType;
  from?: Date;
  to?: Date;
  sort?: string;
  dir?: SortDir;
  page?: number;
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
  pagina?: string;
}): SaleFilters {
  let status: SaleFilters["status"] = "ALL";
  let confirming: SaleFilters["confirming"];

  switch (searchParams.estado) {
    case "pendientes":
      status = "PENDING";
      confirming = "exclude";
      break;
    case "confirming":
      confirming = "only";
      break;
    case "cobradas":
      status = "PAID";
      break;
    case "parciales":
      status = "PARTIAL";
      confirming = "exclude";
      break;
    case "vencidas":
      status = "OVERDUE";
      confirming = "exclude";
      break;
    case "anuladas":
      status = "CANCELLED";
      break;
  }

  const documentType = documentTypeValues.find((value) => value === searchParams.tipo);

  return {
    status,
    confirming,
    q: (searchParams.q ?? "").trim(),
    partnerId: searchParams.cliente || undefined,
    categoryId: searchParams.categoria || undefined,
    salespersonId: searchParams.vendedor || undefined,
    documentType,
    from: searchParams.desde ? new Date(`${searchParams.desde}T00:00:00.000Z`) : undefined,
    to: searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59.999Z`) : undefined,
    sort: searchParams.orden || undefined,
    dir: searchParams.orden ? parseSortDir(searchParams.dir) : undefined,
    page: parsePage(searchParams.pagina),
  };
}

function buildWhere(companyId: string, filters: SaleFilters): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = { companyId };

  if (filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.confirming === "only") {
    // En confirming: ya se cobraron (aunque el cliente pague después), por eso
    // no cuentan como pagadas ni anuladas.
    where.confirmingAt = { not: null };
    where.status = { notIn: ["PAID", "CANCELLED"] };
  } else if (filters.confirming === "exclude") {
    where.confirmingAt = null;
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
    // El RUT se guarda con puntos, así que un RUT escrito sin ellos necesita
    // variantes formateadas para poder encontrarlo.
    where.OR = [
      { partner: { name: { contains: filters.q, mode: "insensitive" } } },
      { partner: { rut: { contains: filters.q, mode: "insensitive" } } },
      ...rutSearchPatterns(filters.q).map((pattern) => ({ partner: { rut: { contains: pattern } } })),
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

async function loadSales(companyId: string, filters: SaleFilters) {
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

  const rows = [...rawItems].sort((a, b) => {
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

  return { rows, grouped };
}

export type SaleListItem = Awaited<ReturnType<typeof loadSales>>["rows"][number];

export async function listSales(companyId: string, filters: SaleFilters) {
  const { rows, grouped } = await loadSales(companyId, filters);

  const paid = Number(grouped.find((group) => group.status === "PAID")?._sum.totalAmount ?? 0);
  const partial = Number(grouped.find((group) => group.status === "PARTIAL")?._sum.totalAmount ?? 0);
  const overdue = Number(grouped.find((group) => group.status === "OVERDUE")?._sum.totalAmount ?? 0);
  const cancelled = Number(grouped.find((group) => group.status === "CANCELLED")?._sum.totalAmount ?? 0);

  // Confirming: la empresa de confirming adelanta el dinero antes que el
  // cliente deposite, así que la venta ya se cobró. Se cuenta como cobrada
  // (no como por cobrar) aunque su estado siga siendo "pendiente".
  const confirming = rows
    .filter((sale) => sale.confirmingAt !== null && sale.status !== "PAID" && sale.status !== "CANCELLED")
    .reduce((acc, sale) => acc + sale.totalAmount, 0);

  // Por cobrar: solo facturas (INVOICE), no NC. Las NC no representan
  // dinero por cobrar, son abonos. Se calculan separando por tipo de documento.
  // Se excluyen las que están en confirming: esas ya se cobraron.
  const facturasPendientes = rows.filter(
    (sale) =>
      sale.documentType === "INVOICE" &&
      sale.confirmingAt === null &&
      (sale.status === "PENDING" || sale.status === "PARTIAL" || sale.status === "OVERDUE"),
  );
  const porCobrar = facturasPendientes.reduce((acc, sale) => acc + sale.totalAmount, 0);

  // Total facturado: solo facturas (INVOICE), no NC.
  const totalFacturas = rows
    .filter((sale) => sale.documentType === "INVOICE")
    .reduce((acc, sale) => acc + sale.totalAmount, 0);

  // La lista se ordena completa y recién ahí se corta en páginas: los
  // comparadores son propios y no se pueden traducir a un `orderBy`.
  const { items, page, pageCount } = paginate(rows, filters.page ?? 1);

  return {
    items,
    page,
    pageCount,
    totals: {
      count: rows.length,
      total: totalFacturas,
      paid: paid + confirming,
      confirming,
      pending: porCobrar,
      partial,
      overdue,
      cancelled,
    },
  };
}

// Sin paginar: la exportación a CSV necesita la lista filtrada completa.
export async function listAllSales(companyId: string, filters: SaleFilters) {
  const { rows } = await loadSales(companyId, filters);
  return rows;
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
      // De dónde salió el pago: el movimiento bancario con que se concilió.
      bankReconciliations: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { movement: { include: { account: { select: { label: true, bankId: true } } } } },
      },
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
  paymentMethod: string;
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
  paymentMethod: string | null;
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
    paymentMethod: sale.paymentMethod ?? "",
    paymentDate: sale.paymentDate ? toISODate(sale.paymentDate) : "",
    confirmingAt: sale.confirmingAt ? toISODate(sale.confirmingAt) : "",
    notes: sale.notes ?? "",
  };
}
