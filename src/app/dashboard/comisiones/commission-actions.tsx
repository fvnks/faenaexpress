"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  assignCommissionDocuments,
  assignDispatchGuide,
  closeCommissionMonthAction,
  registerDispatchGuide,
  saveSalespersonCommission,
  unassignCommissionDocument,
  type CommissionActionState,
  type SalespersonCommissionState,
} from "@/app/actions/commissions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { formatCLP, formatDate } from "@/lib/money";
import {
  cardClass,
  controlClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

export type PersonOption = { id: string; label: string };

/** Documento que todavía no comisiona y puede asignarse a mano. */
export type AssignableRow = {
  saleId: string;
  date: Date;
  documentLabel: string;
  dispatchGuide: string | null;
  partnerName: string;
  /** null = la factura no tiene vendedor cargado. */
  salespersonName: string | null;
  net: number;
};

/** Asignación manual ya hecha. */
export type AssignmentRow = {
  saleId: string;
  date: Date;
  documentLabel: string;
  dispatchGuide: string | null;
  partnerName: string;
  salespersonName: string;
  net: number;
  note: string | null;
  /** Mes al que quedó asignado. */
  targetPeriod: string;
};

function useCommissionFeedback(state: CommissionActionState, okMessage?: string) {
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? okMessage ?? "Listo.");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router, okMessage]);
}

export function CloseMonthButton({
  period,
  periodLabel,
  lineCount,
}: {
  period: string;
  periodLabel: string;
  lineCount: number;
}) {
  const [state, formAction] = useActionState<CommissionActionState, FormData>(
    closeCommissionMonthAction,
    undefined,
  );
  useCommissionFeedback(state);

  const description =
    lineCount === 0
      ? `Vas a cerrar ${periodLabel} sin ninguna línea de comisión. Después no se puede editar ni reabrir.`
      : `Vas a cerrar ${periodLabel} y congelar ${lineCount} línea(s) de comisión. Después no se puede editar ni reabrir.`;

  return (
    <form action={formAction}>
      <input type="hidden" name="period" value={period} />
      <ConfirmSubmit
        title="Cerrar mes"
        description={description}
        confirmLabel="Cerrar mes"
        className={primaryButtonClass}
        confirmClassName={primaryButtonClass}
      >
        Cerrar mes
      </ConfirmSubmit>
    </form>
  );
}

/**
 * Formulario de asignación múltiple. Lo comparten las dos listas de la página
 * de Asignaciones: los documentos de meses anteriores y los del mes que no
 * tienen vendedor cargado. Ambas llevan al mismo destino, el mes elegido.
 */
