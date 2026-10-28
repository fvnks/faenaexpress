/**
 * Hook para detectar el estado de conexión y gestionar ventas pendientes offline.
 *
 * - Expone `isOnline` (booleano) y `pendingCount` (número de ventas sin sincronizar).
 * - Expone `syncOfflineSales()` para forzar la sincronización manual.
 * - Al montar, si hay conexión, intenta sincronizar automáticamente.
 * - Escucha eventos online/offline del navegador.
 */

"use client";

import { useEffect, useState, useCallback } from "react";

import {
  listOfflineSales,
  markOfflineSaleSynced,
  countPendingOfflineSales,
  deleteOfflineSale,
} from "@/lib/offline-sales";
import { createPosSale } from "@/app/actions/pos";

export type OfflineSale = {
  id: string;
  payload: {
    partnerId?: string | null;
    items: Array<{ productId: string; quantity: number; discount: number }>;
    payments: Array<{ method: string; amount: number; reference?: string | null }>;
    notes?: string | null;
  };
  createdAt: number;
  synced: boolean;
  syncError: string | null;
};

export function useOfflineSales() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await countPendingOfflineSales();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Detectar cambios de conexión
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      void syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sincronizar al montar si hay conexión
  useEffect(() => {
    if (isOnline) {
      void syncOfflineSales();
    } else {
      void refreshCount();
    }
  }, [isOnline]);

  /**
   * Intenta sincronizar todas las ventas pendientes con el servidor.
   * Las que fallan se marcan con el error para reintento posterior.
   */
  async function syncOfflineSales(): Promise<void> {
    if (!isOnline) return;
    setSyncing(true);
    setSyncError(null);

    try {
      const sales = await listOfflineSales();
      const pending = sales.filter((s) => !s.synced);

      for (const sale of pending) {
        try {
          const result = await createPosSale(undefined, saleToFormData(sale.payload));
          if (result?.ok) {
            await markOfflineSaleSynced(sale.id, true);
          } else {
            await markOfflineSaleSynced(sale.id, false, result?.error ?? "Error desconocido");
          }
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          await markOfflineSaleSynced(sale.id, false, message);
        }
      }

      await refreshCount();
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSyncing(false);
    }
  }

  return { isOnline, pendingCount, syncing, syncError, syncOfflineSales, refreshCount };
}

/**
 * Convierte el payload guardado en un FormData compatible con createPosSale.
 */
function saleToFormData(payload: {
  partnerId?: string | null;
  items: Array<{ productId: string; quantity: number; discount: number }>;
  payments: Array<{ method: string; amount: number; reference?: string | null }>;
  notes?: string | null;
}): FormData {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  return formData;
}
