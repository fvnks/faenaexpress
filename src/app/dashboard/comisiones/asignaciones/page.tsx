import Link from "next/link";

import { canWrite, requireContext } from "@/lib/auth";
import {
  listAssignments,
  listPendingAssignments,
  listUnassignedDispatchGuides,
  listUnassignedInPeriod,
} from "@/lib/commissions";
import { db } from "@/lib/db";
import { formatCLP, formatDate, formatPeriod } from "@/lib/money";
import { cardClass } from "@/lib/ui";
import {
  AssignmentList,
  AssignGuidesPanel,
  PendingAssignments,
  RegisterGuidePanel,
  UnassignedInPeriod,
  type AssignmentRow,
  type AssignableRow,
  type RegisteredGuide,
} from "../commission-actions";
import {
  CommissionNav,
  CommissionPeriodFilter,
  documentLabel,
  resolvePeriod,
} from "../commission-shell";

/**
 * Las cuatro razones por las que un documento puede no estar comisionando.
 * Ponerlas acá, con la solución al lado, es el trabajo de esta pantalla.
 */
const causes = [
  {
    title: "Entró solo, por fecha",
    body: "Las facturas del mes con vendedor cargado comisionan automáticamente según la regla del vendedor. No hay que hacer nada.",
    tone: "ok",
  },
  {
    title: "No tiene vendedor cargado",
    body: "La factura existe pero el campo de vendedor está vacío. Mientras siga así no comisiona en ningún lado.",
    tone: "fix",
  },
  {
    title: "Está fuera de la regla",
    body: "Algunos vendedores cobran solo las facturas con guía de despacho. Ese vendedor decide cuándo entran las guías.",
    tone: "fix",
  },
  {
    title: "Es de otro mes",
    body: "Una guía de marzo no entra en el cálculo de junio por sí sola. Hay que asignarla a mano a la comisión que corresponde.",
    tone: "fix",
  },
] as const;

