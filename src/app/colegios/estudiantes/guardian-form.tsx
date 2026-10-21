"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  linkGuardian,
  saveGuardian,
  unlinkGuardian,
  type EnrollmentFormState,
} from "@/app/actions/school-enrollment";
import { issueGuardianCode, type PortalFormState } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

type Apoderado = {
  id: string;
  nombre: string;
  tipo: string;
  /** Si ya tiene un código de acceso al portal. */
  tieneCodigo: boolean;
};

/**
 * Apoderados del alumno.
 *
 * El apoderado es la contraparte de todo lo que hace el colegio: el que
 * recibe las comunicaciones, el que paga y el que autoriza. Por eso se puede
 * agregar, editar y cambiar el tipo (titular, suplente, emergencia).
 */
export function GuardianForms({
  studentId,
  apoderados,
  disponibles,
  puedeEditar,
}: {
  studentId: string;
  apoderados: Apoderado[];
  /** Los apoderados del colegio que todavía no están vinculados a este alumno. */
  disponibles: { id: string; nombre: string }[];
  puedeEditar: boolean;
}) {
  const [panel, setPanel] = useState<"nuevo" | "vincular" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-border">
        {apoderados.length === 0 ? (
          <li className="py-2 text-sm text-muted-foreground">
            Este alumno no tiene apoderados registrados.
          </li>
        ) : (
          apoderados.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-sm font-medium">{a.nombre}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {a.tipo === "TITULAR"
                    ? "Titular"
                    : a.tipo === "SUPLENTE"
                      ? "Suplente"
                      : a.tipo === "EMERGENCIA"
                        ? "Emergencia"
                        : a.tipo}
                </span>
                {puedeEditar ? (
                  <IssueCodeButton
                    studentId={studentId}
                    guardianId={a.id}
                    nombre={a.nombre}
                    tieneCodigo={a.tieneCodigo}
                  />
                ) : null}
                {puedeEditar ? (
                  <UnlinkButton studentId={studentId} guardianId={a.id} nombre={a.nombre} />
                ) : null}
              </span>
            </li>
          ))
        )}
      </ul>

      {puedeEditar ? (
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setPanel(panel === "nuevo" ? null : "nuevo")}
            className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          >
            Nuevo apoderado
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "vincular" ? null : "vincular")}
            className="rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            Vincular uno que ya existe
          </button>
        </div>
      ) : null}

      {panel === "nuevo" ? (
        <GuardianForm studentId={studentId} />
      ) : null}
      {panel === "vincular" ? (
        <LinkGuardianForm studentId={studentId} disponibles={disponibles} />
      ) : null}
    </div>
  );
}

/** Alta de un apoderado nuevo (y su vínculo con el alumno, de una vez). */
function GuardianForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(saveGuardian, undefined);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Apoderado creado y vinculado");
    form.current?.reset();
  }, [state]);

  return (
    <form action={action} className="flex max-w-md flex-col gap-3 rounded-control border border-border p-4">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="type" value="TITULAR" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor={`guardianName-${studentId}`} className={labelClass}>
            Nombre
          </label>
          <input
            id={`guardianName-${studentId}`}
            name="name"
            type="text"
            required
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor={`guardianRut-${studentId}`} className={labelClass}>
            RUT
          </label>
          <input id={`guardianRut-${studentId}`} name="rut" type="text" className={controlClass} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor={`guardianPhone-${studentId}`} className={labelClass}>
            Teléfono
          </label>
          <input id={`guardianPhone-${studentId}`} name="phone" type="text" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor={`guardianEmail-${studentId}`} className={labelClass}>
            Correo
          </label>
          <input id={`guardianEmail-${studentId}`} name="email" type="email" className={controlClass} />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div className="flex items-center gap-3">
        <SubmitButton
          className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Crear y vincular
        </SubmitButton>
      </div>
    </form>
  );
}

/** Vincula un apoderado que ya existe en el colegio. */
function LinkGuardianForm({
  studentId,
  disponibles,
}: {
  studentId: string;
  disponibles: { id: string; nombre: string }[];
}) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(linkGuardian, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Apoderado vinculado");
  }, [state]);

  if (disponibles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos los apoderados del colegio ya están vinculados a alguien.
      </p>
    );
  }

  return (
    <form action={action} className="flex max-w-md flex-col gap-3 rounded-control border border-border p-4">
      <input type="hidden" name="studentId" value={studentId} />

      <div className={fieldClass}>
        <label htmlFor={`linkGuardian-${studentId}`} className={labelClass}>
          Apoderado
        </label>
        <select
          id={`linkGuardian-${studentId}`}
          name="guardianId"
          className={controlClass}
          defaultValue=""
        >
          <option value="">Elige…</option>
          {disponibles.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClass}>
        <label htmlFor={`linkType-${studentId}`} className={labelClass}>
          Tipo
        </label>
        <select
          id={`linkType-${studentId}`}
          name="type"
          className={controlClass}
          defaultValue="TITULAR"
        >
          <option value="TITULAR">Titular</option>
          <option value="SUPLENTE">Suplente</option>
          <option value="EMERGENCIA">Emergencia</option>
        </select>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <SubmitButton
        className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
        pendingLabel="Guardando..."
      >
        Vincular
      </SubmitButton>
    </form>
  );
}

/**
 * Emite (o rota) el código de acceso al portal de un apoderado.
 *
 * El código se lo lleva la familia a la casa: el colegio se lo entrega en
 * persona. Por eso el código se muestra en pantalla apenas se genera, para
 * anotarlo, y no se guarda en texto plano en ninguna parte.
 */
function IssueCodeButton({
  studentId,
  guardianId,
  nombre,
  tieneCodigo,
}: {
  studentId: string;
  guardianId: string;
  nombre: string;
  tieneCodigo: boolean;
}) {
  const [state, action] = useActionState<PortalFormState, FormData>(
    issueGuardianCode,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(`Código generado para ${nombre}`);
  }, [state, nombre]);

  return (
    <span className="inline-flex items-center gap-2">
      {state?.codigo ? (
        <span className="rounded-control border border-primary bg-primary-soft px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-primary">
          {state.codigo}
        </span>
      ) : null}
      <form action={action} className="inline">
        <input type="hidden" name="guardianId" value={guardianId} />
        <input type="hidden" name="studentId" value={studentId} />
        <button
          type="submit"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
          title={
            tieneCodigo
              ? "Genera un código nuevo y corta el acceso del anterior"
              : "Genera el código de acceso al portal para esta familia"
          }
        >
          {tieneCodigo ? "Rotar código" : "Dar acceso al portal"}
        </button>
      </form>
    </span>
  );
}

/** Desvincula un apoderado del alumno. */
function UnlinkButton({
  studentId,
  guardianId,
  nombre,
}: {
  studentId: string;
  guardianId: string;
  nombre: string;
}) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(
    unlinkGuardian,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(`${nombre} quedó desvinculado`);
  }, [state, nombre]);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="guardianId" value={guardianId} />
      <button
        type="submit"
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-danger"
      >
        Quitar
      </button>
    </form>
  );
}
