import { requireContext } from "@/lib/auth";
import type { DocumentType } from "@/generated/prisma/client";
import { formatCLP, formatDate, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { documentTypeLabel } from "@/lib/labels";
import { libroCompras } from "@/lib/reports";
import { documentTypeValues } from "@/lib/validation";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

export default async function LibroComprasPage(props: PageProps<"/facturas/reportes/libro-compras">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const rawTipo = Array.isArray(searchParams.tipo) ? searchParams.tipo[0] : searchParams.tipo;
  const tipo = documentTypeValues.find((v) => v === rawTipo) ?? null;

  const { rows, totals } = await libroCompras(ctx.company.id, range, tipo);

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
          <button type="submit" className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground">
            Filtrar
          </button>
        </form>
        <a
          href={`/facturas/reportes/libro-compras/export?periodo=${period}${tipo ? `&tipo=${tipo}` : ""}`}
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Exportar Excel
        </a>
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay compras registradas en este período.
          </p>
        ) : (
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">Libro de compras del período</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-medium">Fecha</th>
                <th scope="col" className="px-3 py-3 font-medium">Tipo</th>
                <th scope="col" className="px-3 py-3 font-medium">Folio</th>
                <th scope="col" className="px-3 py-3 font-medium">RUT</th>
                <th scope="col" className="px-3 py-3 font-medium">Proveedor</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Neto</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">IVA</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 tabular">{formatDate(row.date)}</td>
                  <td className="px-3 py-2.5">{documentTypeLabel(row.documentType as DocumentType)}</td>
                  <td className="px-3 py-2.5">
                    {row.documentNumber ?? "—"}
                    {row.referenceDocumentNumber ? (
                      <span className="text-xs text-muted-foreground"> ref. {row.referenceDocumentNumber}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular">{row.partnerRut ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.partnerName}</td>
                  <td className="px-3 py-2.5 text-right tabular">{formatCLP(row.net)}</td>
                  <td className="px-3 py-2.5 text-right tabular">{formatCLP(row.iva)}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular">{formatCLP(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="px-3 py-3" colSpan={5}>
                  Totales
                </td>
                <td className="px-3 py-3 text-right tabular">{formatCLP(totals.net)}</td>
                <td className="px-3 py-3 text-right tabular">{formatCLP(totals.iva)}</td>
                <td className="px-3 py-3 text-right tabular">{formatCLP(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
