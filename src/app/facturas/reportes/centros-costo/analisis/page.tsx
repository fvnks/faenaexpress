import Link from "next/link";

import { MonthlyBarsChart, RankBars } from "@/components/charts";
import { ReportHeatmap } from "@/components/report-heatmap";
import { requireContext } from "@/lib/auth";
import {
  cargarAnalisisCentros,
  etiquetaVariacion,
} from "@/lib/centros-costo-analytics";
import { formatCLP, formatDate, formatPeriod, monthRange, currentPeriod } from "@/lib/money";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../../report-shell";

export default async function AnalisisCentrosCostoPage(
  props: PageProps<"/facturas/reportes/centros-costo/analisis">,
) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo)
    ? searchParams.periodo[0]
    : searchParams.periodo;
  const periodo = raw && monthRange(raw) ? raw : currentPeriod();
  const analisis = await cargarAnalisisCentros(ctx.company.id, periodo, 12);

  const ranking = analisis.centros
    .map((centro) => ({ label: `${centro.codigo} · ${centro.nombre}`, total: centro.total }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 8);

  const variacionPositiva = analisis.variacion >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Índice / Análisis
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Análisis de centros de costo</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Compras, ventas y gastos indirectos imputados a cada centro durante los últimos 12 meses, hasta {formatPeriod(periodo)}. Los importes son CLP, con el signo de las notas de crédito.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/facturas/reportes/centros-costo/analisis/export?periodo=${periodo}&vista=resumen`}
            className={secondaryButtonClass}
          >
            Exportar resumen
          </Link>
          <Link
            href={`/facturas/reportes/centros-costo/analisis/export?periodo=${periodo}&vista=detalle`}
            className={secondaryButtonClass}
          >
            Exportar detalle
          </Link>
        </div>
      </div>

      <ReportNav active="/facturas/reportes/centros-costo/analisis" />
      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter period={periodo} />
        <Link
          href="/facturas/centros-costo"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Configurar centros →
        </Link>
      </div>

      <section className={`${cardClass} p-5`}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total asignado", value: formatCLP(analisis.totales.total) },
            {
              label: "Variación mensual",
              value: etiquetaVariacion(analisis.variacion),
              tone: variacionPositiva ? "text-success" : "text-danger",
            },
            { label: "Compras", value: formatCLP(analisis.totales.compras) },
            { label: "Ventas", value: formatCLP(analisis.totales.ventas) },
            { label: "Gastos", value: formatCLP(analisis.totales.gastos) },
          ].map((kpi) => (
            <div key={kpi.label}>
              <dt className="text-sm text-muted-foreground">{kpi.label}</dt>
              <dd className={`tabular mt-1 text-lg font-semibold ${kpi.tone ?? ""}`}>{kpi.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {analisis.totales.documentos} documentos · {analisis.totales.centrosActivos} centros activos ·{" "}
          {formatCLP(analisis.totales.sinAsignar)} en centros «Sin asignar».
        </p>
      </section>

      <section className={`${cardClass} p-5`}>
        <div className="border-b border-border pb-3">
          <h2 className="font-semibold">Evolución mensual</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Total imputado por mes, separado por origen del documento.
          </p>
        </div>
        <div className="mt-5">
          <MonthlyBarsChart data={analisis.meses} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Centros con mayor imputación</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Suma absoluta de los 12 meses.</p>
          <div className="mt-5">
            <RankBars items={ranking} emptyLabel="No hay imputaciones en este período." />
          </div>
        </section>

        <section className={`${cardClass} overflow-x-auto p-5`}>
          <h2 className="font-semibold">Totales por centro</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Centro</th>
                <th className="py-2 text-right">Compras</th>
                <th className="py-2 text-right">Ventas</th>
                <th className="py-2 text-right">Gastos</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analisis.centros.map((centro) => (
                <tr key={centro.id}>
                  <td className="py-2 pr-4">
                    <span className="font-mono text-xs text-primary">{centro.codigo}</span>{" "}
                    <span className="text-muted-foreground">{centro.nombre}</span>
                    {centro.esSinAsignar ? (
                      <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary">
                        Sin asignar
                      </span>
                    ) : null}
                  </td>
                  <td className="tabular py-2 text-right">{formatCLP(centro.compras)}</td>
                  <td className="tabular py-2 text-right">{formatCLP(centro.ventas)}</td>
                  <td className="tabular py-2 text-right">{formatCLP(centro.gastos)}</td>
                  <td className="tabular py-2 text-right font-semibold">{formatCLP(centro.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className={`${cardClass} overflow-x-auto p-5`}>
        <h2 className="font-semibold">Matriz centro × mes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          El tono acompaña al monto; la cifra siempre está escrita.
        </p>
        <div className="mt-5 min-w-[52rem]">
          <ReportHeatmap data={analisis.matriz} etiquetaFila="Centro de costo" />
        </div>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <details>
          <summary className="cursor-pointer border-b border-border px-4 py-3 font-semibold">
            Desglose por documento ({analisis.documentos.length})
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Centro</th>
                  <th className="px-4 py-2 text-left">Documento</th>
                  <th className="px-4 py-2 text-left">Tercero</th>
                  <th className="px-4 py-2 text-right">Monto imputado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analisis.documentos.map((doc) => (
                  <tr key={`${doc.tipo}-${doc.id}`}>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(doc.fecha)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{doc.centroNombre}</td>
                    <td className="px-4 py-2">
                      <Link href={doc.href} className="text-primary hover:underline">
                        {doc.tipo === "compra" ? "Compra" : doc.tipo === "venta" ? "Venta" : "Gasto"} {doc.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{doc.tercero}</td>
                    <td className="tabular px-4 py-2 text-right">{formatCLP(doc.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
