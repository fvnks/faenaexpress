"use client";

import { useSyncExternalStore, useEffect, useState } from "react";

import { countPendingOfflineSales } from "@/lib/offline-sales";

/**
 * La conexión como estado externo del navegador.
 *
 * El servidor no sabe si hubo conexión, así que su snapshot siempre dice
 * "conectado": así el HTML coincide con el primer render del cliente y no hay
 * hydration rota (el texto falso «Sin conexión» de la vista móvil venía de
 * leer `navigator.onLine` en el estado inicial).
 */
export function useOnline(): boolean {
  function subscribe(callback: () => void) {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);
    };
  }
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export type ConnectionStatusProps = {
  className?: string;
};

export function ConnectionStatus({ className }: ConnectionStatusProps = {}) {
  const isOnline = useOnline();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Contar ventas pendientes al montar
    (async () => {
      try {
        const count = await countPendingOfflineSales();
        setPendingCount(count);
      } catch {
        setPendingCount(0);
      }
    })();
  }, []);

  return (
    <span
      className={
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border " +
        (isOnline
          ? "border-success/40 bg-success-soft text-success"
          : "border-danger/40 bg-danger-soft text-danger") +
        (className ? " " + className : "")
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-success" : "bg-danger"} animate-pulse`}
      />
      {isOnline ? "Online" : "Sin conexión"}
      {pendingCount > 0 ? (
        <span className="bg-danger text-danger-foreground px-1.5 py-0.5 rounded text-[10px]">
          {pendingCount}
        </span>
      ) : null}
    </span>
  );
}
