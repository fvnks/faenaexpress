// Listado de notas de crédito y débito con filtros, totales y paginación.
//
// Es el mismo patrón que ventas y guías: los filtros viven en la URL, la
// lista se ordena completa en el servidor y se corta en páginas. La pieza
// propia es la RELACIÓN: cada nota apunta al documento que ajusta
// (`relatedSaleId` = factura, `relatedGuideId` = guía), y esa es la columna
// que se puede completar a mano o desde la importación del SII.

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { paginate, parsePage } from "@/lib/pagination";
import { rutSearchPatterns } from "@/lib/rut";
import { parseSortDir, type SortDir } from "@/lib/sort";

export type NoteKind = "CREDIT_NOTE" | "DEBIT_NOTE";

export const noteKinds: NoteKind[] = ["CREDIT_NOTE", "DEBIT_NOTE"];

export type NoteFilters = {
  q: string;
  partnerId?: string;
  salespersonId?: string;
  /** "AAAA-MM": deja las notas de un solo mes. */
  periodo?: string;
  /** Si la nota ya apunta al documento que ajusta. */
  relacion?: "todas" | "relacionadas" | "sin_relacionar";
  desde?: string;
  hasta?: string;
  sort?: string;
  dir?: SortDir;
  page: number;
};

export function parseNoteFilters(searchParams: {
  q?: string;
  cliente?: string;
  vendedor?: string;
  mes?: string;
  relacion?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  dir?: string;
  pagina?: string;
}): NoteFilters {
  const periodo = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes : undefined;

  let relacion: NoteFilters["relacion"] = "todas";
  if (searchParams.relacion === "relacionadas" || searchParams.relacion === "sin_relacionar") {
    relacion = searchParams.relacion;
  }

  return {
    q: (searchParams.q ?? "").trim(),
    partnerId: searchParams.cliente || undefined,
    salespersonId: searchParams.vendedor || undefined,
    periodo,
    relacion,
    desde: searchParams.desde || undefined,
    hasta: searchParams.hasta || undefined,
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

function buildWhere(companyId: string, kind: NoteKind, filters: NoteFilters): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = { companyId, documentType: kind };

  // Las condiciones se acumulan en AND: son filtros independientes, no
  // alternativas (a diferencia del OR del texto de búsqueda).
  const y: Prisma.SaleWhereInput[] = [];

  if (filters.partnerId) where.partnerId = filters.partnerId;
  if (filters.salespersonId) where.salespersonId = filters.salespersonId;

  if (filters.relacion === "relacionadas") {
    y.push({ OR: [{ relatedSaleId: { not: null } }, { relatedGuideId: { not: null } }] });
  } else if (filters.relacion === "sin_relacionar") {
    y.push({ relatedSaleId: null, relatedGuideId: null });
  }

  if (filters.periodo) {
    const rango = rangoDelMes(filters.periodo);
    if (rango) where.date = { gte: rango.from, lt: rango.to };
  } else if (filters.desde || filters.hasta) {
    where.date = { gte: filters.desde, lte: filters.hasta };
  }

  if (filters.q) {
    y.push({
      OR: [
        { documentNumber: { contains: filters.q, mode: "insensitive" } },
        { referenceDocumentNumber: { contains: filters.q, mode: "insensitive" } },
        { facturaOriginal: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { partner: { name: { contains: filters.q, mode: "insensitive" } } },
        { partner: { rut: { contains: filters.q, mode: "insensitive" } } },
        ...rutSearchPatterns(filters.q).map((pattern) => ({
          partner: { rut: { contains: pattern } },
        })),
      ],
    });
  }

  if (y.length > 0) where.AND = y;

  return where;
}

export type NoteListItem = {
  id: string;
  documentNumber: string | null;
  date: Date;
  totalAmount: number;
  status: string;
  partnerId: string;
  partnerName: string;
  salespersonName: string | null;
  /** El folio del documento original tal como vino del SII (si lo trae). */
  folioOriginal: string | null;
  /** El documento que ajusta, si ya se relacionó. */
  related: { tipo: "venta" | "guia"; id: string; etiqueta: string } | null;
};

export async function listNotes(
  companyId: string,
  kind: NoteKind,
  filters: NoteFilters,
): Promise<{
  items: NoteListItem[];
  totals: { count: number; total: number; relacionadas: number; sinRelacionar: number };
  page: number;
  pageCount: number;
}> {
  const rows = await db.sale.findMany({
    where: buildWhere(companyId, kind, filters),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      partner: { select: { id: true, name: true } },
      salesperson: { select: { name: true } },
      relatedSale: { select: { id: true, documentNumber: true, documentType: true } },
      relatedGuide: { select: { id: true, guideNumber: true } },
    },
  });

  const items: NoteListItem[] = rows.map((row) => ({
    id: row.id,
    documentNumber: row.documentNumber,
    date: row.date,
    totalAmount: row.totalAmount,
    status: row.status,
    partnerId: row.partner.id,
    partnerName: row.partner.name,
    salespersonName: row.salesperson?.name ?? null,
    folioOriginal: row.facturaOriginal ?? row.referenceDocumentNumber ?? null,
    related: row.relatedSale
      ? { tipo: "venta", id: row.relatedSale.id, etiqueta: row.relatedSale.documentNumber ?? "—" }
      : row.relatedGuide
        ? { tipo: "guia", id: row.relatedGuide.id, etiqueta: row.relatedGuide.guideNumber }
        : null,
  }));

  const { items: pageItems, page, pageCount } = paginate(items, filters.page);

  return {
    items: pageItems,
    totals: {
      count: items.length,
      total: items.reduce((acc, n) => acc + n.totalAmount, 0),
      relacionadas: items.filter((n) => n.related !== null).length,
      sinRelacionar: items.filter((n) => n.related === null).length,
    },
    page,
    pageCount,
  };
}

/**
 * Los meses en los que hay notas, del más nuevo al más viejo.
 *
 * Es lo que alimenta el desplegable de mes: muestra los meses que de verdad
 * tienen notas, no una lista de meses vacíos.
 */
export async function listNotePeriods(companyId: string, kind: NoteKind): Promise<string[]> {
  const rows = await db.sale.findMany({
    where: { companyId, documentType: kind },
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

/**
 * Los documentos que una nota puede ajustar, de un cliente dado: sus facturas
 * (y boletas) y sus guías de despacho.
 *
 * Se ofrece el mismo cliente de la nota: una nota no ajusta documentos de otra
 * empresa. Se limita a los 25 más recientes para no cargar el historial
 * completo del cliente en cada fila.
 */
export async function candidatosParaNota(
  companyId: string,
  partnerId: string,
): Promise<{ facturas: { value: string; label: string }[]; guias: { value: string; label: string }[] }> {
  const [facturas, guias] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        partnerId,
        documentType: { in: ["INVOICE", "RECEIPT"] },
      },
      select: { id: true, documentNumber: true, date: true },
      orderBy: { date: "desc" },
      take: 25,
    }),
    db.dispatchGuide.findMany({
      where: { companyId, partnerId },
      select: { id: true, guideNumber: true, date: true },
      orderBy: { date: "desc" },
      take: 25,
    }),
  ]);

  return {
    facturas: facturas.map((v) => ({
      value: v.id,
      label: `Factura N° ${v.documentNumber ?? "—"}`,
    })),
    guias: guias.map((g) => ({ value: g.id, label: `Guía N° ${g.guideNumber}` })),
  };
}

