import Link from "next/link";

import { deleteRemuneration } from "@/app/actions/rrhh";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { canWrite, requireContext } from "@/lib/auth";
import { remunerationTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate, todayISO } from "@/lib/money";
import { listPayers } from "@/lib/catalogs";
import { listAreas } from "@/lib/catalogs";
import { listRemunerations, listWorkersWithTotals, rrhhMonthlyCosts, rrhhYearTotal } from "@/lib/rrhh";
import { cardClass, controlClass } from "@/lib/ui";
import { remunerationTypeValues } from "@/lib/validation";

import { BulkRemunerationForm, NewRemunerationForm, NewWorkerForm, WorkerRowForm } from "./rrhh-forms";

export default async function RrhhPage(props: PageProps<"/facturas/rrhh">) {
  const ctx = await requireContext("rrhh");
  const writable = canWrite(ctx, "rrhh");

  const searchParams = await props.searchParams;
  const raw = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const workerId = raw("worker") || undefined;
  const paidById = raw("pagador") || undefined;
  const typeRaw = raw("tipo") || undefined;
  const period = raw("periodo") || undefined;
  const desde = raw("desde") || undefined;
  const hasta = raw("hasta") || undefined;

  const type = (typeRaw && remunerationTypeValues.includes(typeRaw as (typeof remunerationTypeValues)[number]))
    ? (typeRaw as (typeof remunerationTypeValues)[number])
    : undefined;

  const [workers, remunerations, payers, areas, yearTotal] = await Promise.all([
    listWorkersWithTotals(ctx.company.id),
    listRemunerations(ctx.company.id, {
      workerId,
      paidById,
      type,
      period: period && /^\d{4}-\d{2}$/.test(period) ? period : undefined,
      from: desde ? new Date(desde) : undefined,
      to: hasta ? new Date(hasta) : undefined,
    }),
    listPayers(ctx.company.id),
    listAreas(ctx.company.id),
    rrhhYearTotal(ctx.company.id),
  ]);

  const monthNames = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const monthly = await rrhhMonthlyCosts(ctx.company.id, new Date().getUTCFullYear());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RRHH</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trabajadores y pagos de {ctx.company.name}: sueldos, aguinaldos, bonos y adelantos.
          </p>
          <p className="mt-1 text-sm">
            <Link href="/facturas/rrhh/nomina" className="text-primary underline-offset-2 hover:underline">Abrir nomina →</Link>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pagado en el año</p>
          <p className="tabular text-2xl font-bold">{formatCLP(yearTotal)}</p>
        </div>
      </div>
      {/* Filtros */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Filtros</h2>
        <form method="get" className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Trabajador</label>
            <select name="worker" defaultValue={workerId ?? ""} className={controlClass}>
              <option value="">Todos</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <select name="tipo" defaultValue={type ?? ""} className={controlClass}>
              <option value="">Todos</option>
              {remunerationTypeValues.map((value) => (
                <option key={value} value={value}>
                  {remunerationTypeLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Pagado por</label>
            <select name="pagador" defaultValue={paidById ?? ""} className={controlClass}>
              <option value="">Todos</option>
              {payers.map((payer) => (
                <option key={payer.id} value={payer.id}>
                  {payer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Período</label>
            <input type="month" name="periodo" defaultValue={period ?? ""} className={controlClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Desde</label>
            <input type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA" name="desde" defaultValue={desde ?? ""} className={controlClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA" name="hasta" defaultValue={hasta ?? ""} className={controlClass} />
          </div>
          <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6">
            <button
              type="submit"
              className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
            >
              Filtrar
            </button>
            <a
              href="/facturas/rrhh"
              className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-4 py-2 text-sm text-foreground"
            >
              Limpiar
            </a>
          </div>
        </form>
        <p className="mt-3 text-sm text-muted-foreground">
          {remunerations.length} pago(s) encontrado(s).
        </p>
      </section>

      <div className="flex justify-end">
        <a href="/facturas/rrhh/export" className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground">Exportar Excel</a>
      </div>

      {/* Pagos por lote */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Pagos por lote</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registra sueldos mensuales con un clic para los trabajadores activos seleccionados.
        </p>
        <div className="mt-4">
          <BulkRemunerationForm
            workers={workers.filter((worker) => worker.active).map((worker) => ({ id: worker.id, name: worker.name, baseAmount: worker.baseAmount ?? null }))}
            payers={payers}
            today={todayISO()}
          />
        </div>
      </section>

      {/* Costos laborales por mes */}
      <section className={cardClass + " p-5 overflow-x-auto"}>
        <h2 className="font-semibold">Costos laborales por mes ({monthly.year})</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pagos registrados por trabajador. Total anual: {formatCLP(monthly.total)}.
        </p>
        <table className="mt-4 w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Trabajador</th>
              {monthNames.map((name, index) => (
                <th key={index} className="tabular px-2 py-2 text-right font-medium">{name}</th>
              ))}
              <th className="tabular px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthly.rows.length === 0 ? (
              <tr><td colSpan={14} className="px-3 py-6 text-sm text-muted-foreground">Sin pagos en el año.</td></tr>
            ) : monthly.rows.map((row) => (
              <tr key={row.workerId} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-medium">{row.name}</td>
                {row.monthly.map((value, index) => (
                  <td key={index} className="tabular px-2 py-2.5 text-right">{value ? formatCLP(value) : "—"}</td>
                ))}
                <td className="tabular px-3 py-2.5 text-right font-semibold">{formatCLP(row.total)}</td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="px-3 py-2.5">Total</td>
              {monthly.months.map((value, index) => (
                <td key={index} className="tabular px-2 py-2.5 text-right">{value ? formatCLP(value) : "—"}</td>
              ))}
              <td className="tabular px-3 py-2.5 text-right">{formatCLP(monthly.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Registrar pago */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Registrar pago a trabajador</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registra el resultado líquido del pago; el gasto se crea solo.
        </p>
        <div className="mt-4">
          <NewRemunerationForm
            workers={workers.filter((worker) => worker.active).map((worker) => ({ id: worker.id, name: worker.name }))}
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
                  <th className="px-3 py-2 font-medium">Cargo</th>
                  <th className="px-3 py-2 font-medium">Área</th>
                  <th className="px-3 py-2 font-medium">RUT</th>
                  <th className="px-3 py-2 font-medium">Estado laboral</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="tabular px-3 py-2 text-right font-medium">Pagado este año</th>
                  <th className="px-3 py-2 font-medium">Último pago</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-3 py-3 font-medium">
                      <Link href={`/facturas/rrhh/trabajadores/${worker.id}`} className="text-primary underline-offset-2 hover:underline">
                        {worker.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{worker.position ?? "—"}</td>
                    <td className="px-3 py-3">{worker.areaName ?? "—"}</td>
                    <td className="tabular px-3 py-3">{worker.rut ?? "—"}</td>
                    <td className="px-3 py-3">{worker.status ?? "—"}</td>
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
                  worker={{
                    id: worker.id,
                    name: worker.name,
                    rut: worker.rut,
                    active: worker.active,
                    position: worker.position,
                    areaId: worker.areaId ?? null,
                    email: worker.email,
                    phone: worker.phone,
                    address: worker.address,
                    city: worker.city,
                    birthDate: worker.birthDate,
                    hireDate: worker.hireDate,
                    terminationDate: worker.terminationDate,
                    contractType: worker.contractType,
                    status: worker.status,
                    baseAmount: worker.baseAmount,
                    bankName: worker.bankName,
                    bankAccount: worker.bankAccount,
                    afp: worker.afp,
                    healthPlan: worker.healthPlan,
                    notes: worker.notes,
                  }}
                  areas={areas}
                />
              ))}
            </div>
            <h3 className="text-sm font-semibold">Nuevo trabajador</h3>
            <NewWorkerForm areas={areas} />
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
                            title="Eliminar pago"
                            description={`Se eliminará el pago a ${rem.worker.name} por ${formatCLP(rem.amount)} y su gasto asociado.`}
                            confirmLabel="Eliminar"
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
        <Link href="/facturas/gastos" className="text-primary underline-offset-2 hover:underline">
          Gastos
        </Link>{" "}
        y en el reporte{" "}
        <Link href="/facturas/reportes/gastos" className="text-primary underline-offset-2 hover:underline">
          Por trabajador
        </Link>
        .
      </p>
    </div>
  );
}
