// Listado de guías de despacho con filtros, totales y paginación.
//
// Es el mismo patrón que ventas y compras: los filtros viven en la URL, la
// lista se ordena completa en el servidor y se corta en páginas.

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { paginate, parsePage } from "@/lib/pagination";
import { rutSearchPatterns } from "@/lib/rut";
import { parseSortDir, type SortDir } from "@/lib/sort";

export type GuideFilters = {
  q: string;
  partnerId?: string;
  salespersonId?: string;
  /** "AAAA-MM": deja una sola Guía de un mes. */
  periodo?: string;
  /** Si la guía ya tiene mes de comisión asignado. */
  asignacion?: "todas" | "asignadas" | "sin_asignar";
  sort?: string;
  dir?: SortDir;
  page: number;
};

export function parseGuideFilters(searchParams: {
  q?: string;
  cliente?: string;
  vendedor?: string;
  mes?: string;
  asignacion?: string;
  orden?: string;
  dir?: string;
  pagina?: string;
}): GuideFilters {
  const periodo = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes : undefined;

  let asignacion: GuideFilters["asignacion"] = "todas";
  if (searchParams.asignacion === "asignadas" || searchParams.asignacion === "sin_asignar") {
    asignacion = searchParams.asignacion;
  }

  return {
    q: (searchParams.q ?? "").trim(),
    partnerId: searchParams.cliente || undefined,
    salespersonId: searchParams.vendedor || undefined,
    periodo,
    asignacion,
    sort: searchParams.orden || undefined,
    dir: searchParams.orden ? parseSortDir(searchParams.dir) : undefined,
    page: parsePage(searchParams.pagina),
  };
}

/** El rango de un mes, en UTC: las fechas se guardan a medianoche UTC. */
function rangoDelMes(periodo: string): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

function buildWhere(companyId: string, filters: GuideFilters): Prisma.DispatchGuideWhereInput {
  const where: Prisma.DispatchGuideWhereInput = { companyId };

  if (filters.partnerId) where.partnerId = filters.partnerId;
  if (filters.salespersonId) where.salespersonId = filters.salespersonId;

  if (filters.asignacion === "asignadas") {
    where.assignment = { isNot: null };
  } else if (filters.asignacion === "sin_asignar") {
    where.assignment = { is: null };
  }

  if (filters.periodo) {
    const rango = rangoDelMes(filters.periodo);
    if (rango) where.date = { gte: rango.from, lt: rango.to };
  }

  if (filters.q) {
    where.OR = [
      { guideNumber: { contains: filters.q, mode: "insensitive" } },
      { partner: { name: { contains: filters.q, mode: "insensitive" } } },
      { partner: { rut: { contains: filters.q, mode: "insensitive" } } },
      ...rutSearchPatterns(filters.q).map((pattern) => ({ partner: { rut: { contains: pattern } } })),
      { sale: { documentNumber: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export type GuideListItem = {
  id: string;
  guideNumber: string;
  date: Date;
  netAmount: number;
  partnerId: string;
  partnerName: string;
  salespersonId: string | null;
  salespersonName: string | null;
  saleId: string | null;
  saleNumber: string | null;
  assigned: boolean;
};

export async function listGuides(
  companyId: string,
  filters: GuideFilters,
): Promise<{
  items: GuideListItem[];
  totals: {
    count: number;
    total: number;
    conFactura: number;
    sinFactura: number;
    conVendedor: number;
  };
  page: number;
  pageCount: number;
}> {
  const where = buildWhere(companyId, filters);

  const rows = await db.dispatchGuide.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      partner: { select: { id: true, name: true } },
      salesperson: { select: { id: true, name: true } },
      sale: { select: { id: true, documentNumber: true } },
      assignment: { select: { id: true } },
    },
  });

  const items: GuideListItem[] = rows.map((row) => ({
    id: row.id,
    guideNumber: row.guideNumber,
    date: row.date,
    netAmount: row.netAmount,
    partnerId: row.partner.id,
    partnerName: row.partner.name,
    salespersonId: row.salesperson?.id ?? null,
    salespersonName: row.salesperson?.name ?? null,
    saleId: row.sale?.id ?? null,
    saleNumber: row.sale?.documentNumber ?? null,
    assigned: row.assignment !== null,
  }));

  const { items: pageItems, page, pageCount } = paginate(items, filters.page);

  return {
    items: pageItems,
    totals: {
      count: items.length,
      total: items.reduce((acc, g) => acc + g.netAmount, 0),
      conFactura: items.filter((g) => g.saleId !== null).length,
      sinFactura: items.filter((g) => g.saleId === null).length,
      conVendedor: items.filter((g) => g.salespersonId !== null).length,
    },
    page,
    pageCount,
  };
}

/**
 * Los meses en los que hay guías, del más nuevo al más viejo.
 *
 * Es lo que alimenta el desplegable de mes: el filtro muestra los meses que
 * de verdad tienen guías, no una lista de meses vacíos.
 */
export async function listGuidePeriods(companyId: string): Promise<string[]> {
  const rows = await db.dispatchGuide.findMany({
    where: { companyId },
    select: { date: true },
  });

  const periodos = new Set<string>();
  for (const row of rows) {
    periodos.add(
      `${row.date.getUTCFullYear()}-${String(row.date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return [...periodos].sort().reverse();
}
