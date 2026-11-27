"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  APU_TIPOS,
  aplicarApuAPrecio,
  crearApu,
  actualizarApu,
  eliminarApu,
} from "@/app/actions/obra-apu";
import { SubmitButton } from "@/components/submit-button";
import { formatCLP } from "@/lib/money";
import type { ApuVista } from "@/lib/obra-presupuesto";
import {
  controlClass,
  dangerButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

const LABELS: Record<string, string> = {
  MATERIAL: "Materiales",
  MANO_OBRA: "Mano de obra",
  MAQUINARIA: "Maquinaria",
  GGASTOS: "Gastos generales",
};

export function GestionApu({
  partidaId,
  partida,
  items,
  precioUnitario,
  writable,
}: {
  partidaId: string;
  partida: string;
  items: ApuVista[];
  precioUnitario: number;
  writable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createState, createAction] = useActionState(crearApu, undefined);
  const [updateState, updateAction] = useActionState(actualizarApu, undefined);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const suma = items.reduce((total, item) => total + item.total, 0);

  useEffect(() => {
    if (createState?.ok) toast.success(createState.message ?? "APU agregado.");
    if (createState?.error) toast.error(createState.error);
    if (updateState?.ok) toast.success(updateState.message ?? "APU actualizado.");
    if (updateState?.error) toast.error(updateState.error);
    if (createState?.ok || updateState?.ok) router.refresh();
  }, [createState, updateState, router]);

  useEffect(() => {
    if (!open) return;
    cerrarRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-primary hover:underline"
      >
        {items.length > 0 ? `APU (${items.length})` : "Agregar APU"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <button
            type="button"
            aria-label="Cerrar gestión de APU"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Análisis de precios unitarios de ${partida}`}
            className="card-elevated relative z-10 max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-card border border-border-strong p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Análisis de precios unitarios</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{partida}</p>
              </div>
              <button
                ref={cerrarRef}
                type="button"
                onClick={() => setOpen(false)}
                className={secondaryButtonClass + " px-3 py-1 text-xs"}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky-table-head text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Tipo</th>
                    <th className="px-2 py-2 text-left">Descripción</th>
                    <th className="px-2 py-2 text-right">Cant.</th>
                    <th className="px-2 py-2 text-right">P. unit.</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    {writable ? <th className="px-2 py-2 text-right">Acciones</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-2 text-xs">{LABELS[item.tipo] ?? item.tipo}</td>
                      <td className="px-2 py-2">{item.descripcion}</td>
                      <td className="px-2 py-2 text-right tabular">{item.cantidad}</td>
                      <td className="px-2 py-2 text-right tabular">{formatCLP(item.precioUnitario)}</td>
                      <td className="px-2 py-2 text-right tabular font-medium">{formatCLP(item.total)}</td>
                      {writable ? (
                        <td className="px-2 py-2 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <details>
                              <summary className="cursor-pointer text-xs text-primary hover:underline">Editar</summary>
                              <form action={updateAction} className="mt-2 grid gap-2 rounded-control border border-border bg-surface p-3 text-left sm:grid-cols-2">
                                <input type="hidden" name="id" value={item.id} />
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Tipo</span>
                                  <select name="tipo" defaultValue={item.tipo} className={controlClass}>
                                    {APU_TIPOS.map((tipo) => (
                                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                    ))}
                                  </select>
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Descripción</span>
                                  <input name="descripcion" required defaultValue={item.descripcion} className={controlClass} />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Cantidad</span>
                                  <input name="cantidad" required defaultValue={item.cantidad} className={controlClass + " tabular"} />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Precio unitario</span>
                                  <input name="precioUnitario" required defaultValue={item.precioUnitario} className={controlClass + " tabular"} />
                                </label>
                                <div className="sm:col-span-2">
                                  <SubmitButton pendingLabel="Guardando…" className={secondaryButtonClass + " px-3 py-1 text-xs"}>
                                    Guardar
                                  </SubmitButton>
                                </div>
                              </form>
                            </details>
                            <form action={eliminarApu} onSubmit={() => setTimeout(() => router.refresh(), 300)}>
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className={dangerButtonClass + " px-3 py-1 text-xs"}>Borrar</button>
                            </form>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr><td colSpan={writable ? 6 : 5} className="px-2 py-4 text-center text-muted-foreground">Sin líneas de APU.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-surface px-3 py-2 text-sm">
              <span className="text-muted-foreground">Suma del APU</span>
              <span className="tabular font-semibold">{formatCLP(suma)}</span>
              <span className="text-xs text-muted-foreground">
                Precio unitario actual: {formatCLP(precioUnitario)}
              </span>
            </div>

            {writable ? (
              <div className="mt-4 flex flex-col gap-4">
                <form action={createAction} className="grid gap-2 rounded-control border border-border p-3 sm:grid-cols-2">
                  <input type="hidden" name="partidaId" value={partidaId} />
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Tipo</span>
                    <select name="tipo" className={controlClass}>
                      {APU_TIPOS.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Descripción</span>
                    <input name="descripcion" required placeholder="Descripción" className={controlClass} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Cantidad</span>
                    <input name="cantidad" required className={controlClass + " tabular"} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Precio unitario</span>
                    <input name="precioUnitario" required className={controlClass + " tabular"} />
                  </label>
                  <div className="sm:col-span-2">
                    <SubmitButton pendingLabel="Agregando…" className={secondaryButtonClass + " px-3 py-1 text-xs"}>
                      Agregar línea
                    </SubmitButton>
                  </div>
                </form>
                {items.length > 0 ? (
                  <form action={aplicarApuAPrecio} onSubmit={() => setTimeout(() => router.refresh(), 300)}>
                    <input type="hidden" name="partidaId" value={partidaId} />
                    <button type="submit" className="text-xs text-primary hover:underline">
                      Aplicar la suma del APU como precio unitario de la partida →
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
