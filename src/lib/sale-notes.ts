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
import type { NotaArbol } from "@/components/notes-tree";

export type NoteKind = "CREDIT_NOTE" | "DEBIT_NOTE";

/** "11.82 " → "1182": el mismo folio llega escrito distinto según el origen. */
export function claveFolio(folio: string): string {
  return folio.replace(/[.\s]/g, "").trim();
}

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

/**
 * Las notas que anulan cada factura del lote dado.
 *
 * El flujo «marcar anulada» NO crea ni vincula la nota: solo guarda el folio
 * en `Sale.cancellationNoteNumber`. La nota que anuló —si está registrada— es
 * una fila suelta (CREDIT_NOTE/DEBIT_NOTE) que a veces ni siquiera apunta por
 * la FK a la factura anulada. El cruce es por folio NORMALIZADO dentro de la
 * empresa; si hay más de una candidata, manda la del mismo cliente.
 *
 * Si la nota no está registrada en el sistema (se anotó solo el folio), se
 * devuelve una entrada `sinFicha` para que el árbol la muestre igual, sin
 * link ni montos.
 */
export async function notasPorAnulacion(
  companyId: string,
  anuladas: {
    id: string;
    partnerId: string;
    cancellationNoteNumber: string | null;
    /** El tipo de la anulación (CREDIT_NOTE/DEBIT_NOTE), para notas sin ficha. */
    cancellationType?: string | null;
  }[],
): Promise<Map<string, NotaArbol[]>> {
  const mapa = new Map<string, NotaArbol[]>();
  const folios = new Set(
    anuladas
      .map((fila) => (fila.cancellationNoteNumber ? claveFolio(fila.cancellationNoteNumber) : ""))
      .filter(Boolean),
  );
  if (folios.size === 0) return mapa;

  const notas = await db.sale.findMany({
    where: { companyId, documentType: { in: noteKinds } },
    select: {
      id: true,
      documentType: true,
      documentNumber: true,
      date: true,
      totalAmount: true,
      status: true,
      partnerId: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const notasPorFolio = new Map<string, typeof notas>();
  for (const nota of notas) {
    if (!nota.documentNumber) continue;
    const clave = claveFolio(nota.documentNumber);
    const lote = notasPorFolio.get(clave) ?? [];
    lote.push(nota);
    notasPorFolio.set(clave, lote);
  }

  const fuente = (nota: (typeof notas)[number], href: string | null): NotaArbol => ({
    id: nota.id,
    documentType: nota.documentType,
    documentNumber: nota.documentNumber,
    date: nota.date,
    totalAmount: nota.totalAmount,
    status: nota.status,
    href,
  });

  for (const anulada of anuladas) {
    const folio = anulada.cancellationNoteNumber ? claveFolio(anulada.cancellationNoteNumber) : "";
    if (!folio) continue;
    const candidatos = notasPorFolio.get(folio) ?? [];
    // Preferir la nota del mismo cliente; el folio solo es fiable si además
    // no hay exactamente una candidata en toda la empresa.
    const misma =
      candidatos.find((nota) => nota.partnerId === anulada.partnerId) ??
      (candidatos.length === 1 ? candidatos[0] : undefined);
    const item = mapa.get(anulada.id) ?? [];
    if (misma) {
      item.push(fuente(misma, `/facturas/ventas/${misma.id}`));
    } else {
      // La nota que anuló no está registrada: el árbol la muestra con su
      // folio, sin link ni datos, para que se vea altiro que existe.
      item.push({
        id: `${anulada.id}-sin-ficha`,
        documentType: anulada.cancellationType ?? "CREDIT_NOTE",
        documentNumber: anulada.cancellationNoteNumber,
        href: null,
      });
    }
    mapa.set(anulada.id, item);
  }

  return mapa;
}
