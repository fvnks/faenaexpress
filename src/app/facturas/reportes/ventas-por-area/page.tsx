import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { salesByArea, salesMonthly, salesMonthlyByArea } from "@/lib/reports";
import { listSalespeopleForFilter } from "@/lib/catalogs";
import {
  ESTADOS_VENTA,
  filtrosToQuery,
  opcionesTipoDocumento,
  paramsDesdeSearchParams,
  parseFiltrosLibro,
} from "@/lib/report-filters";
import { ReportHeatmap } from "@/components/report-heatmap";
import { MonthlyDocBars, ShareRankingBars } from "@/components/libro-charts";
import { cardClass } from "@/lib/ui";
import { ReportNav } from "../report-shell";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { PeriodPicker } from "@/components/period-picker";

/**
 * Ventas por área — el mismo dinero visto por donde se generó.
 *
 * Tres lecturas: qué área vende más, cómo evoluciona cada área mes a mes y
 * cómo se reparte el total. Todas respetan los filtros de la barra.
 */
export default async function VentasPorAreaPage(
  props: PageProps<"/facturas/reportes/ventas-por-area">,
) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const params = paramsDesdeSearchParams(searchParams);

  const rawPeriodo = params.get("periodo");
  const period = rawPeriodo && monthRange(rawPeriodo) ? rawPeriodo : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const filtros = parseFiltrosLibro(params, ESTADOS_VENTA);

  const [porArea, mensual, matriz, vendedores] = await Promise.all([
    salesByArea(ctx.company.id, range, filtros),
    salesMonthly(ctx.company.id, 12, filtros, period),
    salesMonthlyByArea(ctx.company.id, 12, filtros, period),
    listSalespeopleForFilter(ctx.company.id),
  ]);

  const principal = porArea.rows[0];
  const participacionPrincipal =
    porArea.total > 0 && principal ? (principal.total / porArea.total) * 100 : 0;
  const documentos = porArea.rows.reduce((acc, row) => acc + row.count, 0);

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "Folio, cliente o RUT",
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
      label: "Estado de cobro",
      options: ESTADOS_VENTA.map((estado) => ({ value: estado.value, label: estado.label })),
      emptyLabel: "Todos",
    },
    {
      kind: "select",
      name: "vendedor",
      label: "Vendedor",
      options: vendedores.map((vendedor) => ({
        value: vendedor.id,
        label: vendedor.active ? vendedor.name : `${vendedor.name} (desactivado)`,
      })),
      emptyLabel: "Todos",
    },
  ];

  const queryExport = filtrosToQuery(filtros);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas por área</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué parte de las ventas de {formatPeriod(period)} corresponde a cada área de{" "}
          <span className="font-medium">{ctx.company.name}</span>.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/ventas-por-area" />

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
          href={`/facturas/reportes/ventas-por-area/export?periodo=${period}${queryExport ? `&${queryExport}` : ""}`}
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
              Venta del período
            </p>
            <p className="mt-1 text-3xl font-bold tabular text-primary">
              {formatCLP(porArea.total)}
            </p>
            {principal ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {principal.name} lidera con{" "}
                <span className="font-medium text-foreground">
                  {participacionPrincipal.toFixed(1)}%
                </span>{" "}
                del total.
              </p>
            ) : null}
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Áreas con venta
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{porArea.rows.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Documentos
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{documentos}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Ticket promedio
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">
                {formatCLP(documentos > 0 ? porArea.total / documentos : 0)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Promedio 12 meses
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">
                {formatCLP(
                  matriz.grandTotal > 0 ? matriz.grandTotal / Math.max(1, matriz.months.length) : 0,
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- Ranking por área ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Venta por área</h2>
          <span className="text-xs text-muted-foreground">
            {formatPeriod(period)} · participación de cada área sobre el total
          </span>
        </div>
        {porArea.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay ventas en este período con los filtros aplicados.
          </p>
        ) : (
          <ShareRankingBars
            rows={porArea.rows.map((row) => ({
              id: row.id,
              name: row.name,
              total: row.total,
              count: row.count,
            }))}
            total={porArea.total}
            etiqueta="Área"
          />
        )}
      </section>

      {/* ---------------- Evolución mensual ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución mensual de las ventas</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · el mes abierto en el reporte sale resaltado
          </span>
        </div>
        <div className="p-4">
          {mensual.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Sin ventas registradas en los últimos 12 meses.
            </p>
          ) : (
            <MonthlyDocBars data={mensual} kind="ventas" highlightMonth={period} />
          )}
        </div>
      </section>

      {/* ---------------- Área × mes ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución por área</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · el tono marca la intensidad de la venta
          </span>
        </div>
        <div className="p-4">
          <ReportHeatmap data={matriz} etiquetaFila="Área" etiquetaTotal="12 meses" />
        </div>
      </section>
    </div>
  );
}
