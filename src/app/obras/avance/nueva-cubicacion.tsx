"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registrarCubicacion } from "@/app/actions/obra-avance";
import { useOnline } from "@/components/connection-status";
import { SubmitButton } from "@/components/submit-button";
import { saveOfflineCubicacion } from "@/lib/offline-cubicaciones";
import { controlClass, primaryButtonClass } from "@/lib/ui";

type Partida = {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  pendiente: number;
};

export function NuevaCubicacion({
  partidas,
  cuadrillas,
  obraId,
}: {
  partidas: Partida[];
  cuadrillas: Array<{ id: string; nombre: string }>;
  obraId: string;
}) {
  const router = useRouter();
  const isOnline = useOnline();
  const [state, action] = useActionState(registrarCubicacion, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Avance registrado.");
      formRef.current?.reset();
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Con conexión sigue la Server Action; sin conexión se encola en IndexedDB.
    if (isOnline) return;
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const foto = datos.get("foto");
    try {
      await saveOfflineCubicacion({
        obraId,
        partidaId: String(datos.get("partidaId") ?? ""),
        cuadrillaId: String(datos.get("cuadrillaId") ?? "") || null,
        cantidad: Number(String(datos.get("cantidad") ?? "").replace(",", ".")),
        fecha: String(datos.get("fecha") ?? "") || new Date().toISOString().slice(0, 10),
        photo: foto instanceof File && foto.size > 0 ? foto : null,
      });
      toast.success("Guardado en el dispositivo. Se enviará al volver la conexión.");
      setOffline(true);
      event.currentTarget.reset();
    } catch {
      toast.error("No se pudo guardar en el dispositivo.");
    }
  };

  return (
    <details className="rounded-[8px] border border-border bg-surface p-5">
      <summary className="cursor-pointer font-semibold">Registrar avance de una partida</summary>
      <form ref={formRef} action={action} onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="obraId" value={obraId} />
        <select name="partidaId" required className={controlClass}>
          <option value="">Seleccionar partida…</option>
          {partidas.map((partida) => (
            <option key={partida.id} value={partida.id}>
              {partida.codigo} · {partida.descripcion} (quedan {partida.pendiente.toFixed(2)} {partida.unidad})
            </option>
          ))}
        </select>
        <input name="cantidad" placeholder="Cantidad cubicada" type="number" step="0.01" min="0.01" required className={controlClass} />
        <input name="fecha" type="date" className={controlClass} />
        {cuadrillas.length > 0 ? (
          <select name="cuadrillaId" className={controlClass} defaultValue="">
            <option value="">Sin cuadrilla</option>
            {cuadrillas.map((cuadrilla) => (
              <option key={cuadrilla.id} value={cuadrilla.id}>{cuadrilla.nombre}</option>
            ))}
          </select>
        ) : null}
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">Foto de evidencia (opcional, cámara)</span>
          <input name="foto" type="file" accept="image/*" capture="environment" className={controlClass} />
        </label>
        <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>
          {isOnline ? "Guardar avance" : "Guardar en el dispositivo"}
        </SubmitButton>
      </form>
      {offline ? (
        <p className="mt-3 text-xs text-accent">La medición quedó guardada localmente.</p>
      ) : null}
    </details>
  );
}
