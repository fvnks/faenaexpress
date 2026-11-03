import type { DocumentType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calcularTotales } from "@/lib/ledger";
import { toISODate, todayDate } from "@/lib/money";
import { paginate, parsePage } from "@/lib/pagination";
import { rutSearchPatterns } from "@/lib/rut";
import { compareFolio, compareText, parseSortDir, type SortDir } from "@/lib/sort";
import { documentTypeValues, listaFiltros } from "@/lib/validation";

export type PurchaseFilters = {
  /**
   * El estado (o los estados) por palabra clave. Ninguno = "todos". Varias
   * suman: la lista muestra lo que cumpla cualquiera de las elegidas.
   */
  estado: PurchaseEstado[];
  q: string;
  /** Selección múltiple: varios proveedores a la vez. Lista vacía = todos. */
  proveedor: string[];
  categoria: string[];
  /** Varias tipo de documento a la vez (factura + guía, por ejemplo). */
  tipo: DocumentType[];
  from?: Date;
  to?: Date;
  sort?: string;
  dir?: SortDir;
  page?: number;
};

export type PurchaseEstado = "pendientes" | "parciales" | "pagadas" | "vencidas";

export const purchaseEstadoValues: PurchaseEstado[] = ["pendientes", "parciales", "pagadas", "vencidas"];

// Orden de los estados al ordenar la columna "Estado".
const PURCHASE_STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PARTIAL: 1,
  PAID: 2,
};

/**
 * Las filas del estado por palabra clave. "Vencidas" no es un estado propio:
 * son las pendientes de pago cuya fecha de vencimiento ya pasó.
 */
const gruposEstadoCompra: Record<PurchaseEstado, Prisma.PurchaseWhereInput> = {
  pendientes: { status: "PENDING" },
  parciales: { status: "PARTIAL" },
  pagadas: { status: "PAID" },
  vencidas: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: todayDate() } },
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
  pagina?: string;
}): PurchaseFilters {
  // Los valores que no son de la lista se descartan: una URL tocada a mano no
  // filtra cosas que la lista no ofrece.
  const estado = listaFiltros(searchParams.estado).filter(
    (v): v is PurchaseEstado => (purchaseEstadoValues as string[]).includes(v),
  );

  return {
    estado,
    q: (searchParams.q ?? "").trim(),
    proveedor: listaFiltros(searchParams.proveedor),
    categoria: listaFiltros(searchParams.categoria),
    tipo: listaFiltros(searchParams.tipo).filter(
      (v): v is DocumentType => (documentTypeValues as readonly string[]).includes(v),
    ),
    from: searchParams.desde ? new Date(`${searchParams.desde}T00:00:00.000Z`) : undefined,
    to: searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59.999Z`) : undefined,
    sort: searchParams.orden || undefined,
    dir: searchParams.orden ? parseSortDir(searchParams.dir) : undefined,
    page: parsePage(searchParams.pagina),
  };
}

function buildWhere(companyId: string, filters: PurchaseFilters): Prisma.PurchaseWhereInput {
  const where: Prisma.PurchaseWhereInput = { companyId };

  const grupos = filters.estado.map((clave) => gruposEstadoCompra[clave]);
  if (grupos.length === 1) {
    Object.assign(where, grupos[0]);
  } else if (grupos.length > 1) {
    // Varios estados suman: (pendientes) O (vencidas) O (…). El AND de arriba
    // no choca con el OR de la búsqueda de texto: son cláusulas distintas.
    where.AND = [{ OR: grupos }];
  }

  if (filters.proveedor.length > 0) {
    where.partnerId = { in: filters.proveedor };
  }

  if (filters.categoria.length > 0) {
    where.categoryId = { in: filters.categoria };
  }

  if (filters.tipo.length > 0) {
    where.documentType = { in: filters.tipo };
  }

  if (filters.q) {
    // El RUT se guarda con puntos, así que un RUT escrito sin ellos necesita
    // variantes formateadas para poder encontrarlo.
    where.OR = [
      { partner: { name: { contains: filters.q, mode: "insensitive" } } },
      { partner: { rut: { contains: filters.q, mode: "insensitive" } } },
      ...rutSearchPatterns(filters.q).map((pattern) => ({ partner: { rut: { contains: pattern } } })),
      { documentNumber: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.from || filters.to) {
    where.date = { gte: filters.from, lte: filters.to };
  }

  return where;
}

async function loadPurchases(companyId: string, filters: PurchaseFilters) {
  const where = buildWhere(companyId, filters);

  const [rawItems] = await Promise.all([
    db.purchase.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        partner: true,
        category: true,
        area: true,
        // Los abonos: sin ellos el saldo real no se puede calcular.
        payments: { select: { amount: true } },
      },
    }),
  ]);

  const sortKey = filters.sort ?? "fecha";
  const dir: SortDir = filters.dir ?? "desc";
  const sign = dir === "asc" ? 1 : -1;

  const rows = [...rawItems].sort((a, b) => {
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

  return { rows };
}

export type PurchaseListItem = Awaited<ReturnType<typeof loadPurchases>>["rows"][number];

export async function listPurchases(companyId: string, filters: PurchaseFilters) {
  const { rows } = await loadPurchases(companyId, filters);

  // Una compra no se anula (el estado es PENDING, PARTIAL o PAID), así que acá
  // no hay documentos anulados que quedar fuera. Lo que sí importa es que la
  // nota de crédito RESTA: es un abono del proveedor, no una compra.
  const totales = calcularTotales(
    rows.map((purchase) => ({
      documentType: purchase.documentType,
      documentNumber: purchase.documentNumber,
      status: purchase.status,
      totalAmount: purchase.totalAmount,
      abonado: purchase.payments.reduce((acc, payment) => acc + payment.amount, 0),
    })),
  );

  // Vencido: lo pendiente de pago con la fecha de vencimiento ya pasada.
  const today = todayDate();
  const overdue = rows
    .filter((row) => row.status === "PENDING" && row.dueDate !== null && row.dueDate < today)
    .reduce((acc, row) => acc + row.totalAmount, 0);

  // La lista se ordena completa y recién ahí se corta en páginas: los
  // comparadores son propios y no se pueden traducir a un `orderBy`.
  const { items, page, pageCount } = paginate(rows, filters.page ?? 1);

  return {
    items,
    page,
    pageCount,
    totals: {
      count: rows.length,
      total: totales.total,
      paid: totales.movido,
      pending: totales.pendiente,
      overdue,
      notasCredito: totales.notasCredito,
      notasCreditoCantidad: totales.notasCreditoCantidad,
    },
  };
}

// Sin paginar: la exportación a CSV necesita la lista filtrada completa.
export async function listAllPurchases(companyId: string, filters: PurchaseFilters) {
  const { rows } = await loadPurchases(companyId, filters);
  return rows;
}

export async function getPurchase(companyId: string, id: string) {
  return db.purchase.findFirst({
    where: { id, companyId },
    include: {
      partner: true,
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
