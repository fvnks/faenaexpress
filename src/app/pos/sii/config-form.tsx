"use client";

import { useState } from "react";

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
  siiEnvironment?: string | null;
  habilitado: boolean;
  updatedAt?: Date | string | null;
} | null;

export function PosSiiConfigForm({ config }: { config: Config }) {
  const [state, setState] = useState<{ error?: string; ok?: boolean } | undefined>(undefined);
  const [deleteState, setDeleteState] = useState<{ error?: string; ok?: boolean } | undefined>(undefined);
  const [toggleState, setToggleState] = useState<{ error?: string; ok?: boolean } | undefined>(undefined);

  const isExpired = config?.certificadoVence ? new Date(config.certificadoVence) < new Date() : false;

  async function handleSaveConfig(formData: FormData) {
    setState(undefined);
    const result = await upsertPosCaf(undefined, formData);
    setState(result);
  }

  async function handleDeleteCert(formData: FormData) {
    setDeleteState(undefined);
    const result = await deletePosCafAction(undefined, formData);
    setDeleteState(result);
  }

  async function handleToggleConfig(formData: FormData) {
    setToggleState(undefined);
    const result = await togglePosSiiEnabledAction(undefined, formData);
    setToggleState(result);
  }

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
            <form action={handleDeleteCert} className="w-full">
              <SubmitButton className={dangerButtonClass} pendingLabel="Eliminando…">
                Eliminar certificado
              </SubmitButton>
            </form>
            <form action={handleSaveConfig} className="w-full">
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
        <form action={handleSaveConfig} className="flex flex-col gap-4">
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

        <form action={handleSaveConfig} className="mt-3 flex flex-col gap-4">
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

        <form action={handleToggleConfig} className="mt-3">
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
          Elige a qué entorno del SII se envían los DTE (boletas y facturas
          electrónicas). Este valor se guarda en la empresa y se puede cambiar
          en cualquier momento desde esta pantalla.
        </p>
        <form action={handleSaveConfig} className="mt-3 flex flex-col gap-3">
          <div className={fieldClass}>
            <label htmlFor="pos-sii-entorno" className={labelClass}>
              Entorno del SII
            </label>
            <select
              id="pos-sii-entorno"
              name="siiEnvironment"
              defaultValue={config?.siiEnvironment ?? "pruebas"}
              onChange={(e) => {
                e.target.form?.requestSubmit?.();
              }}
              className={controlClass}
            >
              <option value="pruebas">
                🟢 Pruebas (maullin.sii.cl)
              </option>
              <option value="produccion">
                🔴 Producción (palena.sii.cl)
              </option>
            </select>
            <p className="text-xs text-muted-foreground">
              Los DTE de pruebas no tienen validez fiscal real. Usa producción
              solo cuando tengas el certificado autorizado por el SII.
            </p>
          </div>
          {state?.error ? (
            <p role="alert" className="text-xs text-danger">{state.error}</p>
          ) : null}
          {state?.ok ? (
            <p className="text-xs text-success">Entorno del SII actualizado.</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
