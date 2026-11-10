import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { expensesBreakdown, expensesMonthlyByCategory, purchasesBreakdown } from "@/lib/reports";
import { listAreasForFilter, listCategoriesForFilter, listWorkersForFilter } from "@/lib/catalogs";
import {
  filtrosGastosToQuery,
  hayFiltrosGastos,
  paramsDesdeSearchParams,
  parseFiltrosGastos,
} from "@/lib/report-filters";
import { AnnualRankingBars, ReportHeatmap } from "@/components/report-heatmap";
import { ShareRankingBars } from "@/components/libro-charts";
import { cardClass } from "@/lib/ui";
import { ReportNav } from "../report-shell";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { PeriodPicker } from "@/components/period-picker";

/**
 * Gastos por área — con filtros y tres lecturas del mismo dato:
 *   1. En qué área se gasta (participación del período)
 *   2. En qué categoría se gasta (ranking de los últimos 12 meses)
 *   3. Cómo se reparte mes a mes (heatmap categoría × mes)
 *
 * Todas las lecturas respetan los mismos filtros: si se elige un área, los
 * tres gráficos hablan de ese área.
 */
export default async function ExpensesReportPage(props: PageProps<"/facturas/reportes/gastos">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const params = paramsDesdeSearchParams(searchParams);

  const rawPeriodo = params.get("periodo");
  const period = rawPeriodo && monthRange(rawPeriodo) ? rawPeriodo : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const filtros = parseFiltrosGastos(params);

  const [data, compras, mensual, areas, categorias, trabajadores] = await Promise.all([
    expensesBreakdown(ctx.company.id, range, filtros),
    purchasesBreakdown(ctx.company.id, range, filtros),
    expensesMonthlyByCategory(ctx.company.id, 12, filtros, period),
    listAreasForFilter(ctx.company.id),
    listCategoriesForFilter(ctx.company.id),
    listWorkersForFilter(ctx.company.id),
  ]);

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "Descripción o nota del gasto",
      grow: true,
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
    {
      kind: "select",
      name: "categoria",
      label: "Categoría",
      options: categorias.map((categoria) => ({
        value: categoria.id,
        label: categoria.active ? categoria.name : `${categoria.name} (desactivada)`,
      })),
      emptyLabel: "Todas",
    },
    {
      kind: "select",
      name: "trabajador",
      label: "Trabajador",
      options: trabajadores.map((trabajador) => ({
        value: trabajador.id,
        label: trabajador.active ? trabajador.name : `${trabajador.name} (desactivado)`,
      })),
      emptyLabel: "Todos",
    },
  ];

  const queryExport = filtrosGastosToQuery(filtros);
  const principal = data.byArea[0];
  const participationPrincipal =
    data.total > 0 && principal ? (principal.total / data.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos por área</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          En qué área y categoría se gasta el dinero de {formatPeriod(period)} en{" "}
          <span className="font-medium">{ctx.company.name}</span>.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/gastos" />

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
          href={`/facturas/reportes/gastos/export?periodo=${period}${queryExport ? `&${queryExport}` : ""}`}
          className="shrink-0 rounded-control border border-primary bg-transparent px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Exportar Excel
        </a>
      </div>

      {hayFiltrosGastos(filtros) ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          Los gráficos y las tablas de abajo responden a los filtros aplicados.
        </p>
      ) : null}

      {/* ---------------- Totales del período ---------------- */}
      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
              Gasto del período
            </p>
            <p className="mt-1 text-3xl font-bold tabular text-primary">
              {formatCLP(data.total)}
            </p>
            {principal ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {principal.name} concentra{" "}
                <span className="font-medium text-foreground">
                  {participationPrincipal.toFixed(1)}%
                </span>{" "}
                del gasto.
              </p>
            ) : null}
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Gasto del personal
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">
                {formatCLP(data.totalPersonal)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Compras
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">
                {formatCLP(compras.total)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Áreas con gasto
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{data.byArea.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-tight text-muted-foreground uppercase">
                Promedio 12 meses
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">
                {formatCLP(mensual.grandMonthlyAverage)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- Gasto por área ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Gasto por área</h2>
          <span className="text-xs text-muted-foreground">
            {formatPeriod(period)} · participación de cada área sobre el total
          </span>
        </div>
        {data.byArea.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Sin gastos en este período con los filtros aplicados.
          </p>
        ) : (
          <ShareRankingBars
            rows={data.byArea.map((row) => ({
              id: row.id,
              name: row.name,
              total: row.total,
              count: row.count,
            }))}
            total={data.total}
            etiqueta="Área"
            columnaConteo="Gastos"
          />
        )}
      </section>

      {/* ---------------- Gasto por categoría ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Gasto por categoría</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · {mensual.rows.length} categoría
            {mensual.rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        {mensual.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Sin gastos registrados en los últimos 12 meses.
          </p>
        ) : (
          <AnnualRankingBars data={mensual} etiquetaFila="Categoría" />
        )}
      </section>

      {/* ---------------- Heatmap mensual × categoría ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución mensual por categoría</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · el tono marca la intensidad del gasto
          </span>
        </div>
        <div className="p-4">
          <ReportHeatmap data={mensual} etiquetaFila="Categoría" etiquetaTotal="12 meses" />
        </div>
      </section>

      {/* ---------------- Gasto por trabajador ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Gasto por trabajador</h2>
          <span className="text-xs text-muted-foreground tabular">
            Gasto del personal: {formatCLP(data.totalPersonal)}
          </span>
        </div>
        {data.byWorker.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Ningún gasto de este período tiene trabajador asociado. Al registrar sueldos o
            aguinaldos, elige el trabajador en el formulario de gasto.
          </p>
        ) : (
          <ShareRankingBars
            rows={data.byWorker.map((row) => ({
              id: row.id,
              name: row.name,
              total: row.total,
              count: row.count,
            }))}
            total={data.totalPersonal}
            etiqueta="Trabajador"
            columnaConteo="Gastos"
          />
        )}
      </section>
    </div>
  );
}