function AssignForm({
  period,
  periodLabel,
  people,
  rows,
  total,
  title,
  description,
  emptyMessage,
  showSalespersonColumn,
}: {
  period: string;
  periodLabel: string;
  people: PersonOption[];
  rows: AssignableRow[];
  total: number;
  title: string;
  description: string;
  emptyMessage: string;
  showSalespersonColumn: boolean;
}) {
  const [state, formAction] = useActionState<CommissionActionState, FormData>(
    assignCommissionDocuments,
    undefined,
  );
  const [picked, setPicked] = useState<string[]>([]);
  useCommissionFeedback(state, "Documentos asignados.");

  // La selección se deriva de las filas que siguen disponibles. Al confirmarse
  // la asignación esas filas dejan de existir, así que se desmarcan solas sin
  // tener que limpiar estado a mano (y si la acción falla, la selección se
  // conserva).
  const available = new Set(rows.map((row) => row.saleId));
  const selected = picked.filter((id) => available.has(id));

  const toggle = (saleId: string) => {
    setPicked((current) =>
      current.includes(saleId)
        ? current.filter((id) => id !== saleId)
        : [...current, saleId],
    );
  };

  const allIds = rows.map((row) => row.saleId);
  const allSelected = allIds.length > 0 && selected.length === allIds.length;

  return (
    <section className={cardClass + " p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {total > rows.length ? `Mostrando ${rows.length} de ${total}` : `${total} documento(s)`}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {rows.length === 0 ? (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : people.length === 0 ? (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          Primero crea al menos un vendedor en Catálogos. Sin vendedores no hay a quién asignar
          documentos.
        </p>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="period" value={period} />
          {selected.map((saleId) => (
            <input key={saleId} type="hidden" name="saleId" value={saleId} />
          ))}

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                  <th scope="col" className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setPicked(allSelected ? [] : allIds)}
                      aria-label={`Marcar todos: ${title}`}
                      className="h-4 w-4 accent-primary"
                    />
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
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
                  {showSalespersonColumn ? (
                    <th scope="col" className="px-3 py-2 font-medium">
                      Vendedor en la factura
                    </th>
                  ) : null}
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Neto
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.saleId}
                    className={
                      "border-b border-border last:border-0 " +
                      (selected.includes(row.saleId) ? "bg-primary-soft" : "")
                    }
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.saleId)}
                        onChange={() => toggle(row.saleId)}
                        aria-label={`Marcar ${row.documentLabel} de ${row.partnerName}`}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="tabular px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2">{row.documentLabel}</td>
                    <td className="tabular px-3 py-2">{row.dispatchGuide ?? "—"}</td>
                    <td className="px-3 py-2">{row.partnerName}</td>
                    {showSalespersonColumn ? (
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.salespersonName ?? "Sin vendedor"}
                      </td>
                    ) : null}
                    <td className="tabular px-3 py-2 text-right font-semibold">
                      {formatCLP(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className={fieldClass + " min-w-[14rem] flex-1"}>
              <label htmlFor={`assign-salesperson-${title}`} className={labelClass}>
                Vendedor que cobra
              </label>
              <select
                id={`assign-salesperson-${title}`}
                name="salespersonId"
                required
                className={controlClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona un vendedor
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass + " min-w-[14rem] flex-1"}>
              <label htmlFor={`assign-note-${title}`} className={labelClass}>
                Motivo
              </label>
              <input
                id={`assign-note-${title}`}
                name="note"
                maxLength={200}
                placeholder="Opcional. Ej: guía despachada en septiembre"
                className={controlClass}
              />
            </div>
            <SubmitButton
              pendingLabel="Asignando..."
              className={primaryButtonClass}
              disabled={selected.length === 0}
            >
              {selected.length === 0
                ? "Marca documentos para asignar"
                : `Asignar ${selected.length} a ${periodLabel}`}
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}

/** Documentos de meses anteriores que todavía no comisionaron en ningún lado. */
export function PendingAssignments(props: {
  period: string;
  periodLabel: string;
  people: PersonOption[];
  rows: AssignableRow[];
  total: number;
}) {
  return (
    <AssignForm
      {...props}
      title="De meses anteriores"
      description={`Documentos antiguos que no comisionaron en su mes: guías de despacho rezagadas, facturas olvidadas. Llévalos a ${props.periodLabel} si corresponde que se paguen ahora.`}
      emptyMessage="Nada pendiente de meses anteriores."
      showSalespersonColumn
    />
  );
}

/** Facturas del mes que no tienen vendedor cargado: no comisionan hasta asignarlas. */
export function UnassignedInPeriod(props: {
  period: string;
  periodLabel: string;
  people: PersonOption[];
  rows: AssignableRow[];
  total: number;
}) {
  return (
    <AssignForm
      {...props}
      title={`De ${props.periodLabel} sin vendedor`}
      description="Facturas emitidas en el mes cuyo campo de vendedor está vacío. Mientras siga así no comisionan: asígnales quién cobra."
      emptyMessage="Todas las facturas del mes tienen vendedor cargado."
      showSalespersonColumn={false}
    />
  );
}

export function UnassignButton({ saleId, dispatchGuideId }: { saleId?: string; dispatchGuideId?: string }) {
  const [state, formAction] = useActionState<CommissionActionState, FormData>(
    unassignCommissionDocument,
    undefined,
  );
  useCommissionFeedback(state, "Asignación eliminada.");

  const id = saleId ?? dispatchGuideId;
  if (!id) return null;

  return (
    <form action={formAction}>
      <input type="hidden" name="saleId" value={saleId ?? ""} />
      {dispatchGuideId ? <input type="hidden" name="dispatchGuideId" value={dispatchGuideId} /> : null}
      <ConfirmSubmit
        title="Quitar asignación"
        description="El documento volverá al cómputo automático de su propio mes."
        confirmLabel="Quitar"
        className={secondaryButtonClass}
      >
        Quitar
      </ConfirmSubmit>
    </form>
  );
}

/**
 * Listado de asignaciones manuales ya hechas. Se usa para las que quedaron a
 * este mes (se pagan acá) y para las que alguien arrastró a otro mes (se pagaron
 * en otro lado y por eso no aparecen en el resumen de este).
 */
export function AssignmentList({
  title,
  description,
  emptyMessage,
  rows,
  showTargetPeriod,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  rows: AssignmentRow[];
  showTargetPeriod: boolean;
}) {
  const width = showTargetPeriod ? "min-w-[46rem]" : "min-w-[40rem]";

  return (
    <section className={cardClass + " p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{rows.length} documento(s)</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {rows.length === 0 ? (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border">
          <table className={"w-full border-collapse text-sm " + width}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Documento
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cobra
                </th>
                {showTargetPeriod ? (
                  <th scope="col" className="px-3 py-2 font-medium">
                    Se paga en
                  </th>
                ) : null}
                <th scope="col" className="px-3 py-2 font-medium">
                  Motivo
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Neto
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.saleId} className="border-b border-border last:border-0">
                  <td className="tabular px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-3 py-2">{row.documentLabel}</td>
                  <td className="px-3 py-2">{row.partnerName}</td>
                  <td className="px-3 py-2 font-medium">{row.salespersonName}</td>
                  {showTargetPeriod ? (
                    <td className="px-3 py-2 text-muted-foreground">{row.targetPeriod}</td>
                  ) : null}
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.note ?? "—"}</td>
                  <td className="tabular px-3 py-2 text-right font-semibold">
                    {formatCLP(row.net)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <UnassignButton saleId={row.saleId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export type RateRow = {
  id: string;
  name: string;
  active: boolean;
  ratePercent: string; // "2,5"
  rule: "INVOICE" | "GUIDE";
};

export function RatesEditor({ rows }: { rows: RateRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Tasas y reglas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Todavía no hay vendedores. Créalos en Catálogos y vuelve a configurar su porcentaje acá.
        </p>
      </section>
    );
  }

  return (
    <section className={cardClass + " p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Tasas y reglas</h2>
        <span className="text-xs text-muted-foreground">{rows.length} vendedor(es)</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        El porcentaje se aplica al neto de cada documento, sin IVA. La regla decide qué entra solo.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <RateRowForm key={row.id} row={row} onSaved={() => router.refresh()} />
        ))}
      </div>
    </section>
  );
}

function RateRowForm({ row, onSaved }: { row: RateRow; onSaved: () => void }) {
  const [state, formAction] = useActionState<SalespersonCommissionState, FormData>(
    saveSalespersonCommission,
    undefined,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(`Comisión de ${row.name} actualizada.`);
      onSaved();
    } else if (state.error) {
      toast.error(state.error);
    }
    // `onSaved` cambia en cada render; solo reaccionamos al estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 border-t border-border pt-3"
    >
      <input type="hidden" name="id" value={row.id} />
      <div className="min-w-[12rem] flex-1">
        <div className="text-sm font-medium">{row.name}</div>
        {!row.active && <div className="text-xs text-muted-foreground">Inactivo</div>}
      </div>

      <div className={fieldClass + " w-32"}>
        <label htmlFor={`rate-${row.id}`} className={labelClass}>
          Porcentaje
        </label>
        <input
          id={`rate-${row.id}`}
          name="commissionRate"
          inputMode="decimal"
          defaultValue={row.ratePercent}
          className={controlClass + " tabular"}
        />
      </div>

      <div className={fieldClass + " w-52"}>
        <label htmlFor={`rule-${row.id}`} className={labelClass}>
          Regla
        </label>
        <select
          id={`rule-${row.id}`}
          name="commissionRule"
          defaultValue={row.rule}
          className={controlClass}
        >
          <option value="INVOICE">Facturas emitidas del mes</option>
          <option value="GUIDE">Solo las que llevan guía</option>
        </select>
      </div>

      <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
        Guardar
      </SubmitButton>
    </form>
  );
}

