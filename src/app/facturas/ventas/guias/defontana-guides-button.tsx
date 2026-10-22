"use client";

import { useActionState } from "react";

import { fetchDefontanaGuidesAction } from "@/app/actions/defontana";
import { secondaryButtonClass } from "@/lib/ui";

/**
 * Trae las guías de despacho del mes mostrado desde Defontana.
 *
 * El SII no sirve para esto: sus guías no están en el Registro de Compras y
 * Ventas sino en un libro aparte que no se puede leer. Como la empresa emite sus
 * DTE en Defontana, ahí están sus guías.
 *
 * El período es el mes filtrado en la lista; sin filtro, el corriente. Se manda
 * como `desde`/`hasta` (el día primero al último del mes) porque el ERP se
 * consulta por rango de fechas.
 */
export function DefontanaGuidesButton({ mes, className }: { mes?: string; className?: string }) {
  const [state, formAction, pending] = useActionState(fetchDefontanaGuidesAction, undefined);

  const hoy = new Date();
  const [anio, mesNum] = mes ? mes.split("-").map(Number) : [hoy.getFullYear(), hoy.getMonth() + 1];
  const mm = String(mesNum).padStart(2, "0");
  const desde = `${anio}-${mm}-01`;
  const hasta = `${anio}-${mm}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, "0")}`;
  const etiquetaMes = new Date(anio, mesNum - 1, 1).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="desde" value={desde} />
      <input type="hidden" name="hasta" value={hasta} />
      <button type="submit" disabled={pending} className={className ?? secondaryButtonClass}>
        {pending ? "Consultando Defontana…" : `Traer guías de Defontana (${etiquetaMes})`}
      </button>
      {state?.error ? (
        <p role="alert" className="max-w-md text-right text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" className="max-w-md text-right text-xs text-muted-foreground">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