/**
 * Vincula las notas de crédito/débito con el documento que ajustan, usando el
 * folio del documento original que trae el RCV (`referenceDocumentNumber`).
 *
 * Se corre después de cada sincronización: si la factura (o la guía) que la
 * nota ajusta ya está importada, el vínculo queda hecho sin que nadie tenga
 * que buscarlo. Como las facturas y las guías tienen folio único por empresa,
 * la coincidencia es inequívoca; si el folio corresponde a otro cliente, la
 * nota se deja como está (no se cruzan clientes).
 *
 * Devuelve cuántas notas quedaron relacionadas.
 */
export async function vincularNotasConDocumentos(companyId: string): Promise<number> {
  const notas = await db.sale.findMany({
    where: {
      companyId,
      documentType: { in: noteKinds },
      relatedSaleId: null,
      relatedGuideId: null,
      OR: [{ referenceDocumentNumber: { not: null } }, { facturaOriginal: { not: null } }],
    },
    select: { id: true, partnerId: true, referenceDocumentNumber: true, facturaOriginal: true },
  });
  if (notas.length === 0) return 0;

  const [ventas, guias] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        documentType: { in: ["INVOICE", "RECEIPT"] },
        documentNumber: { not: null },
      },
      select: { id: true, documentNumber: true, partnerId: true },
    }),
    db.dispatchGuide.findMany({
      where: { companyId },
      select: { id: true, guideNumber: true, partnerId: true },
    }),
  ]);

  const ventaPorFolio = new Map(ventas.map((v) => [v.documentNumber as string, v]));
  const guiaPorFolio = new Map(guias.map((g) => [g.guideNumber, g]));

  let vinculadas = 0;
  for (const nota of notas) {
    const folio = (nota.referenceDocumentNumber ?? nota.facturaOriginal ?? "").trim();
    if (!folio) continue;

    // Primero una factura del mismo cliente; si no, una guía del mismo cliente.
    const venta = ventaPorFolio.get(folio);
    if (venta && venta.partnerId === nota.partnerId) {
      await db.sale.update({ where: { id: nota.id }, data: { relatedSaleId: venta.id } });
      vinculadas += 1;
      continue;
    }
    const guia = guiaPorFolio.get(folio);
    if (guia && guia.partnerId === nota.partnerId) {
      await db.sale.update({ where: { id: nota.id }, data: { relatedGuideId: guia.id } });
      vinculadas += 1;
    }
  }
  return vinculadas;
}
