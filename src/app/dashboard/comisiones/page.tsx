import Link from "next/link";

import { canWrite, requireContext } from "@/lib/auth";
import {
  closedCommissionReport,
  computeCommission,
  formatRateBps,
  type CommissionLine,
} from "@/lib/commissions";
import { db } from "@/lib/db";
import { formatCLP, formatDate, formatPeriod } from "@/lib/money";
import { cardClass } from "@/lib/ui";
import {
  CommissionNav,
  CommissionPeriodFilter,
  documentLabel,
  Money,
  resolvePeriod,
} from "./commission-shell";
import { CloseMonthButton, UnassignButton } from "./commission-actions";

const RULE_LABEL: Record<string, string> = {
  INVOICE: "Facturas del mes",
  GUIDE: "Solo con guía",
};

export default async function CommissionsPage(props: PageProps<"/dashboard/comisiones">) {
  const ctx = await requireContext("comisiones");
  const searchParams = await props.searchParams;
  const period = resolvePeriod(searchParams);
  const periodLabel = formatPeriod(period);
  const canEdit = canWrite(ctx, "comisiones");

  const closeRow = await db.commissionClose.findUnique({
    where: { companyId_period: { companyId: ctx.company.id, period } },
    select: { closedAt: true },
  });
  const closed = Boolean(closeRow);

  // Mes cerrado: se lee de las entradas congeladas. Mes abierto: cálculo en vivo.
  const [live, frozen] = await Promise.all([
    closed ? Promise.resolve(null) : computeCommission(ctx.company.id, period),
    closed ? closedCommissionReport(ctx.company.id, period) : Promise.resolve(null),
  ]);

  const lines: CommissionLine[] = frozen ? frozen.lines : (live?.lines ?? []);
  const totals = frozen ? frozen.totals : (live?.totals ?? []);
  const withoutSalesperson = closed ? 0 : (live?.withoutSalesperson ?? 0);
  const pendingTotal = closed ? 0 : (live?.pendingTotal ?? 0);

  const people = await db.salesperson.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const ruleOf = new Map(people.map((person) => [person.id, person.commissionRule]));

  const totalBase = totals.reduce((sum, row) => sum + row.base, 0);
  const totalCommission = totals.reduce((sum, row) => sum + row.commission, 0);
  const withMovement = totals.filter((row) => row.autoCount + row.manualCount > 0).length;

  // Solo existe la columna de acciones si hay algo que quitar. Una columna
  // siempre vacía no gana sitio en la tabla: la resta.
  const showActions =
    canEdit && !closed && lines.some((line) => line.source === "MANUAL");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comisiones de vendedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué le corresponde a cada vendedor en {periodLabel}, calculado sobre el neto emitido
          (sin IVA).
        </p>
      </div>

      <CommissionNav active="/dashboard/comisiones" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <CommissionPeriodFilter period={period} />
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/dashboard/comisiones/export?periodo=${period}`}
            className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
          >
            Exportar CSV
          </a>
          {canEdit && !closed && (
            <CloseMonthButton
              period={period}
              periodLabel={periodLabel}
              lineCount={lines.length}
            />
          )}
        </div>
      </div>

      {closed ? (
        <p className="rounded-card border border-border bg-accent-soft px-4 py-3 text-sm">
          <span className="font-semibold text-accent">Mes cerrado</span>
          <span className="text-muted-foreground">
            {" "}
            el {frozen?.closedAt ? formatDate(frozen.closedAt) : "—"}. Los montos están
            congelados: los cambios posteriores en las facturas no lo tocan.
          </span>
        </p>
      ) : (
        <p className="rounded-card border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Mes abierto</span>. El cálculo se
          actualiza solo. Al cerrar, las cifras quedan congeladas y ya no se pueden editar.
        </p>
      )}

      {/* Hay cosas que no comisionan y este es el único momento de avisarlo:
          si no, el mes se cierra con la cifra que falta. */}
      {!closed && (withoutSalesperson > 0 || pendingTotal > 0) && (
        <p className="rounded-card border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {withoutSalesperson > 0 && (
            <>
              <span className="font-semibold text-foreground">
                {withoutSalesperson} factura{withoutSalesperson === 1 ? "" : "s"} sin vendedor
              </span>{" "}
              {withoutSalesperson === 1 ? "no comisiona" : "no comisionan"}.{" "}
            </>
          )}
          {pendingTotal > 0 && (
            <>
              <span className="font-semibold text-foreground">
                {pendingTotal} documento{pendingTotal === 1 ? "" : "s"} de meses anteriores
              </span>{" "}
              sigue{pendingTotal === 1 ? "" : "n"} sin comisionar.{" "}
            </>
          )}
          <Link
            href={`/dashboard/comisiones/asignaciones?periodo=${period}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Resolverlos en Asignaciones →
          </Link>
        </p>
      )}

      {/* ---------------- Foco: cuánto se paga a cada vendedor ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-semibold">Resumen por vendedor</h2>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
            <span className="text-muted-foreground">{withMovement} con movimiento</span>
            <span className="text-muted-foreground">
              {lines.length} documento{lines.length === 1 ? "" : "s"}
            </span>
            <span>
              Total a comisionar{" "}
              <Money className="text-lg font-bold">{formatCLP(totalCommission)}</Money>
            </span>
          </div>
        </div>

        {totals.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Todavía no hay vendedores. Créalos en Catálogos y define su porcentaje en{" "}
            <Link
              href="/dashboard/comisiones/vendedores"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Vendedores
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <caption className="sr-only">
                Comisión por vendedor en el período seleccionado
              </caption>
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-5 py-2 font-medium">
                    Vendedor
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Regla
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Tasa
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
                {totals.map((row) => {
                  const docs = row.autoCount + row.manualCount;
                  return (
                    <tr key={row.salespersonId} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium">{row.salespersonName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {RULE_LABEL[ruleOf.get(row.salespersonId) ?? "INVOICE"]}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                        {formatRateBps(row.rateBps)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">
                        <Money>{formatCLP(row.base)}</Money>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                        {docs}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right font-semibold">
                        <Money>{formatCLP(row.commission)}</Money>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-background">
                  <td className="px-5 py-3 font-semibold" colSpan={3}>
                    Total
                  </td>
                  <td className="tabular px-3 py-3 text-right font-semibold">
                    <Money>{formatCLP(totalBase)}</Money>
                  </td>
                  <td className="tabular px-3 py-3 text-right text-muted-foreground">
                    {lines.length}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-base font-bold">
                    <Money>{formatCLP(totalCommission)}</Money>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ---------------- Detalle documento a documento ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="font-semibold">Detalle</h2>
          <span className="text-xs text-muted-foreground">
            <span className="mr-1 inline-block rounded border border-border px-1.5 py-0.5">
              Auto
            </span>
            entró por su fecha ·{" "}
            <span className="mx-1 inline-block rounded border border-border px-1.5 py-0.5">
              Asignado
            </span>
            se llevó a mano a este mes
          </span>
        </div>

        {lines.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {closed
              ? "Este mes se cerró sin ninguna línea de comisión."
              : `No hay documentos que comisionar en ${periodLabel}. Las facturas del mes entran solas; las rezagadas se asignan en Asignaciones.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <caption className="sr-only">
                Documentos que comisionan en el período, con su base y su comisión
              </caption>
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-5 py-2 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Documento
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Guía
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Vendedor
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Origen
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Base
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Comisión
                  </th>
                  {showActions && (
                    <th scope="col" className="px-5 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.saleId} className="border-b border-border last:border-0">
                    <td className="tabular px-5 py-2.5 whitespace-nowrap">
                      {formatDate(line.date)}
                    </td>
                    <td className="px-3 py-2.5">
                      {documentLabel(line.documentType, line.documentNumber)}
                    </td>
                    <td className="tabular px-3 py-2.5">{line.guideNumber ?? "—"}</td>
                    <td className="px-3 py-2.5">{line.partnerName}</td>
                    <td className="px-3 py-2.5">{line.salespersonName}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="whitespace-nowrap rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                          {line.source === "AUTO" ? "Auto" : "Asignado"}
                        </span>
                        {line.note && (
                          <span className="text-xs text-muted-foreground">{line.note}</span>
                        )}
                      </span>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">
                      <Money className={line.base < 0 ? "text-danger" : undefined}>
                        {formatCLP(line.base)}
                      </Money>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right font-semibold">
                      <Money className={line.commission < 0 ? "text-danger" : undefined}>
                        {formatCLP(line.commission)}
                      </Money>
                    </td>
                    {showActions && (
                      <td className="px-5 py-2.5 text-right">
                        <UnassignButton
                          saleId={line.saleId ?? undefined}
                          dispatchGuideId={line.dispatchGuideId ?? undefined}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
