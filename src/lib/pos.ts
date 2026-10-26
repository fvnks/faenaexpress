import { db } from "@/lib/db";
import { dayStartUtc, nextDayISO, todayISO } from "@/lib/money";

// Punto de venta: consultas de lectura del módulo.
//
// El POS es un producto aparte, pero comparte los datos de Facturas: productos,
// terceros y catálogo de medios de pago. Acá no se duplica nada de eso; solo se
// arma la vista que necesita una caja.

export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  priceNet: number;
  ivaAffected: boolean;
  tracksStock: boolean;
  stock: string;
  unitName: string | null;
  categoryName: string | null;
};

export type PosPartner = {
  id: string;
  name: string;
  rut: string | null;
};

export type PosSaleFilters = {
  q: string;
  /** Inclusivo. */
  from: Date;
  /** Exclusivo: el día siguiente al último que se quiere mostrar. */
  to: Date;
};

/**
 * Filtros de la lista de ventas.
 *
 * Sin fechas se muestra el último mes: una caja no necesita ver todo el
 * historial para encontrar el ticket de ayer. `hasta` se corre un día porque
 * la consulta compara con `<`, no con `<=`.
 */
export function parsePosSaleFilters(raw: {
  q?: string;
  desde?: string;
  hasta?: string;
}): PosSaleFilters {
  const q = (raw.q ?? "").trim();
  // Las ventas son timestamps: la frontera del día es la medianoche chilena
  // en UTC (una venta de las 23:12 es 02:12 UTC del día siguiente).
  const hoyISO = todayISO();

  const parseDay = (value: string | undefined) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return value;
  };

  const desdeISO = parseDay(raw.desde);
  const hastaISO = parseDay(raw.hasta);

  const from = desdeISO
    ? dayStartUtc(desdeISO)
    : dayStartUtc(
        new Date(Date.parse(`${hoyISO}T00:00:00.000Z`) - 29 * 86_400_000).toISOString().slice(0, 10),
      );

  // Inclusivo hasta el final del día: la frontera del día siguiente.
  const to = dayStartUtc(nextDayISO(hastaISO ?? hoyISO));

  return { q, from, to };
}

