"use client";

import { useEffect, useState } from "react";

import { countPendingOfflineSales } from "@/lib/offline-sales";

export type ConnectionStatusProps = {
  className?: string;
};

export function ConnectionStatus({ className }: ConnectionStatusProps = {}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Contar ventas pendientes al montar
    (async () => {
      try {
        const count = await countPendingOfflineSales();
        setPendingCount(count);
      } catch {
        setPendingCount(0);
      }
    })();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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
