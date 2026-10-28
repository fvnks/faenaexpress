"use client";

import { useState } from "react";

import { reintentarDteAction } from "@/app/actions/pos-sii-emit";
import { SubmitButton } from "@/components/submit-button";
import { secondaryButtonClass } from "@/lib/ui";

const DTE_TIPO_LABEL: Record<number, string> = {
  33: "Factura Electrónica",
  39: "Boleta Electrónica",
  61: "Nota de Crédito Electrónica",
  56: "Nota de Débito Electrónica",
};

const DTE_ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  EMITIDO: "Emitido",
  ANULADO: "Anulado",
  RECHAZADO: "Rechazado",
  ERROR_ENVIO: "Error al enviar",
};

type DteInfoProps = {
  saleId: string;
  dtes: Array<{
    id: string;
    tipoDte: number;
    folio: number;
    estado: string;
    trackId: string | null;
    xmlRespuesta: string | null;
    emitidoAt: Date | null;
  }>;
};

export function DteInfo({ saleId, dtes }: DteInfoProps) {
  const dte = dtes[0];
  const [state, setState] = useState<{ error?: string; ok?: boolean } | undefined>(undefined);
  const [retrying, setRetrying] = useState(false);

  async function handleSubmit(formData: FormData) {
    setState(undefined);
    setRetrying(true);
    const result = await reintentarDteAction(undefined, formData);
    setState(result);
    setRetrying(false);
    if (result?.ok) {
      // Trigger a refresh by toggling a state - parent will handle revalidation
    }
  }

  if (!dte) {
    return (
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Documento interno de control. Sin DTE asociado (SII no habilitado).
      </p>
    );
  }

  const tipoLabel = DTE_TIPO_LABEL[dte.tipoDte] ?? `DTE ${dte.tipoDte}`;
  const estadoLabel = DTE_ESTADO_LABEL[dte.estado] ?? dte.estado;

  if (dte.estado === "EMITIDO") {
    return (
      <div className="mt-4 border-t border-border pt-3 text-xs">
        <p className="text-muted-foreground">Documento tributario electrónico</p>
        <p className="mt-1 text-sm font-medium">
          {tipoLabel} N° {String(dte.folio).padStart(6, "0")}
        </p>
        {dte.trackId ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            TrackID: {dte.trackId}
          </p>
        ) : null}
        <p className="mt-0.5 text-xs text-success">
          Estado: {estadoLabel} ✓
        </p>
      </div>
    );
  }

  // Estado no emitido: mostrar error y botón de reintento.
  return (
    <div className="mt-4 border-t border-border pt-3 text-xs">
      <p className="text-muted-foreground">Documento tributario electrónico</p>
      <p className="mt-1 text-sm font-medium">
        {tipoLabel} N° {String(dte.folio).padStart(6, "0")}
      </p>
      <p className="mt-0.5 text-xs text-danger">
        Estado: {estadoLabel}
      </p>
      {dte.xmlRespuesta ? (
        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">
          {dte.xmlRespuesta.slice(0, 200)}
        </p>
      ) : null}
      {dte.estado === "RECHAZADO" || dte.estado === "ERROR_ENVIO" ? (
        <form action={handleSubmit} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="saleId" value={saleId} />
          <SubmitButton
            disabled={retrying}
            pendingLabel="Reenviando…"
            className={secondaryButtonClass + " text-xs px-3 py-1"}
          >
            {retrying ? "Reenviando…" : "Reintentar envío al SII"}
          </SubmitButton>
          {state?.error ? (
            <p role="alert" className="text-xs text-danger">{state.error}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