/**
 * Panel para registrar una guía de despacho sin factura.
 * El usuario llena número, fecha, cliente, neto y vendedor; después la guía
 * queda disponible para asignarla a un mes de comisión.
 */
export function RegisterGuidePanel({
  people,
  partners,
}: {
  people: PersonOption[];
  partners: PersonOption[];
}) {
  const [state, formAction] = useActionState<
    { error?: string; ok?: boolean; guideId?: string; message?: string } | undefined,
    FormData
  >(registerDispatchGuide, undefined);
  useCommissionFeedback(state, "Guía registrada.");

  return (
    <section className={cardClass + " p-5"}>
      <h2 className="font-semibold">Registrar guía de despacho</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Guías emitidas que todavía no tienen factura. Regístralas acá y después
        asígnales el mes de comisión correspondiente.
      </p>
      <form action={formAction} className="mt-4 flex flex-wrap gap-3 items-end">
        <div className={fieldClass + " w-36"}>
          <label htmlFor="dg-number" className={labelClass}>
            Nº guía
          </label>
          <input
            id="dg-number"
            name="guideNumber"
            required
            maxLength={50}
            placeholder="Ej: 5470"
            className={controlClass}
          />
        </div>
        <div className={fieldClass + " w-36"}>
          <label htmlFor="dg-date" className={labelClass}>
            Fecha despacho
          </label>
          <input
            id="dg-date"
            name="date"
            type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
            required
            className={controlClass}
          />
        </div>
        <div className={fieldClass + " flex-1 min-w-[14rem]"}>
          <label htmlFor="dg-partner" className={labelClass}>
            Cliente
          </label>
          <select
            id="dg-partner"
            name="partnerId"
            required
            className={controlClass}
          >
            <option value="" disabled>
              Selecciona cliente
            </option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className={fieldClass + " w-32"}>
          <label htmlFor="dg-net" className={labelClass}>
            Neto
          </label>
          <input
            id="dg-net"
            name="netAmount"
            type="number"
            inputMode="numeric"
            required
            min={1}
            className={controlClass + " tabular"}
            placeholder="0"
          />
        </div>
        <div className={fieldClass + " w-48"}>
          <label htmlFor="dg-salesperson" className={labelClass}>
            Vendedor
          </label>
          <select
            id="dg-salesperson"
            name="salespersonId"
            required
            className={controlClass}
          >
            <option value="" disabled>
              Selecciona vendedor
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className={fieldClass + " flex-1 min-w-[12rem]"}>
          <label htmlFor="dg-note" className={labelClass}>
            Nota
          </label>
          <input
            id="dg-note"
            name="note"
            maxLength={200}
            placeholder="Opcional"
            className={controlClass}
          />
        </div>
        <SubmitButton pendingLabel="Registrando..." className={primaryButtonClass}>
          Registrar
        </SubmitButton>
      </form>
      {state?.error && (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      )}
    </section>
  );
}

