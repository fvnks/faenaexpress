"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  createSchoolFromAdmin,
  createUserFromAdmin,
  type PlatformActionState,
} from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// Alta asistida de una persona: existe al instante con una clave provisional, y
// la cambia sola al entrar. La invitación sirve cuando el cliente arma su
// propio equipo; esto, para el alta guiada y las cuentas de prueba.
export function CreateUserForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    createUserFromAdmin,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Usuario creado");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-user-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="new-user-name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="Ana Pérez"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="new-user-email" className={labelClass}>
            Correo
          </label>
          <input
            id="new-user-email"
            name="email"
            type="email"
            required
            placeholder="ana@empresa.cl"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="new-user-password" className={labelClass}>
            Contraseña provisional
          </label>
          <input
            id="new-user-password"
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className={controlClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            La persona la cambia al entrar: queda obligada a hacerlo.
          </p>
        </div>
        <div>
          <label htmlFor="new-user-org" className={labelClass}>
            Organización
          </label>
          <select
            id="new-user-org"
            name="organizationId"
            defaultValue=""
            className={controlClass}
          >
            <option value="">Sin organización</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-user-org-role" className={labelClass}>
            Rol en la organización
          </label>
          <select
            id="new-user-org-role"
            name="orgRole"
            defaultValue="OWNER"
            className={controlClass}
          >
            <option value="OWNER">Dueño</option>
            <option value="ADMIN">Administrador</option>
            <option value="MEMBER">Miembro</option>
            <option value="BILLING">Facturación</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton className={secondaryButtonClass} pendingLabel="Creando...">
          Crear usuario
        </SubmitButton>
        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {pending ? "Creando usuario" : ""}
      </span>
    </form>
  );
}

/**
 * Crea un colegio. Habilita además el módulo Colegios para la organización y
 * deja al operador dentro como DIRECTOR: sin un colegio, el módulo no aparecía
 * en el selector por más que estuviera habilitado.
 */
export function CreateSchoolForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    createSchoolFromAdmin,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Colegio creado");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-school-name" className={labelClass}>
            Nombre del colegio
          </label>
          <input
            id="new-school-name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="Colegio San Andrés"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="new-school-org" className={labelClass}>
            Sostenedor
          </label>
          <select
            id="new-school-org"
            name="organizationId"
            defaultValue=""
            className={controlClass}
          >
            <option value="">Sin sostenedor</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-school-level" className={labelClass}>
            Nivel
          </label>
          <select
            id="new-school-level"
            name="level"
            defaultValue="BASICA"
            className={controlClass}
          >
            <option value="PARVULARIA">Parvularia</option>
            <option value="PREBASICA">Prebásica</option>
            <option value="BASICA">Básica</option>
            <option value="MEDIA">Media</option>
            <option value="TECNICO">Técnico profesional</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-school-rut" className={labelClass}>
            RUT del establecimiento
          </label>
          <input
            id="new-school-rut"
            name="rut"
            type="text"
            maxLength={20}
            placeholder="76.543.210-K"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="new-school-commune" className={labelClass}>
            Comuna
          </label>
          <input
            id="new-school-commune"
            name="commune"
            type="text"
            maxLength={80}
            placeholder="Providencia"
            className={controlClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton className={secondaryButtonClass} pendingLabel="Creando...">
          Crear colegio
        </SubmitButton>
        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {pending ? "Creando colegio" : ""}
      </span>
    </form>
  );
}
