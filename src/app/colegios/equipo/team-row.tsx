"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  changeTeamRole,
  linkTeacherAccount,
  removeTeamMember,
  unlinkTeacherAccount,
  type TeamFormState,
} from "@/app/actions/school-team";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass } from "@/lib/ui";

const ROLES = [
  { value: "DIRECTOR", label: "Dirección" },
  { value: "UTP", label: "Jefatura de estudios" },
  { value: "ADMIN", label: "Administración" },
  { value: "TEACHER", label: "Docente" },
  { value: "STAFF", label: "Funcionario" },
  { value: "VIEWER", label: "Solo lectura" },
];

export type MiembroEquipoVista = {
  membershipId: string;
  nombre: string;
  email: string;
  role: string;
  activo: boolean;
  debeCambiarClave: boolean;
  docenteId: string | null;
  docenteNombre: string | null;
  ultimaEntrada: string | null;
};

type FichaDocente = { id: string; nombre: string };

/**
 * Una fila del equipo: quién es, con qué rol entra y qué ficha de docente
 * tiene.
 *
 * El cambio de rol y el vínculo con la ficha son acciones separadas a propósito:
 * el rol dice qué puede hacer la persona en el colegio, y la ficha dice qué
 * clases y notas son suyas. Un docente sin ficha no tiene alcance, y una ficha
 * sin persona no tiene a quién preguntarle.
 */
export function TeamRow({
  miembro,
  docentes,
  soyYo,
}: {
  miembro: MiembroEquipoVista;
  docentes: FichaDocente[];
  soyYo: boolean;
}) {
  const [rolState, rolAction] = useActionState<TeamFormState, FormData>(
    changeTeamRole,
    undefined,
  );
  const [quitarState, quitarAction] = useActionState<TeamFormState, FormData>(
    removeTeamMember,
    undefined,
  );
  const [vincularState, vincularAction] = useActionState<TeamFormState, FormData>(
    linkTeacherAccount,
    undefined,
  );
  const [desvincularState, desvincularAction] = useActionState<TeamFormState, FormData>(
    unlinkTeacherAccount,
    undefined,
  );

  const [rol, setRol] = useState(miembro.role);

  useEffect(() => {
    if (rolState?.ok) toast.success("Rol actualizado");
  }, [rolState]);

  useEffect(() => {
    if (quitarState?.ok) toast.success("Persona sacada del equipo");
  }, [quitarState]);

  useEffect(() => {
    if (vincularState?.ok) toast.success("Ficha vinculada");
  }, [vincularState]);

  useEffect(() => {
    if (desvincularState?.ok) toast.success("Ficha suelta");
  }, [desvincularState]);

  const error = rolState?.error ?? quitarState?.error ?? vincularState?.error ?? desvincularState?.error;

  const fichasSueltas = docentes.filter((d) => d.id !== miembro.docenteId);

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {miembro.nombre}
            {soyYo ? <span className="ml-2 text-xs text-muted-foreground">(tú)</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {miembro.email}
            {miembro.activo ? null : " · sin acceso"}
            {miembro.debeCambiarClave ? " · tiene que cambiar su clave" : null}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {miembro.ultimaEntrada
              ? `Última entrada: ${new Date(miembro.ultimaEntrada).toLocaleString("es-CL")}`
              : "Nunca ha entrado"}
          </p>
        </div>

        <span
          className={
            "rounded-full px-2.5 py-1 text-xs font-medium " +
            (miembro.activo
              ? "bg-primary-soft text-primary"
              : "bg-background text-muted-foreground")
          }
        >
          {miembro.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form action={rolAction} className="flex items-end gap-2">
          <input type="hidden" name="membershipId" value={miembro.membershipId} />
          <div className={fieldClass}>
            <label htmlFor={`rol-${miembro.membershipId}`} className="text-xs text-muted-foreground">
              Rol
            </label>
            <select
              id={`rol-${miembro.membershipId}`}
              name="role"
              className={controlClass + " w-auto"}
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {rol !== miembro.role ? (
            <SubmitButton
              className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
              pendingLabel="Guardando..."
            >
              Guardar
            </SubmitButton>
          ) : null}
        </form>

        {miembro.activo && !soyYo ? (
          <form action={quitarAction}>
            <input type="hidden" name="membershipId" value={miembro.membershipId} />
            <ConfirmSubmit
              className="rounded-control border border-danger bg-transparent px-3 py-1.5 text-sm font-medium text-danger"
              title="Sacar a esta persona del equipo"
              description="Va a perder el acceso a los datos del colegio. Lo que ya registró (notas, asistencia, clases) queda con su nombre."
              confirmLabel="Sacarla del equipo"
            >
              Sacar del equipo
            </ConfirmSubmit>
          </form>
        ) : null}
      </div>

      <div className="rounded-control border border-border bg-background p-3">
        <p className="text-xs font-medium">
          Ficha de docente:{" "}
          {miembro.docenteNombre ? (
            <span className="text-foreground">{miembro.docenteNombre}</span>
          ) : (
            <span className="text-muted-foreground">sin ficha</span>
          )}
        </p>

        {miembro.docenteId ? (
          <form action={desvincularAction} className="mt-2">
            <input type="hidden" name="docenteId" value={miembro.docenteId} />
            <button
              type="submit"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Soltar la ficha
            </button>
          </form>
        ) : fichasSueltas.length > 0 ? (
          <form action={vincularAction} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="membershipId" value={miembro.membershipId} />
            <div className={fieldClass}>
              <label htmlFor={`ficha-${miembro.membershipId}`} className="text-xs text-muted-foreground">
                Vincular a una ficha
              </label>
              <select id={`ficha-${miembro.membershipId}`} name="docenteId" className={controlClass + " w-auto"} defaultValue="">
                <option value="">Elige…</option>
                {fichasSueltas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton
              className="rounded-control border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-foreground"
              pendingLabel="Vinculando..."
            >
              Vincular
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            No hay fichas de docente sueltas en este colegio.
          </p>
        )}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </li>
  );
}