/** La caja abierta de esta persona. Cada cajero tiene la suya. */
export async function getOpenPosSession(companyId: string, userId: string) {
  return db.posSession.findFirst({
    where: { companyId, openedById: userId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
}

export async function getPosSession(companyId: string, sessionId: string) {
  return db.posSession.findFirst({
    where: { id: sessionId, companyId },
    include: {
      openedBy: { select: { name: true } },
      sales: {
        where: { status: "COMPLETED" },
        include: {
          partner: { select: { name: true } },
          payments: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Productos que se pueden vender: activos y con precio de venta. */
export async function listPosProducts(companyId: string): Promise<PosProduct[]> {
  const products = await db.product.findMany({
    where: { companyId, active: true, priceNet: { not: null } },
    include: {
      unit: { select: { name: true } },
      category: { select: { name: true } },
      stocks: { select: { quantity: true } },
    },
    orderBy: [{ name: "asc" }],
    take: 2000,
  });

  return products.map((product) => {
    const stock = product.stocks.reduce(
      (total, row) => total + Number(row.quantity.toString()),
      0,
    );
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      priceNet: product.priceNet ?? 0,
      ivaAffected: product.ivaAffected,
      tracksStock: product.tracksStock,
      stock: stock.toFixed(3),
      unitName: product.unit?.name ?? null,
      categoryName: product.category?.name ?? null,
    };
  });
}

export type PosCatalogItem = {
  id: string;
  sku: string;
  name: string;
  priceNet: number;
  ivaAffected: boolean;
  tracksStock: boolean;
  stock: string;
  active: boolean;
  categoryName: string | null;
  unitName: string | null;
};

/**
 * Catálogo completo para la pantalla de productos del POS: activos e
 * inactivos, con su stock total entre bodegas. Es el MISMO inventario de
 * Facturas (misma tabla `Product`); acá solo se mira desde el módulo POS.
 */
export async function listPosCatalog(companyId: string): Promise<PosCatalogItem[]> {
  const products = await db.product.findMany({
    where: { companyId },
    include: {
      unit: { select: { name: true } },
      category: { select: { name: true } },
      stocks: { select: { quantity: true } },
    },
    orderBy: [{ name: "asc" }],
    take: 2000,
  });

  return products.map((product) => {
    const stock = product.stocks.reduce(
      (total, row) => total + Number(row.quantity.toString()),
      0,
    );
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      priceNet: product.priceNet ?? 0,
      ivaAffected: product.ivaAffected,
      tracksStock: product.tracksStock,
      stock: stock.toFixed(3),
      active: product.active,
      categoryName: product.category?.name ?? null,
      unitName: product.unit?.name ?? null,
    };
  });
}

export async function listPosPartners(companyId: string): Promise<PosPartner[]> {
  const partners = await db.partner.findMany({
    where: { companyId, active: true, type: { in: ["CUSTOMER", "BOTH"] } },
    select: { id: true, name: true, rut: true },
    orderBy: { name: "asc" },
    take: 500,
  });
  return partners;
}

/** El resumen del día para la caja. */
export async function posTodaySummary(companyId: string) {
  const hoyISO = todayISO();
  const from = dayStartUtc(hoyISO);
  const to = dayStartUtc(nextDayISO(hoyISO));

  const sales = await db.posSale.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      createdAt: { gte: from, lt: to },
    },
    select: {
      total: true,
      subtotal: true,
      tax: true,
      payments: { select: { method: true, amount: true } },
    },
  });

  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const net = sales.reduce((sum, sale) => sum + sale.subtotal, 0);
  const tax = sales.reduce((sum, sale) => sum + sale.tax, 0);
  const byMethod = new Map<string, number>();
  for (const sale of sales) {
    for (const payment of sale.payments) {
      byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + payment.amount);
    }
  }

  return {
    // Las devoluciones (total negativo) restan en los montos pero no cuentan
    // como tickets vendidos.
    count: sales.filter((sale) => sale.total >= 0).length,
    total,
    net,
    tax,
    byMethod: [...byMethod.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** Ventas de una caja o de un rango, para el listado. */
export async function listPosSales(companyId: string, filters: PosSaleFilters) {
  const sales = await db.posSale.findMany({
    where: {
      companyId,
      createdAt: { gte: filters.from, lt: filters.to },
      ...(filters.q
        ? {
            OR: [
              { saleNumber: { contains: filters.q, mode: "insensitive" as const } },
              { partner: { name: { contains: filters.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: {
      partner: { select: { name: true, rut: true } },
      user: { select: { name: true } },
      _count: { select: { items: true } },
      payments: { select: { method: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return sales.map((sale) => ({
    id: sale.id,
    saleNumber: sale.saleNumber,
    createdAt: sale.createdAt,
    status: sale.status,
    partnerName: sale.partner?.name ?? "Consumidor final",
    partnerRut: sale.partner?.rut ?? null,
    userName: sale.user.name,
    items: sale._count.items,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    payments: sale.payments.map((payment) => payment.method),
  }));
}

export async function getPosSale(companyId: string, saleId: string) {
  return db.posSale.findFirst({
    where: { id: saleId, companyId },
    include: {
      partner: true,
      user: { select: { name: true } },
      session: { select: { id: true, openedAt: true, status: true } },
      relatedSale: { select: { saleNumber: true } },
      relatedReturns: {
        where: { status: "COMPLETED" },
        select: { id: true, saleNumber: true, total: true },
      },
      items: { orderBy: { id: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listPosSessions(companyId: string, take = 30) {
  const sessions = await db.posSession.findMany({
    where: { companyId },
    include: {
      openedBy: { select: { name: true } },
      sales: {
        where: { status: "COMPLETED" },
        select: { total: true, payments: { select: { method: true, amount: true } } },
      },
    },
    orderBy: { openedAt: "desc" },
    take,
  });

  return sessions.map((session) => {
    const total = session.sales.reduce((sum, sale) => sum + sale.total, 0);
    const cash = session.sales.reduce(
      (sum, sale) =>
        sum +
        sale.payments
          .filter((payment) => payment.method.toLowerCase().includes("efectivo"))
          .reduce((inner, payment) => inner + payment.amount, 0),
      0,
    );
    return {
      id: session.id,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingAmount: session.openingAmount,
      closingAmount: session.closingAmount,
      status: session.status,
      openedByName: session.openedBy.name,
      count: session.sales.length,
      total,
      cash,
    };
  });
}

/**
 * Todo lo que el cierre de caja necesita: la sesión con TODAS sus ventas
 * (incluidas las anuladas, que se listan pero no cuentan) y sus pagos.
 */
export async function getPosSessionReport(companyId: string, sessionId: string) {
  const session = await db.posSession.findFirst({
    where: { id: sessionId, companyId },
    include: {
      openedBy: { select: { name: true } },
      sales: {
        orderBy: { createdAt: "asc" },
        include: {
          partner: { select: { name: true } },
          payments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!session) return null;

  const completed = session.sales.filter((sale) => sale.status === "COMPLETED");
  const voided = session.sales.filter((sale) => sale.status === "VOIDED");

  const byMethod = new Map<string, number>();
  for (const sale of completed) {
    for (const payment of sale.payments) {
      byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + payment.amount);
    }
  }

  return {
    id: session.id,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    status: session.status,
    openingAmount: session.openingAmount,
    closingAmount: session.closingAmount,
    notes: session.notes,
    openedByName: session.openedBy.name,
    sales: session.sales.map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      createdAt: sale.createdAt,
      status: sale.status,
      partnerName: sale.partner?.name ?? "Consumidor final",
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      payments: sale.payments.map((payment) => payment.method),
    })),
    totals: {
      count: completed.length,
      net: completed.reduce((sum, sale) => sum + sale.subtotal, 0),
      tax: completed.reduce((sum, sale) => sum + sale.tax, 0),
      total: completed.reduce((sum, sale) => sum + sale.total, 0),
      voidedCount: voided.length,
      voidedTotal: voided.reduce((sum, sale) => sum + sale.total, 0),
    },
    byMethod: [...byMethod.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}
