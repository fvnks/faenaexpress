"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useOnline } from "@/components/connection-status";
import { countPendingCubicaciones } from "@/lib/offline-cubicaciones";
import { sincronizarCubicacionesPendientes } from "@/lib/offline-cubicaciones-sync";
import { secondaryButtonClass } from "@/lib/ui";

/** Sincroniza la cola offline al montar y cada vez que vuelve la conexión. */
export function SincronizadorAvance() {
  const router = useRouter();
  const isOnline = useOnline();
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    countPendingCubicaciones().then(setPendientes).catch(() => setPendientes(0));
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    let cancelado = false;
    (async () => {
      setSincronizando(true);
      try {
        const resultado = await sincronizarCubicacionesPendientes();
        if (cancelado) return;
        if (resultado.exitosas > 0) {
          toast.success(`${resultado.exitosas} medición(es) sincronizada(s).`);
          router.refresh();
        }
        if (resultado.fallidas > 0) {
          toast.error(`${resultado.fallidas} medición(es) no pudieron sincronizarse.`);
        }
        setPendientes(await countPendingCubicaciones());
      } catch {
        if (!cancelado) setPendientes(0);
      } finally {
        if (!cancelado) setSincronizando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [isOnline, router]);

  if (pendientes === 0 && isOnline) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-xs">
      <span className={isOnline ? "text-accent" : "text-danger"}>
        {isOnline ? `${pendientes} pendiente(s) de sincronizar` : "Sin conexión · guardando en el dispositivo"}
      </span>
      {isOnline && pendientes > 0 ? (
        <button
          type="button"
          disabled={sincronizando}
          onClick={async () => {
            setSincronizando(true);
            const resultado = await sincronizarCubicacionesPendientes();
            toast.success(`${resultado.exitosas} sincronizada(s)`);
            if (resultado.fallidas) toast.error(`${resultado.fallidas} con error`);
            setPendientes(await countPendingCubicaciones());
            setSincronizando(false);
            router.refresh();
          }}
          className={secondaryButtonClass + " px-3 py-1 text-xs"}
        >
          {sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      ) : null}
    </div>
  );
}
