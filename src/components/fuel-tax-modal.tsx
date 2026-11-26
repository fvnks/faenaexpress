"use client";

import { useEffect, useId, useState } from "react";

import { TIPOS_COMBUSTIBLE, tipoRecuperable } from "@/lib/fuel";
import {
  controlClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { useFocusTrap } from "@/components/use-focus-trap";

export type DatosCombustible = {
  tipo: string;
  litros: string;
  impuesto: string;
  glosa: string;
  recuperable: boolean;
};

export const DATOS_COMBUSTIBLE_VACIOS: DatosCombustible = {
  tipo: "",
  litros: "",
  impuesto: "0",
  glosa: "",
  recuperable: false,
};

/**
 * Detalle tributario de una factura de combustible (Ley 18.502 / MEPCO).
 * Se abre al elegir una categoría marcada como combustible. Los valores viajan
 * al formulario mediante hidden inputs; la Server Action vuelve a validarlos.
 */
export function FuelTaxModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: DatosCombustible;
  onSave: (datos: DatosCombustible) => void;
  onClose: () => void;
}) {
  const tituloId = useId();
  const ref = useFocusTrap<HTMLDivElement>(open);
  const [datos, setDatos] = useState<DatosCombustible>(initial);

  useEffect(() => {
    if (open) setDatos(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cambiar = (campo: keyof DatosCombustible, valor: string | boolean) =>
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  const negativo = Number(datos.impuesto.replace(",", ".")) < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/30"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-lg"
      >
        <h2 id={tituloId} className="text-lg font-semibold">
          Impuestos de combustible
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ley 18.502 y componente variable MEPCO. El impuesto específico no forma parte de la base del IVA, pero sí del total de la factura.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className={fieldClass + " sm:col-span-2"}>
            <label htmlFor="fuelTipo" className={labelClass}>Tipo de combustible</label>
            <select
              id="fuelTipo"
              value={datos.tipo}
              onChange={(event) => cambiar("tipo", event.target.value)}
              className={controlClass}
            >
              <option value="">Selecciona el tipo…</option>
              {TIPOS_COMBUSTIBLE.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          <div className={fieldClass}>
            <label htmlFor="fuelLitros" className={labelClass}>Litros o m³</label>
            <input
              id="fuelLitros"
              type="number"
              min="0"
              step="0.01"
              value={datos.litros}
              onChange={(event) => cambiar("litros", event.target.value)}
              className={controlClass + " tabular"}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="fuelImpuesto" className={labelClass}>Impuesto específico (CLP)</label>
            <input
              id="fuelImpuesto"
              type="number"
              step="1"
              value={datos.impuesto}
              onChange={(event) => cambiar("impuesto", event.target.value)}
              className={controlClass + " tabular"}
            />
            <p className="mt-1 text-xs text-muted-foreground">Puede ser negativo cuando el MEPCO subsidia el diésel.</p>
          </div>

          <div className={fieldClass + " sm:col-span-2"}>
            <label htmlFor="fuelGlosa" className={labelClass}>
              Glosa del impuesto {negativo ? "(obligatoria si es negativo)" : "(opcional)"}
            </label>
            <input
              id="fuelGlosa"
              value={datos.glosa}
              onChange={(event) => cambiar("glosa", event.target.value)}
              placeholder="Ej.: Impuesto específico diésel negativo de 8.217"
              maxLength={300}
              className={controlClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={datos.recuperable}
              onChange={(event) => cambiar("recuperable", event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Crédito recuperable (Ley 19.764, transporte de carga)
            {!tipoRecuperable(datos.tipo) ? (
              <span className="text-xs">— aplica principalmente a diésel</span>
            ) : null}
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancelar</button>
          <button
            type="button"
            onClick={() => onSave(datos)}
            className={primaryButtonClass}
            disabled={!datos.tipo || !datos.litros || datos.impuesto === "" || (negativo && !datos.glosa.trim())}
          >
            Guardar detalle
          </button>
        </div>
      </div>
    </div>
  );
}
