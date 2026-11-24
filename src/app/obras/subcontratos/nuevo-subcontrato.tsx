"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearSubcontrato } from "@/app/actions/obra-subcontratos";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

type PartidaOption = { id: string; codigo: string; descripcion: string; precioUnitario: number; pendiente: number };

export function NuevoSubcontrato({ partners, partidas }: { partners: Array<{ id: string; name: string }>; partidas: PartidaOption[] }) {
  const router = useRouter();
  const [state, action] = useActionState(crearSubcontrato, undefined);
  const [asignadas, setAsignadas] = useState<Array<{ partidaId: string; cantidad: number; precioUnitario: number }>>([]);
  const [partidaId, setPartidaId] = useState("");
  const [cantidad, setCantidad] = useState("");

  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Subcontrato creado."); setAsignadas([]); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  const agregar = () => {
    const p = partidas.find((x) => x.id === partidaId);
    const q = Number(cantidad.replace(",", "."));
    if (!p || !Number.isFinite(q) || q <= 0) return;
    setAsignadas((prev) => [...prev, { partidaId: p.id, cantidad: q, precioUnitario: p.precioUnitario }]);
    setPartidaId("");
    setCantidad("");
  };

  const total = asignadas.reduce((s, a) => s + Math.round(a.cantidad * a.precioUnitario * 100) / 100, 0);

  return (
    <details className="rounded-[8px] border border-border bg-surface p-5">
      <summary className="cursor-pointer font-semibold">Nuevo subcontrato</summary>
      <form action={action} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="partidas" value={JSON.stringify(asignadas)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground" htmlFor="sc-partner">Proveedor</label>
            <select id="sc-partner" name="partnerId" required className={controlClass}>
              <option value="">Seleccionar…</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground" htmlFor="sc-desc">Descripción</label>
            <input id="sc-desc" name="descripcion" placeholder="Ej. Instalación eléctrica" className={controlClass} />
          </div>
          <input name="anticipo" placeholder="Anticipo ($)" type="number" step="1" min="0" className={controlClass} />
          <input name="retencionPct" placeholder="Retención %" type="number" step="0.01" min="0" max="100" defaultValue="0" className={controlClass} />
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="mb-2 text-sm font-medium">Partidas asignadas</p>
          <div className="flex flex-wrap gap-2">
            <select value={partidaId} onChange={(e) => setPartidaId(e.target.value)} className={controlClass + " max-w-xs"}>
              <option value="">Partida…</option>
              {partidas.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>)}
            </select>
            <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Cantidad" type="number" step="0.01" min="0" className={controlClass + " w-32"} />
            <button type="button" onClick={agregar} className="rounded-control border border-border px-3 py-2 text-sm hover:border-primary/60">Agregar</button>
          </div>
          {asignadas.length > 0 ? (
            <ul className="mt-3 divide-y divide-border text-sm">
              {asignadas.map((a, i) => {
                const p = partidas.find((x) => x.id === a.partidaId);
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <span>{p?.codigo} · {p?.descripcion} — {a.cantidad} × ${a.precioUnitario.toLocaleString("es-CL")}</span>
                    <button type="button" onClick={() => setAsignadas((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-danger hover:underline">Quitar</button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 text-xs text-muted-foreground">Agrega al menos una partida.</p>}
          <p className="mt-2 text-right text-sm font-semibold tabular">Total: ${total.toLocaleString("es-CL")}</p>
        </div>

        <SubmitButton pendingLabel="Guardando…" disabled={asignadas.length === 0} className={primaryButtonClass + " self-start"}>
          Crear subcontrato
        </SubmitButton>
      </form>
    </details>
  );
}
