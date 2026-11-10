import type { DocumentType } from "@/generated/prisma/client";
import { requireContext } from "@/lib/auth";
import { formatCLP, formatDate, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { documentTypeLabel } from "@/lib/labels";
import { libroCompras, purchasesMonthly } from "@/lib/reports";
import { listAreasForFilter } from "@/lib/catalogs";
import {
  ESTADOS_COMPRA,
  filtrosToQuery,
  opcionesTipoDocumento,
  paramsDesdeSearchParams,
  parseFiltrosLibro,
} from "@/lib/report-filters";
import { cardClass } from "@/lib/ui";
import { ReportNav } from "../report-shell";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { PeriodPicker } from "@/components/period-picker";
import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { MonthlyDocBars } from "@/components/libro-charts";

export default async function LibroComprasPage(props: PageProps<"/facturas/reportes/libro-compras">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const params = paramsDesdeSearchParams(searchParams);

  const rawPeriodo = params.get("periodo");
  const period = rawPeriodo && monthRange(rawPeriodo) ? rawPeriodo : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const filtros = parseFiltrosLibro(params, ESTADOS_COMPRA);

  const [libro, mensual, areas] = await Promise.all([
    libroCompras(ctx.company.id, range, filtros),
    purchasesMonthly(ctx.company.id, 12, filtros, period),
    listAreasForFilter(ctx.company.id),
  ]);

  const { rows, totals, saldo } = libro;
  const docCount = rows.length;
  const pendientes = rows.filter((row) => row.saldo > 0).length;

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "Folio, proveedor o RUT",
      grow: true,
    },
    {
      kind: "multi",
      name: "tipo",
      label: "Tipo de documento",
      options: opcionesTipoDocumento(),
      emptyLabel: "Todos",
    },
    {
      kind: "multi",
      name: "estado",
      label: "Estado de pago",
      options: ESTADOS_COMPRA.map((estado) => ({ value: estado.value, label: estado.label })),
      emptyLabel: "Todos",
    },
    {
      kind: "select",
      name: "area",
      label: "Área",
      options: areas.map((area) => ({
        value: area.id,
        label: area.active ? area.name : `${area.name} (desactivada)`,
      })),
      emptyLabel: "Todas",
    },
  ];

  const queryExport = filtrosToQuery(filtros);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Libro de compras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos de compra de {formatPeriod(period)}. Las notas de crédito restan.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/libro-compras" />

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <FilterBar
            fields={filterFields}
            showDateRange={false}
            keepKeys={["periodo"]}
            leading={<PeriodPicker period={period} />}
          />
        </div>
        <a
          href={`/facturas/reportes/libro-compras/export?periodo=${period}${queryExport ? `&${queryExport}` : ""}`}
          className="shrink-0 rounded-control border border-primary bg-transparent px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Exportar Excel
        </a>
      </div>

      {/* ---------------- Totales del período ---------------- */}
      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
              Total del período
            </p>
            <p className="mt-1 text-3xl font-bold tabular text-primary">
              {formatCLP(totals.total)}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Neto
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{formatCLP(totals.net)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                IVA
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{formatCLP(totals.iva)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Documentos
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{docCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Pendiente de pago
              </dt>
              <dd
                className={
                  "mt-0.5 text-lg font-semibold tabular " + (saldo > 0 ? "text-accent" : "")
                }
              >
                {formatCLP(saldo)}
              </dd>
            </div>
          </dl>
        </div>
        {pendientes > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {pendientes} de {docCount} documentos todavía tienen saldo pendiente.
          </p>
        ) : null}
      </section>

      {/* ---------------- Gráfico mensual ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución mensual de compras</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · el mes abierto en el libro sale resaltado
          </span>
        </div>
        <div className="p-4">
          {mensual.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Sin compras registradas en los últimos 12 meses.
            </p>
          ) : (
            <MonthlyDocBars data={mensual} kind="compras" highlightMonth={period} />
          )}
        </div>
      </section>

      {/* ---------------- Tabla del libro ---------------- */}
      <section className={cardClass + " overflow-x-auto"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Detalle de documentos</h2>
          <span className="text-xs text-muted-foreground tabular">
            {docCount} documento{docCount !== 1 ? "s" : ""} · {formatCLP(totals.total)} total
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay compras registradas en este período con los filtros aplicados.
          </p>
        ) : (
          <table className="w-full min-w-[72rem] text-sm">
            <caption className="sr-only">Libro de compras del período</caption>
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-medium w-20">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-28">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-20">
                  Folio
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-52">
                  Proveedor
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-32">
                  Área
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-24">
                  Neto
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-24">
                  IVA
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-28">
                  Total
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-36">
                  Estado
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-24">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 group hover:bg-surface/30 transition-colors"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 tabular text-[11px]">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        row.documentType === "CREDIT_NOTE"
                          ? "bg-danger-soft text-danger"
                          : row.documentType === "DEBIT_NOTE"
                            ? "bg-accent-soft text-accent"
                            : "bg-primary-soft text-primary"
                      }`}
                    >
                      {documentTypeLabel(row.documentType as DocumentType)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular text-[11px]">
                    {row.documentNumber ?? "—"}
                    {row.referenceDocumentNumber ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ref. {row.referenceDocumentNumber}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-[11px]">
                    <span className="block truncate max-w-[20rem] font-medium">{row.partnerName}</span>
                    <span className="block tabular text-[10px] text-muted-foreground">
                      {row.partnerRut ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    {row.areaName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-[11px]">
                    {formatCLP(row.net)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-[11px]">
                    {formatCLP(row.iva)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular font-medium text-[11px]">
                    {formatCLP(row.total)}
                  </td>
                  <td className="px-3 py-2.5">
                    <PurchaseStatusBadge status={row.status} />
                  </td>
                  <td
                    className={
                      "px-3 py-2.5 text-right tabular text-[11px] " +
                      (row.saldo > 0 ? "font-medium text-accent" : "text-muted-foreground")
                    }
                  >
                    {row.saldo > 0 ? formatCLP(row.saldo) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border font-semibold">
              <tr>
                <td className="px-3 py-3" colSpan={5}>
                  Totales
                </td>
                <td className="px-3 py-3 text-right tabular">{formatCLP(totals.net)}</td>
                <td className="px-3 py-3 text-right tabular">{formatCLP(totals.iva)}</td>
                <td className="px-3 py-3 text-right tabular font-medium text-primary">
                  {formatCLP(totals.total)}
                </td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right tabular text-accent">{formatCLP(saldo)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
