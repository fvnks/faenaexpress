"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  listOfflineSales,
  markOfflineSaleSynced,
  countPendingOfflineSales,
  deleteOfflineSale,
} from "@/lib/offline-sales";
import { createPosSale } from "@/app/actions/pos";
import { cardClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";

type OfflineSaleItem = {
  id: string;
  payload: {
    partnerId?: string | null;
    items: Array<{ productId: string; name?: string; quantity: number; discount: number }>;
    payments: Array<{ method: string; amount: number; reference?: string | null }>;
    notes?: string | null;
  };
  createdAt: number;
  synced: boolean;
  syncError: string | null;
};

export default function PosSyncPage() {
  const [sales, setSales] = useState<OfflineSaleItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const data = await listOfflineSales();
      setSales(data);
    } catch {
      setSales([]);
    }
  }

  async function syncAll() {
    if (!navigator.onLine) {
      setSyncMessage("No hay conexión a internet.");
      return;
    }
    setSyncing(true);
    setSyncMessage(null);

    const pending = sales.filter((s) => !s.synced);
    let success = 0;
    let failed = 0;

    for (const sale of pending) {
      try {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(sale.payload));
        const result = await createPosSale(undefined, formData);
        if (result?.ok) {
          await markOfflineSaleSynced(sale.id, true);
          success += 1;
        } else {
          await markOfflineSaleSynced(sale.id, false, result?.error ?? "Error desconocido");
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    await loadSales();
    setSyncing(false);
    setSyncMessage(
      failed > 0
        ? `Sincronizadas ${success} de ${pending.length} ventas. ${failed} fallaron.`
        : `Todas las ${success} ventas se sincronizaron correctamente.`,
    );
  }

  async function syncOne(id: string) {
    const sale = sales.find((s) => s.id === id);
    if (!sale) return;
    try {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(sale.payload));
      const result = await createPosSale(undefined, formData);
      if (result?.ok) {
        await markOfflineSaleSynced(id, true);
      } else {
        await markOfflineSaleSynced(id, false, result?.error ?? "Error desconocido");
      }
      await loadSales();
    } catch (cause) {
      await markOfflineSaleSynced(id, false, cause instanceof Error ? cause.message : String(cause));
      await loadSales();
    }
  }

  async function removeSale(id: string) {
    if (!confirm("¿Eliminar esta venta pendiente? Se perderán los datos.")) return;
    await deleteOfflineSale(id);
    await loadSales();
  }

  const pending = sales.filter((s) => !s.synced);
  const synced = sales.filter((s) => s.synced);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sincronización POS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventas registradas sin conexión que esperan ser enviadas al servidor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              navigator.onLine ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            }`}
          >
            {navigator.onLine ? "En línea" : "Sin conexión"}
          </span>
          {pending.length > 0 ? (
            <span
              className="px-2 py-1 rounded-full text-xs font-bold bg-accent-soft text-accent"
            >
              {pending.length} pendiente(s)
            </span>
          ) : null}
        </div>
      </div>

      {!navigator.onLine ? (
        <section className={cardClass + " p-6"}>
          <p className="text-sm text-danger">
            No hay conexión a internet. No se pueden sincronizar ventas hasta recuperar la conexión.
          </p>
        </section>
      ) : (
        <>
          {sales.length === 0 ? (
            <section className={cardClass + " p-8"}>
              <p className="text-center text-sm text-muted-foreground">
                No hay ventas pendientes de sincronizar.
              </p>
            </section>
          ) : (
            <>
              <section className={cardClass + " p-4"}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Ventas pendientes ({pending.length})</h2>
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={syncAll}
                    className={primaryButtonClass + " px-3 py-1.5 text-sm"}
                  >
                    {syncing ? "Sincronizando…" : "Sincronizar todo"}
                  </button>
                </div>
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-2">Ticket local</th>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2">Estado</th>
                      <th className="px-4 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pending.map((sale) => {
                      const total = sale.payload.payments.reduce(
                        (sum, p) => sum + p.amount,
                        0,
                      );
                      return (
                        <tr key={sale.id} className="tabular">
                          <td className="px-4 py-2 font-mono text-xs">
                            {sale.id.slice(0, 8)}…
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-2 text-right tabular">
                            {formatCLP(total)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent text-xs">
                              Pendiente
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => syncOne(sale.id)}
                                disabled={syncing}
                                className="text-accent hover:underline text-xs"
                              >
                                Sincronizar
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSale(sale.id)}
                                className="text-danger hover:underline text-xs"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {synced.length > 0 && (
                <section className={cardClass + " p-4 mt-4"}>
                  <h2 className="text-sm font-semibold mb-3">
                    Sincronizadas ({synced.length})
                  </h2>
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-2">Ticket local</th>
                        <th className="px-4 py-2">Fecha</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {synced.map((sale) => {
                        const total = sale.payload.payments.reduce(
                          (sum, p) => sum + p.amount,
                          0,
                        );
                        return (
                          <tr key={sale.id} className="tabular">
                            <td className="px-4 py-2 font-mono text-xs">
                              {sale.id.slice(0, 8)}…
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {new Date(sale.createdAt).toLocaleString("es-CL")}
                            </td>
                            <td className="px-4 py-2 text-right tabular">
                              {formatCLP(total)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => deleteOfflineSale(sale.id).then(() => loadSales())}
                                className="text-muted-foreground hover:text-danger underline text-xs"
                              >
                                Eliminar registro
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}

              {syncMessage && (
                <section className={cardClass + " p-4 mt-4"}>
                  <p className={`text-sm ${syncMessage.includes("fallaron") ? "text-danger" : "text-success"}`}>
                    {syncMessage}
                  </p>
                </section>
              )}
            </>
          )}
        </>
      )}

      <div>
        <Link href="/pos/venta" className={secondaryButtonClass}>
          Nueva venta
        </Link>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
