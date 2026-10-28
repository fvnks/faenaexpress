"use client";

import { useState } from "react";

import { reintentarDtesEnErrorAction } from "@/app/actions/pos-sii-emit";
import { secondaryButtonClass } from "@/lib/ui";

type DteEnError = {
  id: string;
  tipoDte: number;
  folio: number;
  estado: string;
  trackId: string | null;
  createdAt: Date;
};

export function DteErrorReenvio({ dtesEnError }: { dtesEnError: DteEnError[] }) {
  const [state, setState] = useState<{ error?: string; ok?: boolean; reintentados?: number; exitosos?: number } | undefined>(undefined);

  async function handleSubmit(formData: FormData) {
    setState(undefined);
    const result = await reintentarDtesEnErrorAction(undefined, formData);
    setState(result);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">DTEs con error ({dtesEnError.length})</h2>
      <p className="text-xs text-muted-foreground">
        Reintenta el envío de todos los DTE que quedaron en error o rechazados.
      </p>

      <div className="overflow-x-auto mt-2">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2 text-right">Folio</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dtesEnError.map((dte) => (
              <tr key={dte.id} className="tabular">
                <td className="px-4 py-2 font-medium">
                  {dte.tipoDte === 39
                    ? "Boleta (39)"
                    : dte.tipoDte === 33
                    ? "Factura (33)"
                    : `DTE ${dte.tipoDte}`}
                </td>
                <td className="px-4 py-2 text-right">
                  {String(dte.folio).padStart(6, "0")}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    dte.estado === "ERROR_ENVIO"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {dte.estado === "ERROR_ENVIO" ? "Error de envío" : "Rechazado"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {new Date(dte.createdAt).toLocaleDateString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={handleSubmit} className="mt-4 flex flex-col gap-2">
        <button
          type="submit"
          className={secondaryButtonClass + " text-xs px-3 py-1.5"}
        >
          {dtesEnError.length > 0 ? `Reenviar ${dtesEnError.length} DTE(s) al SII` : "Sin DTEs pendientes"}
        </button>
        {state?.error ? (
          <p role="alert" className="text-xs text-danger">{state.error}</p>
        ) : null}
        {state?.ok && state.reintentados && state.reintentados > 0 ? (
          <p className="text-xs text-success">
            {state.exitosos} de {state.reintentados} reenviado(s) con éxito.
          </p>
        ) : null}
      </form>
    </div>
  );
}
