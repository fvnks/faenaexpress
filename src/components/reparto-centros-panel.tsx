"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { guardarRepartoCentroCosto } from "@/app/actions/reparto-centros";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type Centro = { id: string; codigo: string; nombre: string; active: boolean };
type Reparto = { centroCostoId: string; monto: number };
type Fila = { centroCostoId: string; monto: string };

const fmt = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("es-CL")}`;

/** Panel de reparto entre centros de costo en el detalle de una factura. */
export function RepartoCentrosPanel({
  kind,
  documentId,
  total,
  centros,
  repartos,
  writable,
}: {
  kind: "purchase" | "sale";
  documentId: string;
  total: number;
  centros: Centro[];
  repartos: Reparto[];
  writable: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(guardarRepartoCentroCosto, undefined);
  const [filas, setFilas] = useState<Fila[]>(
    repartos.map((r) => ({ centroCostoId: r.centroCostoId, monto: String(r.monto) })),
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Reparto guardado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  const suma = filas.reduce((acc, f) => acc + (Number(f.monto.replace(",", ".")) || 0), 0);
  const diferencia = total - suma;
  const cuadra = filas.length === 0 || diferencia === 0;

  const cambiar = (index: number, campo: keyof Fila, valor: string) => {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  };
  const agregar = () => {
    const usados = new Set(filas.map((f) => f.centroCostoId));
    const libre = centros.find((c) => c.active && !usados.has(c.id));
    if (!libre) return;
    setFilas((prev) => [...prev, { centroCostoId: libre.id, monto: String(diferencia) }]);
  };

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Centros de costo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Distribuye el total de esta factura entre uno o más centros. La suma debe cuadrar exactamente.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total a repartir</p>
          <p className="tabular text-lg font-bold">{fmt(total)}</p>
        </div>
      </div>

      {filas.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Centro</th>
                <th className="py-2 text-right">Monto (CLP)</th>
                {writable ? <th className="py-2 text-right">Acción</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((fila, index) => (
                <tr key={index}>
                  <td className="py-2 pr-3">
                    {writable ? (
                      <select
                        value={fila.centroCostoId}
                        onChange={(e) => cambiar(index, "centroCostoId", e.target.value)}
                        className={controlClass}
                      >
                        {centros
                          .filter((c) => c.active || c.id === fila.centroCostoId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.codigo} · {c.nombre}{c.active ? "" : " (inactivo)"}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span>
                        {centros.find((c) => c.id === fila.centroCostoId)?.nombre ?? "Centro eliminado"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {writable ? (
                      <input
                        value={fila.monto}
                        onChange={(e) => cambiar(index, "monto", e.target.value)}
                        inputMode="decimal"
                        className={controlClass + " w-40 text-right tabular"}
                      />
                    ) : (
                      <span className="tabular">{fmt(Number(fila.monto) || 0)}</span>
                    )}
                  </td>
                  {writable ? (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setFilas((prev) => prev.filter((_, i) => i !== index))}
                        className="text-xs text-danger hover:underline"
                      >
                        Quitar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {writable ? "Sin reparto: usa «Agregar centro» para asignar esta factura." : "Esta factura no tiene centros de costo asignados."}
        </p>
      )}

      {writable && centros.some((c) => c.active) ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={agregar} className={secondaryButtonClass}>+ Agregar centro</button>
          <span className={`text-xs tabular ${cuadra ? "text-success" : "text-danger"}`}>
            Repartido {fmt(suma)} · {cuadra ? "cuadra" : `falta ${fmt(diferencia)}`}
          </span>
        </div>
      ) : null}

      {writable ? (
        <form action={action} className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="repartos" value={JSON.stringify(filas.map((f) => ({ centroCostoId: f.centroCostoId, monto: f.monto })))} />
          <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass} disabled={!cuadra}>
            Guardar reparto
          </SubmitButton>
          {filas.length > 0 ? (
            <button type="button" onClick={() => setFilas([])} className="text-xs text-muted-foreground hover:text-danger hover:underline">
              Quitar todos
            </button>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