export default async function AssignmentsPage(
  props: PageProps<"/dashboard/comisiones/asignaciones">,
) {
  const ctx = await requireContext("comisiones");
  const searchParams = await props.searchParams;
  const period = resolvePeriod(searchParams);
  const periodLabel = formatPeriod(period);
  const canEdit = canWrite(ctx, "comisiones");

  const [closeRow, pending, unassigned, assignments, people, unassignedGuides] = await Promise.all([
    db.commissionClose.findUnique({
      where: { companyId_period: { companyId: ctx.company.id, period } },
      select: { closedAt: true },
    }),
    listPendingAssignments(ctx.company.id, period),
    listUnassignedInPeriod(ctx.company.id, period),
    listAssignments(ctx.company.id, period),
    db.salesperson.findMany({
      where: { companyId: ctx.company.id },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    listUnassignedDispatchGuides(ctx.company.id),
  ]);
  const closed = Boolean(closeRow);

  const pendingRows: AssignableRow[] = pending.rows.map((row) => ({
    saleId: row.saleId,
    date: row.date,
    documentLabel: documentLabel(row.documentType, row.documentNumber),
    dispatchGuide: row.dispatchGuide,
    partnerName: row.partnerName,
    salespersonName: row.salespersonName,
    net: row.net,
  }));

  const unassignedRows: AssignableRow[] = unassigned.rows.map((row) => ({
    saleId: row.saleId,
    date: row.date,
    documentLabel: documentLabel(row.documentType, row.documentNumber),
    dispatchGuide: row.dispatchGuide,
    partnerName: row.partnerName,
    salespersonName: null,
    net: row.net,
  }));

  const toRow = (row: {
    saleId: string;
    date: Date;
    documentType: string;
    documentNumber: string | null;
    dispatchGuide: string | null;
    partnerName: string;
    salespersonName: string;
    net: number;
    note: string | null;
    targetPeriod: string;
  }): AssignmentRow => ({
    saleId: row.saleId,
    date: row.date,
    documentLabel: documentLabel(row.documentType, row.documentNumber),
    dispatchGuide: row.dispatchGuide,
    partnerName: row.partnerName,
    salespersonName: row.salespersonName,
    net: row.net,
    note: row.note,
    targetPeriod: formatPeriod(row.targetPeriod),
  });

  const intoRows = assignments.intoPeriod.map(toRow);
  const outRows = assignments.outOfPeriod.map(toRow);

  const assignPeople = people
    .filter((person) => person.active)
    .map((person) => ({ id: person.id, label: person.name }));

  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id, type: "CUSTOMER" },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const registeredGuides: RegisteredGuide[] = unassignedGuides.rows.map((g) => ({
    id: g.id,
    guideNumber: g.guideNumber,
    date: g.date,
    partnerName: g.partnerName,
    salespersonName: g.salespersonName,
    net: g.net,
  }));

  const pendingTotal = pending.rows.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asignaciones manuales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué documentos de {periodLabel} no están comisionando todavía, y por qué. Es la
          herramienta para las guías de despacho rezagadas y las facturas olvidadas.
        </p>
      </div>

      <CommissionNav active="/dashboard/comisiones/asignaciones" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <CommissionPeriodFilter period={period} />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            {pendingTotal} sin comisionar de meses anteriores
          </span>
          <span>
            {unassigned.total} sin vendedor por{" "}
            <span className="tabular text-foreground">{formatCLP(unassigned.net)}</span>
          </span>
        </div>
      </div>

      {closed ? (
        <p className="rounded-card border border-border bg-accent-soft px-4 py-3 text-sm">
          <span className="font-semibold text-accent">Mes cerrado</span>
          <span className="text-muted-foreground">
            {" "}
            el {closeRow!.closedAt ? formatDate(closeRow!.closedAt) : "—"}. No se puede asignar
            nada a {periodLabel}: elige un mes abierto.
          </span>
        </p>
      ) : (
        <p className="rounded-card border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Asignar mueve el documento.</span>{" "}
          Sale del cómputo automático de su mes de emisión y pasa a ser lo que tú marcaste
          aquí. Nunca se cuentan dos veces.
        </p>
      )}

      {/* ---------------- Por qué un documento no comisiona ---------------- */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Por qué un documento no comisiona</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {causes.map((cause) => (
            <div key={cause.title} className="flex flex-col gap-1">
              <span
                className={
                  "w-fit rounded border px-1.5 py-0.5 text-xs font-medium " +
                  (cause.tone === "ok"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground")
                }
              >
                {cause.title}
              </span>
              <p className="text-sm text-muted-foreground">{cause.body}</p>
            </div>
          ))}
        </div>
      </section>

      {!closed && (
        <>
          {/* ---------------- Facturas del mes sin vendedor ---------------- */}
          <UnassignedInPeriod
            period={period}
            periodLabel={periodLabel}
            people={assignPeople}
            rows={unassignedRows}
            total={unassigned.total}
          />

          {/* ---------------- Guías de despacho registradas ---------------- */}
          {canEdit && (
            <>
              <RegisterGuidePanel
                people={assignPeople}
                partners={partners.map((p) => ({ id: p.id, label: p.name }))}
              />
              <AssignGuidesPanel
                period={period}
                periodLabel={periodLabel}
                people={assignPeople}
                guides={registeredGuides}
              />
            </>
          )}

          {/* ---------------- Documentos de meses anteriores ---------------- */}
          <PendingAssignments
            period={period}
            periodLabel={periodLabel}
            people={assignPeople}
            rows={pendingRows}
            total={pending.total}
          />

          {/* ---------------- Ya asignadas a este mes ---------------- */}
          <AssignmentList
            title={`Asignadas a ${periodLabel}`}
            description="Documentos que alguien llevó a mano a este mes. Se pagan aquí aunque su fecha sea de otro; quítalos si fue un error."
            emptyMessage="Ningún documento fue asignado a este mes a mano."
            rows={intoRows}
            showTargetPeriod={false}
          />

          {/* ---------------- Arrastradas a otro mes ---------------- */}
          {outRows.length > 0 && (
            <AssignmentList
              title="Con fecha en este mes pero pagadas en otro"
              description="Son las que alguien se llevó a otro período. Por eso no aparecen en el resumen de este mes: es la regla anti-duplicado. Si se asignaron por error, aquí las puedes quitar."
              emptyMessage="Ninguna."
              rows={outRows}
              showTargetPeriod
            />
          )}
        </>
      )}

      {closed && (
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Las asignaciones de los documentos que comisionaron en {periodLabel} quedaron
            congeladas junto con el resto del cálculo.{" "}
            <Link
              href={`/dashboard/comisiones?periodo=${period}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Ver el resumen congelado →
            </Link>
          </p>
        </section>
      )}

      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Puedes ver estas listas, pero solo administración o contabilidad asignan
          documentos.
        </p>
      )}
    </div>
  );
}
