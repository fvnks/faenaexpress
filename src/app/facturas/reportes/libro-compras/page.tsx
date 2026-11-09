import type { DocumentType } from "@/generated/prisma/client";
import { requireContext } from "@/lib/auth";
import { formatCLP, formatDate, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { documentTypeLabel } from "@/lib/labels";
import { libroCompras, purchasesMonthly } from "@/lib/reports";
import { documentTypeValues } from "@/lib/validation";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";
import { MonthlyDocBars } from "@/components/libro-charts";

export default async function LibroComprasPage(props: PageProps<"/facturas/reportes/libro-compras">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const rawTipo = Array.isArray(searchParams.tipo) ? searchParams.tipo[0] : searchParams.tipo;
  const tipo = documentTypeValues.find((v) => v === rawTipo) ?? null;

  const [libro, mensual] = await Promise.all([
    libroCompras(ctx.company.id, range, tipo),
    purchasesMonthly(ctx.company.id, 12, tipo),
  ]);

  const { rows, totals } = libro;

  const avgMonthly =
    mensual.length > 0 ? totals.total / mensual.length : 0;
  const docCount = rows.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Libro de compras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos de compra de {formatPeriod(period)}. Las notas de crédito restan.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/libro-compras" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodFilter period={period} />
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="periodo" value={period} />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Tipo
            <select
              name="tipo"
              defaultValue={tipo ?? ""}
              className="rounded-control border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {documentTypeValues
                .filter((v) => v !== "QUOTATION")
                .map((v) => (
                  <option key={v} value={v}>
                    {documentTypeLabel(v as DocumentType)}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className="rounded-control border border-primary bg-transparent px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
            Filtrar
          </button>
        </form>
        <a
          href={`/facturas/reportes/libro-compras/export?periodo=${period}${tipo ? `&tipo=${tipo}` : ""}`}
          className="rounded-control border border-primary bg-transparent px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          Exportar Excel
        </a>
      </div>

      {/* ---------------- KPIs del período ---------------- */}
      <section className={cardClass + " p-5"}>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Total del período
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular text-primary">
              {formatCLP(totals.total)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              IVA del período
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {formatCLP(totals.iva)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Documentos
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {docCount}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Promedio mensual (12m)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {formatCLP(avgMonthly)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Neto del período
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {formatCLP(totals.net)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------------- Gráfico mensual ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución mensual de compras</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · monto total por mes
          </span>
        </div>
        {mensual.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Sin compras registradas en los últimos 12 meses.
          </p>
        ) : (
          <MonthlyDocBars data={mensual} kind="compras" />
        )}
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
            No hay compras registradas en este período.
          </p>
        ) : (
          <table className="w-full min-w-[64rem] text-sm">
            <caption className="sr-only">Libro de compras del período</caption>
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-medium w-20">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-12">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-16">
                  Folio
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-16">
                  RUT
                </th>
                <th scope="col" className="px-3 py-3 font-medium w-40">
                  Proveedor
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-20">
                  Neto
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-20">
                  IVA
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-20">
                  Total
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium w-16">
                  Mensual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const monthBucket = mensual.find((m) => {
                  const d = new Date(row.date);
                  const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                  return m.month === mKey;
                });
                const monthTotal = monthBucket?.total ?? 0;

                return (
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
                    <td className="whitespace-nowrap px-3 py-2.5 tabular text-[11px]">
                      {row.partnerRut ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] truncate max-w-[16rem]">
                      {row.partnerName}
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
                    <td className="px-3 py-2.5 text-right">
                      {monthTotal > 0 ? (
                        <span className="text-[10px] tabular text-muted-foreground">
                          {formatCLP(monthTotal)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
                <td className="px-3 py-3 text-right tabular text-[11px] text-muted-foreground">
                  {formatCLP(mensual.reduce((acc, m) => acc + m.total, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
