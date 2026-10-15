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

type WorkerLike = {
  id: string;
  name: string;
  rut: string | null;
  active: boolean;
  position?: string | null;
  areaId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  birthDate?: Date | null;
  hireDate?: Date | null;
  terminationDate?: Date | null;
  contractType?: string | null;
  status?: string | null;
  baseAmount?: number | null;
  bankName?: string | null;
  bankAccount?: string | null;
  afp?: string | null;
  healthPlan?: string | null;
  notes?: string | null;
};

type AreaLike = { id: string; name: string };

function dateValue(value: Date | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

const contractTypes = ["Indefinido", "Plazo fijo", "Honorarios", "Part time", "Práctica"];
const statuses = ["Activo", "Licencia", "Suspendido", "Desvinculado"];

// --- Trabajadores -----------------------------------------------------------

export function NewWorkerForm({ areas = [] }: { areas?: AreaLike[] }) {
  const [state, action] = useActionState<RrhhFormState, FormData>(createRrhhWorker, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Trabajador creado");
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className={fieldClass}>
        <label htmlFor="worker-new-name" className={labelClass}>
          Nombre
        </label>
        <input id="worker-new-name" name="name" required maxLength={120} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-rut" className={labelClass}>
          RUT <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input id="worker-new-rut" name="rut" maxLength={12} placeholder="18.385.024-5" className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-area" className={labelClass}>
          Área
        </label>
        <select id="worker-new-area" name="areaId" defaultValue="" className={controlClass}>
          <option value="">Sin área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-position" className={labelClass}>Cargo</label>
        <input id="worker-new-position" name="position" maxLength={120} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-email" className={labelClass}>Correo</label>
        <input id="worker-new-email" name="email" type="email" maxLength={120} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-phone" className={labelClass}>Teléfono</label>
        <input id="worker-new-phone" name="phone" maxLength={40} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-hire" className={labelClass}>Fecha de ingreso</label>
        <input id="worker-new-hire" name="hireDate" type="date" className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-contract" className={labelClass}>Tipo de contrato</label>
        <select id="worker-new-contract" name="contractType" defaultValue="" className={controlClass}>
          <option value="">Sin registrar</option>
          {contractTypes.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor="worker-new-base" className={labelClass}>Sueldo base mensual</label>
        <input id="worker-new-base" name="baseAmount" type="number" min={0} step={1} className={controlClass + " tabular"} />
      </div>
      <div className="flex items-end">
        <SubmitButton pendingLabel="Creando…" className="btn-liquid btn-liquid-secondary h-10 rounded-control border border-border bg-transparent px-4 text-sm font-semibold text-foreground">
          Agregar
        </SubmitButton>
      </div>
      {state?.error ? <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p> : null}
    </form>
  );
}

export function WorkerRowForm({
  worker,
  areas = [],
}: {
  worker: WorkerLike;
  areas?: AreaLike[];
}) {
  const [state, action] = useActionState<RrhhFormState, FormData>(updateRrhhWorker.bind(null, worker.id), undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Trabajador actualizado");
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className={fieldClass}>
        <label htmlFor={`worker-${worker.id}-name`} className={labelClass}>Nombre</label>
        <input id={`worker-${worker.id}-name`} name="name" required maxLength={120} defaultValue={worker.name} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor={`worker-${worker.id}-rut`} className={labelClass}>RUT</label>
        <input id={`worker-${worker.id}-rut`} name="rut" maxLength={12} defaultValue={worker.rut ?? ""} placeholder="Sin RUT" className={controlClass} />
      </div>
      <label className="flex items-center gap-2 self-end text-sm text-muted-foreground">
        <input type="checkbox" name="active" defaultChecked={worker.active} className="h-4 w-4 accent-primary" />
        Activo
      </label>
      <div className={fieldClass}>
        <label className={labelClass}>Cargo</label>
        <input name="position" maxLength={120} defaultValue={worker.position ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Área</label>
        <select name="areaId" defaultValue={worker.areaId ?? ""} className={controlClass}>
          <option value="">Sin área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Correo</label>
        <input name="email" type="email" maxLength={120} defaultValue={worker.email ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Teléfono</label>
        <input name="phone" maxLength={40} defaultValue={worker.phone ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Comuna/ciudad</label>
        <input name="city" maxLength={80} defaultValue={worker.city ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass + " sm:col-span-2"}>
        <label className={labelClass}>Dirección</label>
        <input name="address" maxLength={180} defaultValue={worker.address ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Nacimiento</label>
        <input name="birthDate" type="date" defaultValue={dateValue(worker.birthDate)} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Ingreso</label>
        <input name="hireDate" type="date" defaultValue={dateValue(worker.hireDate)} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Término contrato</label>
        <input name="terminationDate" type="date" defaultValue={dateValue(worker.terminationDate)} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Tipo de contrato</label>
        <select name="contractType" defaultValue={worker.contractType ?? ""} className={controlClass}>
          <option value="">Sin registrar</option>
          {contractTypes.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Estado</label>
        <select name="status" defaultValue={worker.status ?? ""} className={controlClass}>
          <option value="">Sin registrar</option>
          {statuses.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Sueldo base mensual</label>
        <input name="baseAmount" type="number" min={0} step={1} defaultValue={worker.baseAmount ?? ""} className={controlClass + " tabular"} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>AFP</label>
        <input name="afp" maxLength={80} defaultValue={worker.afp ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Previsión/salud</label>
        <input name="healthPlan" maxLength={80} defaultValue={worker.healthPlan ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Banco</label>
        <input name="bankName" maxLength={80} defaultValue={worker.bankName ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>Cuenta bancaria</label>
        <input name="bankAccount" maxLength={80} defaultValue={worker.bankAccount ?? ""} className={controlClass} />
      </div>
      <div className={fieldClass + " sm:col-span-2 lg:col-span-3"}>
        <label className={labelClass}>Notas</label>
        <textarea name="notes" maxLength={500} defaultValue={worker.notes ?? ""} className={controlClass} rows={2} />
      </div>
      <div className="flex items-end">
        <SubmitButton pendingLabel="…" className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground">
          Guardar
        </SubmitButton>
      </div>
      {state?.error ? <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p> : null}
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
  // unchanged
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
        <label htmlFor="rem-worker" className={labelClass}>Trabajador</label>
        <SelectDropdown id="rem-worker" name="workerId" value="" emptyLabel="Selecciona" allowEmpty={false} options={workers.map((worker) => ({ value: worker.id, label: worker.name }))} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-type" className={labelClass}>Tipo de pago</label>
        <SelectDropdown id="rem-type" name="type" value="SUELDO" allowEmpty={false} options={remunerationTypeValues.map((value) => ({ value, label: remunerationTypeLabel(value) }))} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-period" className={labelClass}>Período <span className="text-muted-foreground">(opcional)</span></label>
        <input id="rem-period" name="period" type="month" className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-date" className={labelClass}>Fecha de pago</label>
        <input id="rem-date" name="date" type="date" required defaultValue={today} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-amount" className={labelClass}>Monto pagado (líquido)</label>
        <input id="rem-amount" name="amount" type="number" inputMode="numeric" min={1} step={1} required placeholder="800000" className={controlClass + " tabular"} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="rem-payer" className={labelClass}>Pagado por</label>
        <SelectDropdown id="rem-payer" name="paidById" value="" emptyLabel="Selecciona" allowEmpty={false} options={payers.map((payer) => ({ value: payer.id, label: payer.name }))} />
      </div>
      <div className={fieldClass + " sm:col-span-2 lg:col-span-1"}>
        <label htmlFor="rem-notes" className={labelClass}>Notas <span className="text-muted-foreground">(opcional)</span></label>
        <input id="rem-notes" name="notes" maxLength={500} className={controlClass} />
      </div>
      <div className="flex items-end">
        <SubmitButton pendingLabel="Registrando…" className="btn-liquid btn-liquid-primary h-10 w-full rounded-control border border-primary bg-transparent px-4 text-sm font-semibold text-primary">
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