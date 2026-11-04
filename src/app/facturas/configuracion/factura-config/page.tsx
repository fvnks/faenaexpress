"use client";

import { useEffect, useState, useActionState } from "react";

import { saveFacturaConfiguracion, getFacturaConfiguracion, type FacturaConfiguracionState } from "@/app/actions/factura-config";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, fieldClass } from "@/lib/ui";

export default function FacturaConfiguracionPage() {
  const [config, setConfig] = useState<{
    logo: string | null;
    mostrarLogo: boolean;
    mostrarTimbreSii: boolean;
    textoPie: string | null;
  } | null>(null);
  const [state, saveFacturaConfiguracionAction] = useActionState<FacturaConfiguracionState, FormData>(saveFacturaConfiguracion, undefined);

  // Cargar configuración inicial al montar
  useEffect(() => {
    getFacturaConfiguracion().then((c) => {
      if (c) {
        setConfig({
          logo: c.logo ?? null,
          mostrarLogo: c.mostrarLogo ?? true,
          mostrarTimbreSii: c.mostrarTimbreSii ?? true,
          textoPie: c.textoPie ?? null,
        });
      }
    });
  }, []);

  if (!config) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración de Factura</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cargando configuración de factura…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de Factura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personaliza el logo y las opciones de impresión de tus facturas
          (ventas y compras).
        </p>
      </div>

      <form action={saveFacturaConfiguracionAction} className="flex flex-col gap-4 max-w-2xl">
        <fieldset className={fieldClass}>
          <legend className={labelClass}>Logo de la empresa</legend>
          <div className="flex flex-col gap-3">
            <label htmlFor="logo" className={labelClass}>
              Imagen del logo (PNG o JPG, máximo 2MB)
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className={controlClass}
            />
            {config.logo && (
              <div className="flex items-center gap-3 mt-2">
                <img
                  src={config.logo}
                  alt="Logo actual"
                  className="h-12 w-auto rounded border border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Logo actual cargado
                </p>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className={fieldClass}>
          <legend className={labelClass}>Opciones de impresión</legend>
          <div className="flex flex-col gap-3">
            <label className={controlClass}>
              <input
                id="mostrarLogo"
                name="mostrarLogo"
                type="checkbox"
                defaultChecked={config.mostrarLogo}
                className="rounded border-gray-300 text-primary"
              />
              Mostrar logo en las facturas
            </label>
            <label className={controlClass}>
              <input
                id="mostrarTimbreSii"
                name="mostrarTimbreSii"
                type="checkbox"
                defaultChecked={config.mostrarTimbreSii}
                className="rounded border-gray-300 text-primary"
              />
              Mostrar timbre electrónico SII (PDF417)
            </label>
          </div>
        </fieldset>

        <div className={fieldClass}>
          <label htmlFor="textoPie" className={labelClass}>
            Texto adicional al pie
          </label>
          <textarea
            id="textoPie"
            name="textoPie"
            rows={3}
            defaultValue={config.textoPie ?? ""}
            className={controlClass}
            placeholder="Ejemplo: Gracias por su compra / Este documento es un comprobante de venta..."
          />
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton className="py-1.5" pendingLabel="Guardando…">
            Guardar configuración
          </SubmitButton>
          {state?.ok ? (
            <span className="text-sm text-success">Guardado correctamente.</span>
          ) : null}
          {state?.error ? (
            <span className="text-sm text-error">{state.error}</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}