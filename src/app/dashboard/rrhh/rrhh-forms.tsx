"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  createRemuneration,
  createRrhhWorker,
  updateRrhhWorker,
  type RrhhFormState,
} from "@/app/actions/rrhh";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { remunerationTypeLabel } from "@/lib/labels";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";
import { remunerationTypeValues } from "@/lib/validation";

// --- Trabajadores ------------------------------------------------------------

export function NewWorkerForm() {
  const [state, action] = useActionState<RrhhFormState, FormData>(createRrhhWorker, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Trabajador creado");
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className={fieldClass}>
        <label htmlFor="worker-new-name" className={labelClass}>
          Nombre
        </label>
        <input
          id="worker-new-name"
          name="name"
          required
          maxLength={120}
          placeholder="Ej: Felipe Valenzuela"
          className={controlClass}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-rut" className={labelClass}>
          RUT <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="worker-new-rut"
          name="rut"
          maxLength={12}
          placeholder="18.385.024-5"
          className={controlClass}
        />
      </div>
      <SubmitButton
        pendingLabel="Creando…"
        className="btn-liquid btn-liquid-secondary h-10 rounded-control border border-border bg-transparent px-4 text-sm font-semibold text-foreground"
      >
        Agregar
      </SubmitButton>
      {state?.error ? <p className="text-sm text-danger sm:col-span-3">{state.error}</p> : null}
    </form>
  );
}

export function WorkerRowForm({
  worker,
}: {
  worker: { id: string; name: string; rut: string | null; active: boolean };
}) {
  const [state, action] = useActionState<RrhhFormState, FormData>(
    updateRrhhWorker.bind(null, worker.id),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Trabajador actualizado");
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
      <div>
        <label htmlFor={`worker-${worker.id}-name`} className="sr-only">
          Nombre
        </label>
        <input
          id={`worker-${worker.id}-name`}
          name="name"
          required
          maxLength={120}
          defaultValue={worker.name}
          className={controlClass}
        />
      </div>
      <div>
        <label htmlFor={`worker-${worker.id}-rut`} className="sr-only">
          RUT
        </label>
        <input
          id={`worker-${worker.id}-rut`}
          name="rut"
          maxLength={12}
          defaultValue={worker.rut ?? ""}
          placeholder="Sin RUT"
          className={controlClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="active"
          defaultChecked={worker.active}
          className="h-4 w-4 accent-primary"
        />
        Activo
      </label>
      <SubmitButton
        pendingLabel="…"
        className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
      >
        Guardar
      </SubmitButton>
      {state?.error ? <p className="text-sm text-danger sm:col-span-4">{state.error}</p> : null}
    </form>
  );
}

// --- Registrar pago -----------------------------------------------------------

export function NewRemunerationForm({
  workers,
  payers,
  today,
}: {
  workers: { id: string; name: string }[];
  payers: { id: string; name: string }[];
  today: string;
}) {
  const [state, action] = useActionState<RrhhFormState, FormData>(createRemuneration, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Pago registrado", { description: "El gasto asociado quedó en Gastos." });
  }, [state]);

  if (workers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Agrega al menos un trabajador para registrar pagos.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className={fieldClass}>
        <label htmlFor="rem-worker" className={labelClass}>
          Trabajador
        </label>
        <SelectDropdown
          id="rem-worker"
          name="workerId"
          value=""
          emptyLabel="Selecciona"
          allowEmpty={false}
          options={workers.map((worker) => ({ value: worker.id, label: worker.name }))}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-type" className={labelClass}>
          Tipo de pago
        </label>
        <SelectDropdown
          id="rem-type"
          name="type"
          value="SUELDO"
          allowEmpty={false}
          options={remunerationTypeValues.map((value) => ({ value, label: remunerationTypeLabel(value) }))}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-period" className={labelClass}>
          Período <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input id="rem-period" name="period" type="month" className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-date" className={labelClass}>
          Fecha de pago
        </label>
        <input
          id="rem-date"
          name="date"
          type="date"
          required
          defaultValue={today}
          className={controlClass}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-amount" className={labelClass}>
          Monto pagado (líquido)
        </label>
        <input
          id="rem-amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          placeholder="800000"
          className={controlClass + " tabular"}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-payer" className={labelClass}>
          Pagado por
        </label>
        <SelectDropdown
          id="rem-payer"
          name="paidById"
          value=""
          emptyLabel="Selecciona"
          allowEmpty={false}
          options={payers.map((payer) => ({ value: payer.id, label: payer.name }))}
        />
      </div>
      <div className={fieldClass + " sm:col-span-2 lg:col-span-1"}>
        <label htmlFor="rem-notes" className={labelClass}>
          Notas <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input id="rem-notes" name="notes" maxLength={500} className={controlClass} />
      </div>
      <div className="flex items-end">
        <SubmitButton
          pendingLabel="Registrando…"
          className="btn-liquid btn-liquid-primary h-10 w-full rounded-control border border-primary bg-transparent px-4 text-sm font-semibold text-primary"
        >
          Registrar pago
        </SubmitButton>
      </div>
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p>
      ) : null}
      <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
        Al registrar el pago se crea automáticamente el gasto sin IVA con el trabajador asociado.
      </p>
    </form>
  );
}
