import Link from "next/link";

import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { SyncSiiMenu } from "@/components/sync-sii-menu";
import { NoteDocumentLink } from "@/app/facturas/ventas/notas/note-sale-link";
import { canWrite, requireContext } from "@/lib/auth";
import { listCustomers } from "@/lib/partners";
import { listSalespeople } from "@/lib/catalogs";
import {
  candidatosParaNota,
  listNotes,
  listNotePeriods,
  parseNoteFilters,
  type NoteKind,
} from "@/lib/sale-notes";
import { formatCLP, formatDate, formatPeriod } from "@/lib/money";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Tipos SII que trae una sincronización de notas: NC (41, 46) y ND (56). */
const TIPOS_NOTAS = "41,46,56";

const TITULOS: Record<NoteKind, { titulo: string; detalle: string }> = {
  CREDIT_NOTE: {
    titulo: "Notas de Crédito",
    detalle:
      "Notas de crédito emitidas y recibidas, con la factura o la guía que ajustan.",
  },
  DEBIT_NOTE: {
    titulo: "Notas de Débito",
    detalle:
      "Notas de débito emitidas y recibidas, con la factura o la guía que ajustan.",
  },
};

/**
 * La pantalla de notas de crédito y de débito: la misma estructura que Ventas
 * y Guías (filtros en la URL, paginación, totales y sincronización por mes) y,
 * además, la columna del DOCUMENTO QUE AJUSTA, que es lo propio de una nota.
 */
export async function NotasScreen({
  kind,
  searchParams,
}: {
  kind: NoteKind;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireContext("ventas");

  const raw = {
    q: one(searchParams.q),
    cliente: one(searchParams.cliente),
    vendedor: one(searchParams.vendedor),
    mes: one(searchParams.mes),
    relacion: one(searchParams.relacion),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
    orden: one(searchParams.orden),
    dir: one(searchParams.dir),
    pagina: one(searchParams.pagina),
  };
  const filters = parseNoteFilters(raw);

  const [customers, salespeople, periodos, listado] = await Promise.all([
    listCustomers(ctx.company.id),
    listSalespeople(ctx.company.id),
    listNotePeriods(ctx.company.id, kind),
    listNotes(ctx.company.id, kind, filters),
  ]);
  const { items, totals, page, pageCount } = listado;

  const hasFilters = Boolean(
    raw.q || raw.cliente || raw.vendedor || raw.mes || raw.relacion || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "ventas");
  const destino = kind === "CREDIT_NOTE" ? "/facturas/ventas/nota-credito" : "/facturas/ventas/nota-debito";

  // Los documentos que cada nota puede ajustar: los del mismo cliente.
  const candidatos = await Promise.all(
    [...new Set(items.map((n) => n.partnerId))].map(async (partnerId) => [
      partnerId,
      await candidatosParaNota(ctx.company.id, partnerId),
    ] as const),
  );
  const porCliente = new Map(candidatos);

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "N° nota, cliente, RUT, folio original…",
      grow: true,
    },
    {
      kind: "select",
      name: "cliente",
      label: "Cliente",
      emptyLabel: "Todos",
      width: "w-full sm:w-52",
      options: customers.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      kind: "select",
      name: "vendedor",
      label: "Vendedor",
      emptyLabel: "Todos",
      width: "w-full sm:w-48",
      options: salespeople.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      kind: "select",
      name: "mes",
      label: "Mes",
      emptyLabel: "Todos los meses",
      width: "w-full sm:w-44",
      options: periodos.map((p) => ({ value: p, label: formatPeriod(p) })),
    },
    {
      kind: "select",
      name: "relacion",
      label: "Documento ajustado",
      emptyLabel: "Todas",
      width: "w-full sm:w-52",
      options: [
        { value: "relacionadas", label: "Con factura o guía" },
        { value: "sin_relacionar", label: "Sin relacionar" },
      ],
    },
  ];

  const { titulo, detalle } = TITULOS[kind];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detalle}
            {raw.mes ? ` Mes de ${formatPeriod(raw.mes)}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {writable ? (
            <>
              {canWrite(ctx, "importar") ? (
                <SyncSiiMenu
                  side="VENTA"
                  buttonClass={secondaryButtonClass}
                  tipos={TIPOS_NOTAS}
                  destino={destino}
                  etiqueta="Sincronizar SII"
                />
              ) : null}
              <Link href="/facturas/ventas/nueva" className={primaryButtonClass}>
                Nueva nota
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <FilterBar fields={filterFields} />

      <div className={cardClass + " grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x"}>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Total de notas</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(totals.total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.count} {totals.count === 1 ? "nota" : "notas"}
          </p>
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <p className="text-xs text-muted-foreground">Con factura o guía</p>
          <p className="tabular mt-1 text-2xl font-bold text-success">{totals.relacionadas}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">relacionadas</p>
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <p className="text-xs text-muted-foreground">Sin relacionar</p>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{totals.sinRelacionar}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">falta elegir el documento</p>
        </div>
        <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
          <p className="text-xs text-muted-foreground">Con vendedor</p>
          <p className="tabular mt-1 text-2xl font-bold">
            {items.filter((n) => n.salespersonName !== null).length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">de esta página</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">
            {hasFilters
              ? "No hay notas que coincidan con el filtro."
              : `Aún no registra ${titulo.toLowerCase()}.`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba con otro cliente, vendedor, mes o búsqueda."
              : "Las notas se traen del SII con la sincronización, o se registran a mano desde Ventas."}
          </p>
          {!hasFilters && writable ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canWrite(ctx, "importar") ? (
                <SyncSiiMenu
                  side="VENTA"
                  buttonClass={secondaryButtonClass}
                  tipos={TIPOS_NOTAS}
                  destino={destino}
                  etiqueta="Sincronizar SII"
                />
              ) : null}
              <Link href="/facturas/ventas/nueva" className={primaryButtonClass}>
                Nueva nota
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  N° nota
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Documento que ajusta
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => {
                const docs = porCliente.get(n.partnerId);
                return (
                  <tr
                    key={n.id}
                    className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors"
                  >
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                      {formatDate(n.date)}
                    </td>
                    <td className="tabular px-3 py-2 align-top">
                      {n.documentNumber ?? "—"}
                      {n.folioOriginal && n.folioOriginal !== n.documentNumber ? (
                        <span className="block text-xs text-muted-foreground">
                          folio original {n.folioOriginal}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {n.partnerName}
                      <span className="block text-xs text-muted-foreground">
                        {n.salespersonName ?? "sin vendedor"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {n.related ? (
                        <Link
                          href={
                            n.related.tipo === "venta"
                              ? `/facturas/ventas/${n.related.id}`
                              : `/facturas/ventas/guias`
                          }
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          {n.related.tipo === "venta" ? "Factura" : "Guía"} N° {n.related.etiqueta}
                        </Link>
                      ) : null}
                      <NoteDocumentLink
                        noteId={n.id}
                        related={n.related}
                        facturas={docs?.facturas ?? []}
                        guias={docs?.guias ?? []}
                        puedeEditar={writable}
                      />
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                      {formatCLP(n.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pathname={destino}
        params={searchParams}
        page={page}
        pageCount={pageCount}
        total={totals.count}
      />
    </div>
  );
}