/**
 * Panel para asignar guías ya registradas al mes de comisión actual.
 * Muestra las guías que no tienen asignación y permite elegir a qué mes
 * llevan cada una.
 */
export type RegisteredGuide = {
  id: string;
  guideNumber: string;
  date: Date;
  partnerName: string;
  salespersonName: string;
  net: number;
};

export function AssignGuidesPanel({
  period,
  periodLabel,
  people,
  guides,
}: {
  period: string;
  periodLabel: string;
  people: PersonOption[];
  guides: RegisteredGuide[];
}) {
  const [state, formAction] = useActionState<CommissionActionState, FormData>(
    assignDispatchGuide,
    undefined,
  );
  useCommissionFeedback(state, "Guía asignada.");

  if (guides.length === 0) return null;

  return (
    <section className={cardClass + " p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Guías registradas sin asignar</h2>
        <span className="text-xs text-muted-foreground">
          {guides.length} guía{guides.length !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Guías de despacho que ya registraste pero aún no has llevado a ningún
        mes de comisión.
      </p>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="period" value={period} />
        {guides.map((guide) => (
          <div key={guide.id} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <div className="flex-1 min-w-[18rem]">
              <div className="text-sm font-medium">
                Guía N° {guide.guideNumber}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(guide.date)} · {guide.partnerName} ·{" "}
                <span className="tabular font-semibold text-foreground">
                  {formatCLP(guide.net)}
                </span>
              </div>
            </div>
            <div className={fieldClass + " w-40"}>
              <label htmlFor={`ag-sp-${guide.id}`} className={labelClass}>
                Vendedor
              </label>
              <select
                id={`ag-sp-${guide.id}`}
                name="salespersonId"
                defaultValue={guide.salespersonName === people[0]?.label ? people[0]?.id : ""}
                className={controlClass}
              >
                <option value="" disabled>
                  Selecciona
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="guideId" value={guide.id} />
            <SubmitButton
              pendingLabel="Asignando..."
              className={secondaryButtonClass}
            >
              Asignar a {periodLabel}
            </SubmitButton>
          </div>
        ))}
      </form>
    </section>
  );
}
