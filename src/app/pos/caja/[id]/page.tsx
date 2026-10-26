import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintCloseButton } from "@/app/pos/caja/[id]/print-close-button";
import { formatPosDateTime, formatPosTime } from "@/app/pos/fecha";
import { requireContext } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { getPosSessionReport } from "@/lib/pos";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

function differenceLabel(difference: number) {
  if (difference === 0) return { text: "Cuadrada", tone: "text-success" };
  return difference < 0
    ? { text: `Faltan ${formatCLP(-difference)}`, tone: "text-danger" }
    : { text: `Sobran ${formatCLP(difference)}`, tone: "text-accent" };
}

function Row({
  label,
  value,
  valueClass,
  strong = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-6">
      <dt className={strong ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd className={"tabular" + (strong ? " font-semibold" : "") + (valueClass ? ` ${valueClass}` : "")}>
        {value}
      </dd>
    </div>
  );
}

export default async function PosCierrePage(props: PageProps<"/pos/caja/[id]">) {
  const ctx = await requireContext();
  const { id } = await props.params;
  const report = await getPosSessionReport(ctx.company.id, id);

  if (!report) notFound();

  const cashSales = report.byMethod
    .filter((row) => row.method.toLowerCase().includes("efectivo"))
    .reduce((sum, row) => sum + row.amount, 0);
  const expectedCash = report.openingAmount + cashSales;
  // El contado solo existe en una caja cerrada; la variable aparte deja que TS
  // estreche el null.
  const closingAmount = report.status === "CLOSED" ? report.closingAmount : null;
  const difference = closingAmount === null ? null : closingAmount - expectedCash;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/pos/caja" className={secondaryButtonClass}>
          Volver a caja
        </Link>
        <PrintCloseButton />
      </div>

      <article className={cardClass + " p-6 print:border-0 print:p-0"}>
        <header className="border-b border-border pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Cierre de caja</p>
              <h1 className="text-lg font-bold tracking-tight">{ctx.company.name}</h1>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Cajero: {report.openedByName}</p>
              <p>
                Apertura: {formatPosDateTime(report.openedAt)}
              </p>
              <p>
                Cierre:{" "}
                {report.closedAt ? formatPosDateTime(report.closedAt) : "Caja todavía abierta"}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold">Resumen del turno</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label="Tickets" value={String(report.totals.count)} />
              <Row label="Neto" value={formatCLP(report.totals.net)} />
              <Row label="IVA" value={formatCLP(report.totals.tax)} />
              <Row label="Total vendido" value={formatCLP(report.totals.total)} strong />
              {report.totals.voidedCount > 0 ? (
                <>
                  <Row
                    label="Tickets anulados"
                    value={String(report.totals.voidedCount)}
                  />
                  <Row
                    label="Monto anulado"
                    value={formatCLP(report.totals.voidedTotal)}
                  />
                </>
              ) : null}
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Por medio de pago</h2>
            {report.byMethod.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Sin pagos registrados en este turno.
              </p>
            ) : (
              <dl className="mt-2 space-y-1.5 text-sm">
                {report.byMethod.map((row) => (
                  <Row key={row.method} label={row.method} value={formatCLP(row.amount)} />
                ))}
              </dl>
            )}
          </section>
        </div>

        <section className="mt-5 border-t border-border pt-4">
          <h2 className="text-sm font-semibold">Efectivo</h2>
          <dl className="mt-2 max-w-sm space-y-1.5 text-sm">
            <Row label="Apertura" value={formatCLP(report.openingAmount)} />
            <Row label="Ventas en efectivo" value={formatCLP(cashSales)} />
            <Row label="Efectivo esperado" value={formatCLP(expectedCash)} strong />
            {closingAmount !== null ? (
              <>
                <Row label="Efectivo contado" value={formatCLP(closingAmount)} strong />
                <Row
                  label="Diferencia"
                  value={differenceLabel(difference!).text}
                  valueClass={"font-semibold " + differenceLabel(difference!).tone}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                El efectivo contado se registra al cerrar la caja.
              </p>
            )}
          </dl>
        </section>

        <section className="mt-5 border-t border-border pt-4">
          <h2 className="text-sm font-semibold">Tickets del turno</h2>
          {report.sales.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No hubo ventas en este turno.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Ticket</th>
                  <th className="pb-2">Hora</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Pago</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.sales.map((sale: { id: string; saleNumber: string; createdAt: Date; status: string; partnerName: string; payments: string[]; total: number }) => (
                  <tr
                    key={sale.id}
                    className={"tabular" + (sale.status === "VOIDED" ? " text-muted-foreground line-through" : "")}
                  >
                    <td className="py-1.5 pr-2 font-mono text-xs">
                      {sale.saleNumber}
                      {sale.status === "VOIDED" ? " (anulada)" : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {formatPosTime(sale.createdAt)}
                    </td>
                    <td className="max-w-[10rem] truncate py-1.5 pr-2">{sale.partnerName}</td>
                    <td className="py-1.5 pr-2 text-xs text-muted-foreground">
                      {sale.payments.length === 0 ? "—" : [...new Set(sale.payments)].join(" + ")}
                    </td>
                    <td className="py-1.5 text-right">{formatCLP(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {report.notes ? (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Nota: {report.notes}
          </p>
        ) : null}

        <footer className="mt-5 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          <p>Documento interno de control. No reemplaza el libro de ventas del SII.</p>
        </footer>
      </article>
    </div>
  );
}
