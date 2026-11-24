"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  confirmObraPresupuesto,
  previewObraPresupuesto,
  type PresupuestoCommitState,
  type PresupuestoPreviewState,
} from "@/app/actions/obra-presupuesto";
import { SubmitButton } from "@/components/submit-button";
import { formatCLP } from "@/lib/money";
import { cardClass, controlClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { FilaPresupuesto, PreviewPresupuesto } from "@/lib/obra-import";

function esPreview(state: PresupuestoPreviewState): state is PreviewPresupuesto {
  return Boolean(state && "filas" in state);
}

export function ImportarPresupuesto() {
  const router = useRouter();
  const [previewState, previewAction] = useActionState<PresupuestoPreviewState, FormData>(previewObraPresupuesto, undefined);
  const [commitState, commitAction] = useActionState<PresupuestoCommitState, FormData>(confirmObraPresupuesto, undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (previewState && "error" in previewState && previewState.error) {
      toast.error(previewState.error);
    }
    if (commitState?.error) toast.error(commitState.error);
    if (commitState?.ok) {
      toast.success(`Presupuesto guardado: ${commitState.creadas} partidas.`);
      router.refresh();
    }
  }, [previewState, commitState, router]);

  const filas = esPreview(previewState) ? previewState.filas : [];
  const errores = esPreview(previewState) ? previewState.errores : [];

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className={secondaryButtonClass}>
        Importar desde Excel
      </button>

      {open ? (
        <div className={`${cardClass} mt-4 p-5`}>
          <h2 className="font-semibold">Importar presupuesto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube tu itemizado en <strong>.xlsx</strong> o <strong>.csv</strong> con columnas
            Descripción, Cantidad y Precio unitario (Código y Unidad son opcionales). Las filas sin
            cantidad ni precio se tratan como capítulos agrupadores.
          </p>
          <a
            href="/obras/presupuesto/plantilla"
            className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
          >
            Descargar plantilla de ejemplo
          </a>

          <form action={previewAction} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="obra-presupuesto-file" className="text-sm text-muted-foreground">
                Archivo
              </label>
              <input
                id="obra-presupuesto-file"
                name="file"
                type="file"
                accept=".xlsx,.csv,text/csv"
                required
                className={controlClass}
              />
            </div>
            <SubmitButton pendingLabel="Leyendo…" className={primaryButtonClass}>
              Vista previa
            </SubmitButton>
          </form>

          {esPreview(previewState) ? (
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-primary-soft px-3 py-1 font-medium text-primary">
                  {previewState.totalFilas} filas
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-muted-foreground">
                  Obligado: {formatCLP(previewState.totalObligado)}
                </span>
                {errores.length > 0 ? (
                  <span className="rounded-full bg-danger-soft px-3 py-1 text-danger">
                    {errores.length} filas con error
                  </span>
                ) : null}
              </div>

              {errores.length > 0 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-danger">Ver errores</summary>
                  <ul className="mt-2 space-y-1 text-sm text-danger">
                    {errores.map((e) => <li key={e.fila}>Fila {e.fila}: {e.message}</li>)}
                  </ul>
                </details>
              ) : null}

              <div className="mt-4 max-h-72 overflow-auto rounded-[8px] border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky-table-head text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Fila</th>
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-right">Cant.</th>
                      <th className="px-3 py-2 text-right">P. unit.</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filas.map((f) => (
                      <tr key={f.fila} className={f.error ? "bg-danger-soft/40" : undefined}>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{f.fila}</td>
                        <td className="px-3 py-2 font-mono text-xs">{f.codigo || "—"}</td>
                        <td className="px-3 py-2">
                          {f.descripcion}
                          {f.esCapitulo ? <span className="ml-2 text-[10px] uppercase text-subtle">capítulo</span> : null}
                          {f.error ? <span className="ml-2 text-xs text-danger">{f.error}</span> : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular">{f.esCapitulo ? "—" : f.cantidad}</td>
                        <td className="px-3 py-2 text-right tabular">{f.esCapitulo ? "—" : formatCLP(f.precioUnitario)}</td>
                        <td className="px-3 py-2 text-right tabular font-medium">
                          {f.esCapitulo ? "—" : formatCLP(f.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewState.ok ? (
                <form action={commitAction} className="mt-4 flex items-center gap-3">
                  <input type="hidden" name="payload" value={JSON.stringify(filas satisfies FilaPresupuesto[])} />
                  <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>
                    Guardar presupuesto ({filas.length} partidas)
                  </SubmitButton>
                  <p className="text-xs text-muted-foreground">
                    Las partidas vigentes actuales pasarán a «anuladas» por trazabilidad.
                  </p>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
