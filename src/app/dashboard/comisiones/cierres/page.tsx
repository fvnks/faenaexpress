import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { listCommissionHistory } from "@/lib/commissions";
import { formatCLP, formatDate, formatPeriod } from "@/lib/money";
import { cardClass } from "@/lib/ui";
import { CommissionNav, Money } from "../commission-shell";

export default async function ClosesPage() {
  const ctx = await requireContext("comisiones");

  const history = await listCommissionHistory(ctx.company.id);
  const grandTotal = history.reduce((sum, month) => sum + month.commission, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meses cerrados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que ya se congeló. Cerrar un mes congela tasa, base y comisión en ese momento:
          nada de lo que pase después en las facturas lo modifica. No se puede reabrir.
        </p>
      </div>

      <CommissionNav active="/dashboard/comisiones/cierres" />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Todos los meses cerrados, de más reciente a más antiguo.
        </p>
        <span className="text-sm text-muted-foreground">
          {history.length} mes(es) cerrado(s) ·{" "}
          <span className="tabular text-foreground font-semibold">{formatCLP(grandTotal)}</span>{" "}
          congelados
        </span>
      </div>

      {history.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Todavía no se ha cerrado ningún mes. Cuando cierres uno desde{" "}
            <Link
              href="/dashboard/comisiones"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Resumen
            </Link>
            , su cifra aparecerá acá para siempre.
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((month) => (
            <section key={month.period} className={cardClass + " overflow-hidden"}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="font-semibold">{formatPeriod(month.period)}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cerrado el {formatDate(month.closedAt)} por {month.closedByName} ·{" "}
                    {month.lineCount} línea{month.lineCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total comisionado</div>
                  <Money className="text-lg font-bold">{formatCLP(month.commission)}</Money>
                </div>
              </div>

              {month.people.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">
                  Se cerró sin ninguna línea de comisión.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <caption className="sr-only">
                      Comisión congelada por vendedor en {formatPeriod(month.period)}
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                        <th scope="col" className="px-5 py-2 font-medium">
                          Vendedor
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Base (neto)
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Docs
                        </th>
                        <th scope="col" className="px-5 py-2 text-right font-medium">
                          Comisión
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {month.people.map((person) => (
                        <tr
                          key={person.salespersonName}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-5 py-2.5 font-medium">{person.salespersonName}</td>
                          <td className="tabular px-3 py-2.5 text-right">
                            <Money>{formatCLP(person.base)}</Money>
                          </td>
                          <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                            {person.count}
                          </td>
                          <td className="tabular px-5 py-2.5 text-right font-semibold">
                            <Money>{formatCLP(person.commission)}</Money>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-border px-5 py-3">
                <Link
                  href={`/dashboard/comisiones?periodo=${month.period}`}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  Ver el detalle documento a documento →
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
