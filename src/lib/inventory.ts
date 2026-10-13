import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export const moneyToInt = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const str = String(value).replace(/\./g, "").replace(/,/g, ".");
  const num = Number(str);
  return Number.isNaN(num) ? 0 : Math.trunc(num);
};

export const toDecimal = (value: string | number): Prisma.Decimal => {
  const num = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(num)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(num.toFixed(6));
};

// Cantidad total y costo promedio ponderado sumando todas las bodegas.
export function aggregateStock(stocks: { quantity: Prisma.Decimal; avgCost: Prisma.Decimal }[]) {
  let quantity = new Prisma.Decimal(0);
  let value = new Prisma.Decimal(0);
  for (const s of stocks) {
    quantity = quantity.plus(s.quantity);
    value = value.plus(s.quantity.times(s.avgCost));
  }
  return {
    quantity,
    avgCost: quantity.isZero() ? new Prisma.Decimal(0) : value.div(quantity),
  };
}

// ---------------------------------------------------------------------------
// Bodegas
// ---------------------------------------------------------------------------

export type WarehouseRef = { id: string; name: string; isDefault: boolean };

export async function listWarehouses(companyId: string, includeInactive = false) {
  return db.warehouse.findMany({
    where: includeInactive ? { companyId } : { companyId, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

// Toda empresa tiene al menos una bodega. Si aún no existe, se crea la
// por defecto en el momento.
export async function getOrCreateDefaultWarehouse(
  companyId: string,
  client: Prisma.TransactionClient = db,
): Promise<WarehouseRef> {
  const find = () =>
    client.warehouse.findFirst({
      where: { companyId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isDefault: true },
    });

  const found = await find();
  if (found) return found;
  try {
    return await client.warehouse.create({
      data: { companyId, name: "Bodega principal", isDefault: true },
      select: { id: true, name: true, isDefault: true },
    });
  } catch {
    // Dos peticiones simultáneas: gana la que ya insertó.
    return find().then((w) => {
      if (!w) throw new Error("No se pudo crear la bodega por defecto.");
      return w;
    });
  }
}

// Valida que la bodega exista dentro de la empresa; sin id usa la por defecto.
async function resolveWarehouseId(
  companyId: string,
  warehouseId: string | null | undefined,
  client: Prisma.TransactionClient = db,
): Promise<WarehouseRef | null> {
  if (!warehouseId) return getOrCreateDefaultWarehouse(companyId, client);
  return client.warehouse.findFirst({
    where: { id: warehouseId, companyId },
    select: { id: true, name: true, isDefault: true },
  });
}

// ---------------------------------------------------------------------------
// Filtros de listados
// ---------------------------------------------------------------------------

export type ProductFilters = {
  q: string;
  categoryId?: string;
  warehouseId?: string;
  // "bajo": bajo el mínimo; "sin": sin stock; "ok": con stock sobre el mínimo.
  stock: "ALL" | "bajo" | "sin" | "ok";
};

export function parseProductFilters(searchParams: {
  q?: string;
  categoria?: string;
  bodega?: string;
  stock?: string;
}): ProductFilters {
  const stock =
    searchParams.stock === "bajo" || searchParams.stock === "sin" || searchParams.stock === "ok"
      ? searchParams.stock
      : "ALL";

  return {
    q: (searchParams.q ?? "").trim(),
    categoryId: searchParams.categoria || undefined,
    warehouseId: searchParams.bodega || undefined,
    stock,
  };
}

export async function listProducts(companyId: string, filters?: ProductFilters) {
  const where: Prisma.ProductWhereInput = { companyId };
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.q) {
    where.OR = [
      { sku: { contains: filters.q, mode: "insensitive" } },
      { name: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters?.warehouseId) where.stocks = { some: { warehouseId: filters.warehouseId } };

  const products = await db.product.findMany({
    where,
    include: { unit: true, category: true, stocks: { include: { warehouse: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const mapped = products.map((p) => {
    // Si hay bodega filtrada, el stock mostrado es el de esa bodega.
    const stocks = filters?.warehouseId
      ? p.stocks.filter((s) => s.warehouseId === filters.warehouseId)
      : p.stocks;
    const total = aggregateStock(stocks);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      active: p.active,
      costNet: p.costNet,
      priceNet: p.priceNet,
      minStock: p.minStock ? p.minStock.toFixed(3) : null,
      quantity: total.quantity.toFixed(3),
      avgCost: total.avgCost.toFixed(4),
      unitName: p.unit?.name ?? null,
      categoryName: p.category?.name ?? null,
    };
  });

  // El filtro por stock compara dos columnas (cantidad vs mínimo), así que se
  // aplica después de la consulta.
  const stock = filters?.stock ?? "ALL";
  if (stock === "ALL") return mapped;

  return mapped.filter((p) => {
    const quantity = new Prisma.Decimal(p.quantity);
    const min = p.minStock ? new Prisma.Decimal(p.minStock) : null;
    if (stock === "sin") return quantity.isZero();
    if (stock === "bajo") return min !== null && quantity.lte(min);
    return min === null || quantity.gt(min);
  });
}

export async function getProduct(companyId: string, productId: string) {
  return db.product.findFirst({ where: { id: productId, companyId } });
}

export async function getProductWithKardex(companyId: string, productId: string) {
  const product = await db.product.findFirst({
    where: { id: productId, companyId },
    include: {
      unit: true,
      category: true,
      stocks: { include: { warehouse: true }, orderBy: { warehouse: { name: "asc" } } },
    },
  });
  if (!product) return null;

  const movements = await db.stockMovement.findMany({
    where: { companyId, productId },
    include: { warehouse: true, toWarehouse: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const byWarehouse = product.stocks.map((s) => ({
    warehouseId: s.warehouseId,
    warehouseName: s.warehouse.name,
    quantity: s.quantity,
    avgCost: s.avgCost,
  }));

  return {
    product,
    // Saldo consolidado (todas las bodegas) y desglose por bodega.
    stock: aggregateStock(product.stocks),
    stocks: byWarehouse,
    movements,
  };
}

export const MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "ADJUST_IN",
  "ADJUST_OUT",
  "WASTE",
  "INITIAL",
  "TRANSFER",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type MovementFilters = {
  type?: MovementType;
  warehouseId?: string;
  from?: Date;
  to?: Date;
  q: string;
};

export function parseMovementFilters(searchParams: {
  tipo?: string;
  bodega?: string;
  desde?: string;
  hasta?: string;
  q?: string;
}): MovementFilters {
  const tipo = searchParams.tipo as MovementType | undefined;

  return {
    type: tipo && MOVEMENT_TYPES.includes(tipo) ? tipo : undefined,
    warehouseId: searchParams.bodega || undefined,
    from: searchParams.desde ? new Date(`${searchParams.desde}T00:00:00.000Z`) : undefined,
    to: searchParams.hasta ? new Date(`${searchParams.hasta}T23:59:59.999Z`) : undefined,
    q: (searchParams.q ?? "").trim(),
  };
}

export async function listStockMovements(
  companyId: string,
  filters?: MovementFilters,
  limit = 200,
) {
  const where: Prisma.StockMovementWhereInput = { companyId };
  if (filters?.type) where.type = filters.type;
  if (filters?.q) {
    where.product = {
      OR: [
        { sku: { contains: filters.q, mode: "insensitive" } },
        { name: { contains: filters.q, mode: "insensitive" } },
      ],
    };
  }
  if (filters?.warehouseId) {
    where.OR = [{ warehouseId: filters.warehouseId }, { toWarehouseId: filters.warehouseId }];
  }
  if (filters?.from || filters?.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  return db.stockMovement.findMany({
    where,
    include: {
      product: { include: { unit: true } },
      warehouse: true,
      toWarehouse: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

// SKU autogenerado para productos nuevos: P-0001, P-0002…
export async function nextProductSku(companyId: string): Promise<string> {
  const last = await db.product.findFirst({
    where: { companyId },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });
  if (!last?.sku) return "P-0001";
  const match = last.sku.match(/(\d+)$/);
  const num = match ? Number(match[1]) + 1 : 1;
  return `P-${String(num).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Motor de movimientos (promedio ponderado)
// ---------------------------------------------------------------------------

export const INCREASE_TYPES = new Set(["IN", "INITIAL", "ADJUST_IN"]);
export const DECREASE_TYPES = new Set(["OUT", "WASTE", "ADJUST_OUT"]);

type StockSnapshot = { quantity: Prisma.Decimal; avgCost: Prisma.Decimal };

const emptyStock = (): StockSnapshot => ({
  quantity: new Prisma.Decimal(0),
  avgCost: new Prisma.Decimal(0),
});

// Bloquea las filas de saldo con FOR UPDATE, siempre en el mismo orden para no
// generar interbloqueos entre movimientos simultáneos.
async function lockStockRows(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseIds: string[],
): Promise<Map<string, StockSnapshot>> {
  const ids = [...warehouseIds].sort();
  const rows =
    ids.length === 0
      ? []
      : await tx.$queryRaw<
          { warehouseId: string; quantity: string; avgCost: string }[]
        >`SELECT "warehouseId", quantity, "avgCost" FROM "ProductStock"
           WHERE "productId" = ${productId} AND "warehouseId" IN (${Prisma.join(ids)})
           ORDER BY "warehouseId" FOR UPDATE`;

  const map = new Map<string, StockSnapshot>(ids.map((id) => [id, emptyStock()]));
  for (const r of rows) {
    map.set(r.warehouseId, {
      quantity: new Prisma.Decimal(r.quantity),
      avgCost: new Prisma.Decimal(r.avgCost),
    });
  }
  return map;
}

export type MovementInput = {
  companyId: string;
  productId: string;
  type: MovementType;
  date: Date;
  quantity: Prisma.Decimal;
  unitCost?: number | null;
  reason?: string | null;
  reference?: string | null;
  notes?: string | null;
  createdById: string;
  /** Bodega de origen. Si falta, la por defecto de la empresa. */
  warehouseId?: string | null;
  /** Solo TRANSFER: bodega de destino. */
  toWarehouseId?: string | null;
};

export type MovementResult =
  | { ok: true; movementId: string }
  | { ok: false; error: string };

// Registra un movimiento y recalcula el saldo con promedio ponderado (PPP).
// Todo dentro de una transacción: saldo y movimiento siempre consistentes.
// `client` permite reutilizar la transacción del llamante (conteos).
export async function registerMovement(
  input: MovementInput,
  client?: Prisma.TransactionClient,
): Promise<MovementResult> {
  const { companyId, productId, type, quantity } = input;

  if (quantity.lte(0)) return { ok: false, error: "La cantidad debe ser mayor que cero." };

  const run = async (tx: Prisma.TransactionClient): Promise<MovementResult> => {
    const product = await tx.product.findFirst({
      where: { id: productId, companyId },
      select: { id: true, tracksStock: true },
    });
    if (!product) return { ok: false, error: "Producto no encontrado." };

    const origin = await resolveWarehouseId(companyId, input.warehouseId, tx);
    if (!origin) return { ok: false, error: "Bodega de origen no encontrada." };

    let destination: WarehouseRef | null = null;
    if (type === "TRANSFER") {
      destination = await resolveWarehouseId(companyId, input.toWarehouseId, tx);
      if (!destination) return { ok: false, error: "Bodega de destino no encontrada." };
      if (destination.id === origin.id) {
        return { ok: false, error: "La bodega de destino debe ser distinta de la de origen." };
      }
    }

    const locked = await lockStockRows(tx, productId, [origin.id, destination?.id].filter(Boolean) as string[]);
    const from = locked.get(origin.id) ?? emptyStock();
    const to = destination ? locked.get(destination.id) ?? emptyStock() : null;

    let nextFromQty: Prisma.Decimal;
    let nextFromAvg: Prisma.Decimal;
    let nextToQty: Prisma.Decimal | null = null;
    let nextToAvg: Prisma.Decimal | null = null;
    let unitCost: number | null = null;

    if (type === "TRANSFER") {
      // La transferencia no altera el total de la empresa: baja en la origen al
      // promedio de esa bodega y sube en la destino recalculando su PPP.
      if (from.quantity.minus(quantity).lt(0)) {
        return {
          ok: false,
          error: `Stock insuficiente en «${origin.name}» (hay ${from.quantity.toFixed(3)}).`,
        };
      }
      unitCost = Math.round(from.avgCost.toNumber());
      nextFromQty = from.quantity.minus(quantity);
      nextFromAvg = from.avgCost;
      const carried = quantity.times(from.avgCost);
      nextToQty = to!.quantity.plus(quantity);
      nextToAvg = nextToQty.isZero()
        ? new Prisma.Decimal(0)
        : to!.quantity.times(to!.avgCost).plus(carried).div(nextToQty);
    } else if (INCREASE_TYPES.has(type)) {
      nextFromQty = from.quantity.plus(quantity);
      // Entradas y stock inicial fijan nuevo promedio; los ajustes al alza lo
      // conservan salvo que venga un costo explícito.
      const cost = input.unitCost ?? null;
      if (type === "ADJUST_IN" && cost === null) {
        nextFromAvg = from.avgCost;
      } else if (cost === null) {
        return { ok: false, error: "Este movimiento requiere un costo unitario." };
      } else {
        const totalCost = from.quantity.times(from.avgCost).plus(quantity.times(cost));
        nextFromAvg = nextFromQty.isZero() ? new Prisma.Decimal(0) : totalCost.div(nextFromQty);
        unitCost = cost;
      }
      // Costo vigente del producto: siempre la última entrada informada.
      if (unitCost !== null) {
        await tx.product.update({
          where: { id: productId },
          data: { costNet: Math.round(unitCost) },
        });
      }
    } else {
      // Salidas: se valorizan al costo promedio vigente de la bodega.
      if (from.quantity.minus(quantity).lt(0)) {
        return { ok: false, error: `Stock insuficiente (hay ${from.quantity.toFixed(3)}).` };
      }
      nextFromQty = from.quantity.minus(quantity);
      nextFromAvg = from.avgCost;
      unitCost = Math.round(from.avgCost.toNumber());
    }

    const movement = await tx.stockMovement.create({
      data: {
        companyId,
        productId,
        type,
        date: input.date,
        quantity,
        unitCost,
        warehouseId: origin.id,
        toWarehouseId: destination?.id ?? null,
        reason: input.reason ?? null,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        createdById: input.createdById,
      },
    });

    const saveStock = async (warehouseId: string, q: Prisma.Decimal, a: Prisma.Decimal) => {
      const updated = await tx.productStock.updateMany({
        where: { productId, warehouseId },
        data: { quantity: q, avgCost: a },
      });
      if (updated.count === 0) {
        await tx.productStock.create({
          data: { productId, warehouseId, companyId, quantity: q, avgCost: a },
        });
      }
    };

    await saveStock(origin.id, nextFromQty, nextFromAvg);
    if (destination && nextToQty !== null && nextToAvg !== null) {
      await saveStock(destination.id, nextToQty, nextToAvg);
    }

    return { ok: true, movementId: movement.id };
  };

  // Con cliente propio la transacción la abrió el llamante (conteos).
  // maxWait cubre la espera por una conexión libre; en dev la primera
  // petición compila y supera el valor por defecto (2 s).
  return client
    ? run(client)
    : db.$transaction(run, { timeout: 30_000, maxWait: 15_000 });
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

export type InventoryKpis = {
  products: number;
  activeProducts: number;
  stockValue: number;
  belowMin: number;
  outOfStock: number;
  warehouses: number;
};

// Tarjetas del listado de productos: totales y alertas de stock.
export async function getInventoryKpis(companyId: string): Promise<InventoryKpis> {
  const [products, low, out, warehouses] = await Promise.all([
    db.product.count({ where: { companyId } }),
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM (
        SELECT p.id
        FROM "Product" p
        JOIN "ProductStock" s ON s."productId" = p.id
        WHERE p."companyId" = ${companyId}
          AND p."active" = true
          AND p."tracksStock" = true
          AND p."minStock" IS NOT NULL
        GROUP BY p.id, p."minStock"
        HAVING sum(s.quantity) <= p."minStock"
      ) t`,
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM (
        SELECT p.id
        FROM "Product" p
        JOIN "ProductStock" s ON s."productId" = p.id
        WHERE p."companyId" = ${companyId}
          AND p."active" = true
          AND p."tracksStock" = true
        GROUP BY p.id
        HAVING sum(s.quantity) = 0
      ) t`,
    db.warehouse.count({ where: { companyId, active: true } }),
  ]);

  const value = await db.$queryRaw<{ total: string }[]>`
    SELECT COALESCE(sum(s.quantity * s."avgCost"), 0)::text AS total
    FROM "ProductStock" s
    WHERE s."companyId" = ${companyId}`;

  const rows = await db.$queryRaw<{ active: bigint }[]>`
    SELECT count(*)::bigint AS active
    FROM "Product"
    WHERE "companyId" = ${companyId} AND "active" = true`;

  return {
    products,
    activeProducts: Number(rows[0]?.active ?? 0),
    stockValue: Math.round(Number(value[0]?.total ?? 0)),
    belowMin: Number(low[0]?.n ?? 0),
    outOfStock: Number(out[0]?.n ?? 0),
    warehouses,
  };
}
