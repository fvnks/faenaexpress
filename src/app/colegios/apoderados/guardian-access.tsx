"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { issueGuardianCode, type PortalFormState } from "@/app/actions/portal";
import { FormattedDate } from "@/components/formatted-date";
import { SubmitButton } from "@/components/submit-button";
import { listGuardianPortalAccess } from "@/lib/access-log-guardian";

/**
 * Acceso de una familia al portal.
 *
 * El código se ve siempre que existe: la secretaría lo anota, lo dicta por
 * teléfono o se lo lleva a la reunión de apoderados. Guardarlo solo el
 * instante en que se genera obligaba a rotarlo para volver a leerlo, y rotar
 * corta el acceso de la familia, así que en la práctica el código quedaba
 * ilegible para el colegio.
 */
export function GuardianAccess({
  guardianId,
  nombre,
  codigo,
  emitido,
  ultimoAcceso,
  puedeEditar,
}: {
  guardianId: string;
  nombre: string;
  /** El código vigente, si lo hay. */
  codigo: string | null;
  emitido: Date | null;
  ultimoAcceso: Date | null;
  puedeEditar: boolean;
}) {
  const [state, action] = useActionState<PortalFormState, FormData>(
    issueGuardianCode,
    undefined,
  );
  const [copiado, setCopiado] = useState(false);
  const [historial, setHistorial] = useState<{
    id: string;
    createdAt: Date;
    ip: string | null;
    userAgent: string | null;
  }[] | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // El código recién emitido se muestra al instante, sin esperar el refresco.
  const vigente = state?.codigo ?? codigo;

  useEffect(() => {
    if (state?.ok) toast.success(`Código emitido para ${nombre}`);
  }, [state, nombre]);

  const copiar = async () => {
    if (!vigente) return;
    try {
      await navigator.clipboard.writeText(vigente);
      setCopiado(true);
      toast.success("Código copiado");
    } catch {
      toast.error("No se pudo copiar. Anótalo a mano.");
    }
  };

  const cargarHistorial = async () => {
    if (historial !== null) return;
    const datos = await listGuardianPortalAccess(codigo ?? null, nombre);
    setHistorial(datos);
  };

  const fechaFormateada = (fecha: Date) => {
    return new Date(fecha).toISOString();
  };

  return (
    <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:min-w-[19rem]">
      {vigente ? (
        <div className="flex w-full flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <code className="tabular rounded-control border border-primary bg-primary-soft px-3 py-1.5 font-mono text-base font-semibold tracking-[0.2em] text-primary">
              {vigente}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="rounded-control border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Emitido{" "}
            {emitido ? (
              <FormattedDate iso={emitido.toISOString()} />
            ) : (
              "sin fecha"
            )}
            {ultimoAcceso ? (
              <>
                · entró por última vez{" "}
                <FormattedDate iso={ultimoAcceso.toISOString()} />
              </>
            ) : (
              " · nunca ha entrado"
            )}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sin código emitido. Esta familia todavía no puede entrar al portal.
        </p>
      )}

      {puedeEditar ? (
        <>
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="guardianId" value={guardianId} />
            <SubmitButton
              className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-xs font-semibold text-primary"
              pendingLabel="Generando..."
            >
              {vigente ? "Rotar código" : "Dar acceso al portal"}
            </SubmitButton>
            {vigente ? (
              <span className="text-xs text-muted-foreground">
                Corta el acceso del código anterior
              </span>
            ) : null}
          </form>

          {/* Historial de accesos al portal */}
          <details
            open={historialAbierto}
            onToggle={() => {
              setHistorialAbierto(!historialAbierto);
              if (!historialAbierto) cargarHistorial();
            }}
            className="mt-2 flex w-full flex-col items-end gap-1"
          >
            <summary className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
              {historialAbierto ? "Ocultar" : "Ver historial de accesos"}
              {historial ? ` (${historial.length})` : ""}
            </summary>
            <div className="mt-1 w-full">
              {historial === null ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Cargando…
                </p>
              ) : historial.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sin accesos registrados al portal.
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-2 py-1 font-medium">Fecha y hora</th>
                      <th className="px-2 py-1 font-medium text-right">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historial.map((a) => (
                      <tr key={a.id} className="hover:bg-background">
                        <td className="px-2 py-1">
                          <FormattedDate iso={fechaFormateada(a.createdAt)} />
                        </td>
                        <td className="px-2 py-1 text-right text-muted-foreground">
                          {a.ip ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>
        </>
      ) : null}

      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}
