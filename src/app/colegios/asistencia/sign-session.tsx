"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  anularFirmaAction,
  firmarSesionAction,
  type FirmaFormState,
} from "@/app/actions/school-sign";
import { SubmitButton } from "@/components/submit-button";

type Firma = {
  firmadoPor: string;
  runFirmante: string;
  verificadoEn: string;
};

/**
 * La firma de una clase con el verificador de identidad del MINEDUC.
 *
 * Es la pantalla del docente al terminar su clase: marca la asistencia, guarda
 * y firma. Un código cubre la sesión entera porque caduca a los 30 segundos.
 */
export function SessionSignature({
  sessionId,
  rut,
  firma,
  puedeFirmar,
  puedeAnular,
}: {
  sessionId: string;
  rut: string;
  firma: Firma | null;
  puedeFirmar: boolean;
  puedeAnular: boolean;
}) {
  const [estado, firmar, pendienteFirma] = useActionState<FirmaFormState, FormData>(
    firmarSesionAction,
    undefined,
  );
  const [estadoAnular, anular, pendienteAnular] = useActionState<FirmaFormState, FormData>(
    anularFirmaAction,
    undefined,
  );

  const codigoRef = useRef<HTMLInputElement>(null);
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    if (estado?.ok) {
      toast.success(`Clase firmada por ${estado.firmadoPor}`);
      setCodigo("");
    }
    if (estado?.error) toast.error(estado.error);
  }, [estado]);

  useEffect(() => {
    if (estadoAnular?.ok) toast.success("Firma anulada: la clase volvió a quedar pendiente.");
    if (estadoAnular?.error) toast.error(estadoAnular.error);
  }, [estadoAnular]);

  if (firma) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            Firmada por {firma.firmadoPor}
            <span className="tabular ml-2 font-normal text-muted-foreground">({firma.runFirmante})</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Verificada por el MINEDUC el{" "}
            {new Date(firma.verificadoEn).toLocaleString("es-CL", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Cubre los registros de esta clase.
          </p>
        </div>

        {puedeAnular ? (
          <form action={anular}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <SubmitButton
              className="rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              pendingLabel="Anulando..."
            >
              Anular firma
            </SubmitButton>
          </form>
        ) : null}
      </div>
    );
  }

  if (!puedeFirmar) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta clase todavía no está firmada. La firma quien la registró, o la dirección o la UTP
        si quedó pendiente.
      </p>
    );
  }

  return (
    <form action={firmar} className="flex flex-col gap-3">
      <input type="hidden" name="sessionId" value={sessionId} />

      <p className="text-sm text-muted-foreground">
        El código sale del verificador de identidad de{" "}
        <span className="font-medium text-foreground">tramites.mineduc.cl</span> y caduca a los 30
        segundos: pídelo recién antes de firmar.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rut-firma" className="text-xs text-muted-foreground">
            RUN de quien firma
          </label>
          <input
            id="rut-firma"
            name="rut"
            type="text"
            defaultValue={rut}
            readOnly={Boolean(rut)}
            placeholder="12.345.678-9"
            className="tabular w-44 rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground read-only:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="codigo-firma" className="text-xs text-muted-foreground">
            Código de 6 dígitos
          </label>
          <input
            id="codigo-firma"
            ref={codigoRef}
            name="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="tabular w-32 rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm tracking-[0.3em] text-foreground"
          />
        </div>

        <SubmitButton
          className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
          pendingLabel="Verificando con el MINEDUC..."
          disabled={codigo.length !== 6 || pendienteFirma}
        >
          Firmar clase
        </SubmitButton>
      </div>

      {estado?.error ? <p className="text-sm text-danger">{estado.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pendienteFirma ? "Verificando el código con el MINEDUC" : ""}
      </span>
    </form>
  );
}
