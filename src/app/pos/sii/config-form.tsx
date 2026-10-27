"use client";

import { useActionState } from "react";

import { upsertPosCaf, deletePosCafAction, togglePosSiiEnabledAction } from "@/app/actions/pos-sii-caf";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, dangerButtonClass, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type Config = {
  certificadoPfx?: string | null;
  certificadoPass?: string | null;
  certificadoVence?: Date | string | null;
  resolucionSii?: string | null;
  resolucionFecha?: Date | string | null;
  acteco?: string | null;
  habilitado: boolean;
  updatedAt?: Date | string | null;
} | null;

export function PosSiiConfigForm({ config, siiEnvironment }: { config: Config; siiEnvironment: string }) {
  const [state, formAction] = useActionState(upsertPosCaf, undefined);
  const [deleteState, deleteAction] = useActionState(deletePosCafAction, undefined);
  const [toggleState, toggleAction] = useActionState(togglePosSiiEnabledAction, undefined);

  const isExpired = config?.certificadoVence ? new Date(config.certificadoVence) < new Date() : false;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold">Certificado Digital</h2>
      <p className="text-xs text-muted-foreground">
        Sube el archivo .pfx/.p12 del certificado digital SII. La clave se encripta y no se muestra.
      </p>

      {config?.certificadoPfx ? (
        <div className="rounded-control border border-border bg-background p-4">
          <p className="text-sm font-medium">Certificado cargado</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Expira:</span>{" "}
              <span className={config?.certificadoVence && new Date(config.certificadoVence) < new Date() ? "text-danger" : "text-foreground"}>
                {config.certificadoVence
                  ? new Date(config.certificadoVence).toLocaleDateString("es-CL")
                  : "No informada"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Actualizado:</span>{" "}
              <span>{config.updatedAt ? new Date(config.updatedAt).toLocaleString("es-CL") : "—"}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <form action={deleteAction} className="w-full">
              <SubmitButton className={dangerButtonClass} pendingLabel="Eliminando…">
                Eliminar certificado
              </SubmitButton>
            </form>
            <form action={formAction} className="w-full">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="file" name="certificadoPfx" accept=".pfx,.p12" className="sr-only" id="pfx-file" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
                <button type="button" onClick={() => document.getElementById("pfx-file")?.click()} className={secondaryButtonClass}>
                  Reemplazar .pfx
                </button>
              </label>
            </form>
          </div>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div className={fieldClass}>
            <label htmlFor="pos-pfx-file" className={labelClass}>
              Archivo .pfx / .p12
            </label>
            <input
              id="pos-pfx-file"
              name="certificadoPfx"
              type="file"
              accept=".pfx,.p12"
              className={controlClass}
              required
            />
            <p className="text-xs text-muted-foreground">
              Máx. 5 MB. Solo .pfx o .p12.
            </p>
          </div>

          <div className={fieldClass}>
            <label htmlFor="pos-cert-pass" className={labelClass}>
              Clave del certificado
            </label>
            <input
              id="pos-cert-pass"
              name="certificadoPass"
              type="password"
              className={controlClass}
              placeholder="Clave del .pfx (se encripta al guardar)"
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="pos-cert-expiry" className={labelClass}>
              Vencimiento (opcional)
            </label>
            <input
              id="pos-cert-expiry"
              name="certificadoVence"
              type="date"
              className={controlClass}
            />
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <SubmitButton pendingLabel="Subiendo…" className={primaryButtonClass}>
            Subir certificado
          </SubmitButton>
        </form>
      )}

      <div className="border-t border-border mt-5 pt-5">
        <h2 className="text-sm font-semibold">Datos del Emisor</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Complementan los datos de la empresa para la facturación electrónica.
        </p>

        <form action={formAction} className="mt-3 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="pos-resolucion" className={labelClass}>
                Resolución SII
              </label>
              <input
                id="pos-resolucion"
                name="resolucionSii"
                type="text"
                value={config?.resolucionSii ?? ""}
                onChange={(e) => e.target.form?.requestSubmit?.() || e.target.dispatchEvent(new Event("input", { bubbles: true }))}
                className={controlClass}
                placeholder="Ej: EXENTA RESOLUCIÓN EXENTA N° 123"
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="pos-resolucion-fecha" className={labelClass}>
                Fecha resolución
              </label>
              <input
                id="pos-resolucion-fecha"
                name="resolucionFecha"
                type="date"
                value={config?.resolucionFecha ? new Date(config.resolucionFecha).toISOString().slice(0, 10) : ""}
                onChange={(e) => e.target.form?.requestSubmit?.() || e.target.dispatchEvent(new Event("input", { bubbles: true }))}
                className={controlClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="pos-acteco" className={labelClass}>
                Actividad económica (acteco)
              </label>
              <input
                id="pos-acteco"
                name="acteco"
                type="text"
                value={config?.acteco ?? ""}
                onChange={(e) => e.target.form?.requestSubmit?.() || e.target.dispatchEvent(new Event("input", { bubbles: true }))}
                className={controlClass + " tabular"}
                placeholder="Ej: 471101 (Comercio al por menor)"
                maxLength={6}
              />
            </div>
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>
            Guardar datos del emisor
          </SubmitButton>
        </form>
      </div>

      <div className="border-t border-border mt-5 pt-5">
        <h2 className="text-sm font-semibold">Habilitación del Módulo SII</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Activa la facturación electrónica en el POS. Requiere certificado, resolución y acteco.
        </p>

        <form action={toggleAction} className="mt-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="habilitado"
              checked={config?.habilitado ?? false}
              onChange={(e) => e.target.form?.requestSubmit()}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm">
              {config?.habilitado ? "Módulo SII habilitado" : "Módulo SII deshabilitado"}
            </span>
          </label>
          <input type="hidden" name="habilitado" value={config?.habilitado ? "on" : "off"} />
        </form>

        {toggleState?.error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {toggleState.error}
          </p>
        ) : null}
      </div>

      <div className="border-t border-border mt-5 pt-5">
        <h2 className="text-sm font-semibold">Entorno del SII</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Define la variable de entorno `SII_ENVIRONMENT` (`pruebas` o `produccion`)
          en el servidor para elegir a qué entorno se envían los DTE. Actualmente:
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            siiEnvironment === "produccion"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {siiEnvironment === "produccion" ? "🟡 Producción" : "🟢 Pruebas"}
          </span>
          <p className="text-xs text-muted-foreground ml-2">
            Sin definir = pruebas. Cambia en .env y reinicia el servidor.
          </p>
        </div>
      </div>
    </div>
  );
}