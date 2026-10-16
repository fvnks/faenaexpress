import Link from "next/link";

import { closePayrollPeriodAction, generatePayrollEntriesAction, reopenPayrollPeriodAction, updatePayrollEntryAction } from "@/app/actions/payroll";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { payrollStatusLabels } from "@/lib/payroll";
import { cardClass } from "@/lib/ui";

export default async function PayrollPeriodPage(props: PageProps<"/dashboard/rrhh/nomina/[periodId]">) {
  const ctx = await requireContext("rrhh");
  const writable = canWrite(ctx, "rrhh");
  const params = await props.params;
  const periodId = params.periodId;
  const searchParams = await props.searchParams;
  const pageError = typeof searchParams?.error === "string" ? searchParams.error : null;

  const [period, entries, company] = await Promise.all([
    db.payrollPeriod.findFirst({ where: { id: periodId, companyId: ctx.company.id } }),
    db.payrollEntry.findMany({
      where: { periodId },
      orderBy: { worker: { name: "asc" } },
      include: { worker: { select: { id: true, name: true, baseAmount: true } } },
    }),
    db.company.findUnique({
      where: { id: ctx.company.id },
      select: { afpRate: true, healthRate: true, unemploymentRate: true, anualBonusRate: true },
    }),
  ]);
  if (!period) return <div className="p-6">Periodo no encontrado.</div>;

  const totals = entries.reduce(
    (acc, entry) => ({
      gross: acc.gross + entry.grossAmount,
      deductions: acc.deductions + entry.deductionsTotal,
      net: acc.net + entry.netAmount,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  const isClosed = period.status === "CLOSED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/rrhh/nomina" className="text-sm text-primary underline-offset-2 hover:underline">
            ← Volver a nómina
          </Link>
          <a href={`/dashboard/rrhh/nomina/${period.id}/export/xlsx`} className="ml-4 text-sm text-primary underline-offset-2 hover:underline">
            Exportar Excel
          </a>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Nomina {period.year}-{String(period.month).padStart(2, "0")}
          </h1>
          {pageError ? <div className="mt-2 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{pageError}</div> : null}
          <p className="mt-1 text-sm text-muted-foreground">
            Estado: {payrollStatusLabels[period.status]} · Fuente de tasas: {period.ratesSource ?? "configuración o trabajador"} · Tasas empresa AFP {company?.afpRate ?? 0}% / salud {company?.healthRate ?? 0}% / cesantía {company?.unemploymentRate ?? 0}%.
          </p>
        </div>
        {writable ? (
          <div className="flex flex-wrap items-end gap-2">
            {entries.length === 0 ? (
              <form action={generatePayrollEntriesAction}>
                <input type="hidden" name="periodId" value={period.id} />
                <button type="submit" className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary">
                  Generar liquidaciones
                </button>
              </form>
            ) : null}
            {!isClosed ? (
              <form action={closePayrollPeriodAction} className="flex items-end gap-2">
                <input type="hidden" name="periodId" value={period.id} />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="createExpenses" defaultChecked={false} className="h-4 w-4 accent-primary" />
                  Crear gastos al cerrar
                </label>
                <button type="submit" className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-4 py-2 text-sm text-foreground">
                  Cerrar periodo
                </button>
              </form>
            ) : (
              <form action={reopenPayrollPeriodAction}>
                <input type="hidden" name="periodId" value={period.id} />
                <button type="submit" className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-4 py-2 text-sm text-foreground">
                  Reabrir
                </button>
              </form>
            )}
          </div>
        ) : null}
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Trabajador</th>
              <th className="tabular px-2 py-2 text-right font-medium">Base</th>
              <th className="tabular px-2 py-2 text-right font-medium">Bonos</th>
              <th className="tabular px-2 py-2 text-right font-medium">Horas extra</th>
              <th className="tabular px-2 py-2 text-right font-medium">Bruto</th>
              <th className="tabular px-2 py-2 text-right font-medium">AFP</th>
              <th className="tabular px-2 py-2 text-right font-medium">Salud</th>
              <th className="tabular px-2 py-2 text-right font-medium">Cesantia</th>
              <th className="tabular px-2 py-2 text-right font-medium">Otras desc.</th>
              <th className="tabular px-2 py-2 text-right font-medium">Neto</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-medium">
                  <Link href={`/dashboard/rrhh/nomina/${period.id}/liquidacion/${entry.worker.id}`} className="text-primary underline-offset-2 hover:underline">
                    {entry.worker.name}
                  </Link>
                </td>
                {isClosed ? (
                  <>
                    <td className="tabular px-2 py-2.5 text-right">{entry.baseAmount.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right">{entry.allowances.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right">{entry.overtime.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right font-semibold">{entry.grossAmount.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right">{entry.afpAmount.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right">{entry.healthAmount.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right">{entry.unemploymentAmount.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right">{entry.otherDeductions.toLocaleString("es-CL")}</td>
                    <td className="tabular px-2 py-2.5 text-right font-semibold">{entry.netAmount.toLocaleString("es-CL")}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">Cerrado</td>
                  </>
                ) : (
                  <td colSpan={10} className="px-3 py-2.5">
                    <form action={updatePayrollEntryAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="periodId" value={period.id} />
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input name="baseAmount" type="number" defaultValue={entry.baseAmount} className="w-24 rounded-control border border-border bg-background px-2 py-1 text-right tabular" />
                      <input name="allowances" type="number" defaultValue={entry.allowances} className="w-20 rounded-control border border-border bg-background px-2 py-1 text-right tabular" />
                      <input name="overtime" type="number" defaultValue={entry.overtime} className="w-20 rounded-control border border-border bg-background px-2 py-1 text-right tabular" />
                      <input name="otherDeductions" type="number" defaultValue={entry.otherDeductions} className="w-24 rounded-control border border-border bg-background px-2 py-1 text-right tabular" />
                      <input name="taxAmount" type="number" defaultValue={entry.taxAmount} className="w-24 rounded-control border border-border bg-background px-2 py-1 text-right tabular" />
                      <span className="text-xs text-muted-foreground">{entry.netAmount.toLocaleString("es-CL")} neto actual</span>
                      <button type="submit" className="rounded-control border border-border bg-transparent px-2 py-1 text-sm text-foreground">Recalcular</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-sm text-muted-foreground">No hay liquidaciones. Genera desde sueldos base.</td>
              </tr>
            ) : null}
            {entries.length > 0 ? (
              <tr className="border-t border-border font-semibold">
                <td className="px-3 py-2.5">Total</td>
                <td className="tabular px-2 py-2.5 text-right">{totals.gross.toLocaleString("es-CL")}</td>
                <td colSpan={8} />
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Las tasas de descuestos son configurables. Si falta un pagador, el cierre con gastos creará error y revertirá.
        </p>
      </section>
    </div>
  );
}
