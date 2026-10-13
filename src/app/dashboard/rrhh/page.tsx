import Link from "next/link";

import { deleteRemuneration } from "@/app/actions/rrhh";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { canWrite, requireContext } from "@/lib/auth";
import { remunerationTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate, todayISO } from "@/lib/money";
import { listPayers } from "@/lib/catalogs";
import { listRemunerations, listWorkersWithTotals, rrhhYearTotal } from "@/lib/rrhh";
import { cardClass } from "@/lib/ui";

import { NewRemunerationForm, NewWorkerForm, WorkerRowForm } from "./rrhh-forms";

export default async function RrhhPage() {
  const ctx = await requireContext("rrhh");
  const writable = canWrite(ctx, "rrhh");

  const [workers, remunerations, payers, yearTotal] = await Promise.all([
    listWorkersWithTotals(ctx.company.id),
    listRemunerations(ctx.company.id),
    listPayers(ctx.company.id),
    rrhhYearTotal(ctx.company.id),
  ]);

  const activeWorkers = workers.filter((worker) => worker.active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RRHH</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trabajadores y pagos de {ctx.company.name}: sueldos, aguinaldos, bonos y adelantos.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pagado en el año</p>
          <p className="tabular text-2xl font-bold">{formatCLP(yearTotal)}</p>
        </div>
      </div>

      {/* Registrar pago */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Registrar pago a trabajador</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registra el resultado líquido del pago; el gasto se crea solo.
        </p>
        <div className="mt-4">
          <NewRemunerationForm
            workers={activeWorkers.map((worker) => ({ id: worker.id, name: worker.name }))}
            payers={payers}
            today={todayISO()}
          />
        </div>
      </section>

      {/* Trabajadores */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Trabajadores</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Nombres y RUT; el total muestra lo pagado este año.
        </p>

        {workers.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aún no hay trabajadores.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">RUT</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="tabular px-3 py-2 text-right font-medium">Pagado este año</th>
                  <th className="px-3 py-2 font-medium">Último pago</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-3 py-3 font-medium">{worker.name}</td>
                    <td className="tabular px-3 py-3">{worker.rut ?? "—"}</td>
                    <td className="px-3 py-3">
                      {worker.active ? (
                        <span className="inline-flex whitespace-nowrap rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="tabular px-3 py-3 text-right font-semibold">
                      {formatCLP(worker.yearTotal)}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {worker.lastPayment ? formatDate(worker.lastPayment) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {writable ? (
          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Editar trabajadores</h3>
            <div className="flex flex-col gap-3">
              {workers.map((worker) => (
                <WorkerRowForm
                  key={worker.id}
                  worker={{ id: worker.id, name: worker.name, rut: worker.rut, active: worker.active }}
                />
              ))}
            </div>
            <h3 className="text-sm font-semibold">Nuevo trabajador</h3>
            <NewWorkerForm />
          </div>
        ) : null}
      </section>

      {/* Últimos pagos */}
      <section className={cardClass + " overflow-hidden"}>
        <h2 className="border-b border-border px-4 py-3 font-semibold">Últimos pagos</h2>
        {remunerations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Aún no se han registrado pagos a trabajadores.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Trabajador</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Período</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Pagado por</th>
                  {writable ? <th className="px-4 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {remunerations.map((rem) => (
                  <tr key={rem.id} className="border-b border-border last:border-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5">{formatDate(rem.date)}</td>
                    <td className="px-4 py-2.5 font-medium">{rem.worker.name}</td>
                    <td className="px-4 py-2.5">{remunerationTypeLabel(rem.type)}</td>
                    <td className="tabular px-4 py-2.5 text-muted-foreground">{rem.period ?? "—"}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      {formatCLP(rem.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{rem.paidBy.name}</td>
                    {writable ? (
                      <td className="px-4 py-2.5 text-right">
                        <form action={deleteRemuneration}>
                          <input type="hidden" name="id" value={rem.id} />
                          <ConfirmSubmit
                            message={`¿Eliminar el pago a ${rem.worker.name} por ${formatCLP(rem.amount)}? También se borrará su gasto asociado.`}
                            className="text-sm text-danger underline-offset-2 hover:underline"
                          >
                            Eliminar
                          </ConfirmSubmit>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Los pagos generan gastos automáticos: revísalos en{" "}
        <Link href="/dashboard/gastos" className="text-primary underline-offset-2 hover:underline">
          Gastos
        </Link>{" "}
        y en el reporte{" "}
        <Link href="/dashboard/reportes/gastos" className="text-primary underline-offset-2 hover:underline">
          Por trabajador
        </Link>
        .
      </p>
    </div>
  );
}
