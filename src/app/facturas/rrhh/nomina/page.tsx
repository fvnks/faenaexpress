import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { payrollStatusLabels } from "@/lib/payroll";
import { db } from "@/lib/db";
import { cardClass, controlClass } from "@/lib/ui";

import { createPayrollPeriodAction } from "@/app/actions/payroll";

export default async function PayrollPage(props: PageProps<"/facturas/rrhh/nomina">) {
  const ctx = await requireContext("rrhh");
  const searchParams = await props.searchParams;
  const pageError = typeof searchParams?.error === "string" ? searchParams.error : null;
  const writable = ctx.role === "ADMIN" || ctx.role === "ACCOUNTANT";
  const company = await db.company.findUnique({ where: { id: ctx.company.id }, select: { id: true } });
  const periods = await db.payrollPeriod.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nómina</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Períodos mensuales y liquidaciones de sueldos. Tasas configuradas en RRHH/Empresa.
          </p>
        </div>
        {pageError ? <div className="mt-2 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{pageError}</div> : null}
        {writable ? (
          <form action={createPayrollPeriodAction} className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Año</label>
              <input name="year" type="number" defaultValue={now.getFullYear()} className={controlClass + " w-24 tabular"} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Mes</label>
              <input name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} className={controlClass + " w-20 tabular"} />
            </div>
            <button type="submit" className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary">
              Crear período
            </button>
          </form>
        ) : null}
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Período</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 text-right font-medium">Liquidaciones</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">{period.year}-{String(period.month).padStart(2, "0")}</td>
                <td className="px-4 py-2.5">{payrollStatusLabels[period.status]}</td>
                <td className="tabular px-4 py-2.5 text-right">{period._count.entries}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/facturas/rrhh/nomina/${period.id}`} className="text-primary underline-offset-2 hover:underline">Abrir</Link>
                </td>
              </tr>
            ))}
            {periods.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-muted-foreground">No hay períodos de nómina.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
