"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import {
  listPosKdsOrdersAction,
  listPosKdsOrdersHistoryAction,
  countPosKdsPendingAction,
  countPosKdsPreparingAction,
  updateKdsOrderStatus,
  updateKdsItemStatus,
  type KdsOrderSummary,
} from "@/app/actions/pos-kds";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  READY: "Listo para servir",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-accent-soft text-accent",
  PREPARING: "bg-primary-soft text-primary",
  READY: "bg-success-soft text-success",
  SERVED: "bg-muted-soft text-muted-foreground",
  CANCELLED: "bg-danger-soft text-danger",
};

export default function PosKdsPage() {
  const [orders, setOrders] = useState<KdsOrderSummary[]>([]);
  const [history, setHistory] = useState<KdsOrderSummary[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [preparingCount, setPreparingCount] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const loadAll = useCallback(async () => {
    try {
      const [openOrders, historyOrders, pending, preparing] = await Promise.all([
        listPosKdsOrdersAction(),
        listPosKdsOrdersHistoryAction(50),
        countPosKdsPendingAction(),
        countPosKdsPreparingAction(),
      ]);
      setOrders(openOrders);
      setHistory(historyOrders);
      setPendingCount(pending);
      setPreparingCount(preparing);
    } catch {
      // Si falla, ignorar silenciosamente
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Polling cada 10 segundos para detectar nuevas órdenes
    const timer = setInterval(loadAll, 10000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const result = await updateKdsOrderStatus(orderId, status as any);
    if (result?.ok) {
      setRefresh((r) => r + 1);
    } else {
      alert(result?.error || "Error al actualizar");
    }
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    const result = await updateKdsItemStatus(itemId, status as any);
    if (result?.ok) {
      setRefresh((r) => r + 1);
    } else {
      alert(result?.error || "Error al actualizar");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cocina (KDS)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Órdenes de cocina en tiempo real
          </p>
        </div>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al resumen
        </Link>
      </div>

      <section className={cardClass + " p-6"}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-3 rounded-card border border-border bg-surface">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="mt-1 tabular text-2xl font-semibold text-accent">
              {pendingCount}
            </p>
          </div>
          <div className="p-3 rounded-card border border-border bg-surface">
            <p className="text-xs text-muted-foreground">En preparación</p>
            <p className="mt-1 tabular text-2xl font-semibold text-primary">
              {preparingCount}
            </p>
          </div>
          <div className="p-3 rounded-card border border-border bg-surface">
            <p className="text-xs text-muted-foreground">Total activas</p>
            <p className="mt-1 tabular text-2xl font-semibold text-foreground">
              {pendingCount + preparingCount}
            </p>
          </div>
        </div>
      </section>

      {/* Órdenes pendientes */}
      {orders.filter((o) => o.status === "PENDING").length > 0 && (
        <section className={cardClass + " p-6 mb-4 border border-accent/40 bg-accent-soft/10"}>
          <h2 className="text-sm font-semibold mb-3">
            Órdenes pendientes ({orders.filter((o) => o.status === "PENDING").length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {orders
              .filter((o) => o.status === "PENDING")
              .map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onItemStatusChange={updateItemStatus}
                />
              ))}
          </div>
        </section>
      )}

      {/* Órdenes en preparación */}
      {orders.filter((o) => o.status === "PREPARING").length > 0 && (
        <section className={cardClass + " p-6 mb-4 border border-primary/40 bg-primary-soft/10"}>
          <h2 className="text-sm font-semibold mb-3">
            En preparación ({orders.filter((o) => o.status === "PREPARING").length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {orders
              .filter((o) => o.status === "PREPARING")
              .map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onItemStatusChange={updateItemStatus}
                />
              ))}
          </div>
        </section>
      )}

      {/* Historial de hoy */}
      <section className={cardClass + " p-6"}>
        <h2 className="text-sm font-semibold mb-3">Completadas hoy</h2>
        {history.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay órdenes completadas hoy.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2">Orden</th>
                  <th className="px-4 py-2">Mesa</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2 text-right">Ítems</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((order) => (
                  <tr key={order.id} className="tabular">
                    <td className="px-4 py-2 font-mono text-xs">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2">{order.tableNumber ?? "—"}</td>
                    <td className="px-4 py-2">{order.customerName ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{order.items.length}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {order.completedAt ? new Date(order.completedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function OrderCard({
  order,
  onStatusChange,
  onItemStatusChange,
}: {
  order: KdsOrderSummary;
  onStatusChange: (id: string, status: string) => void;
  onItemStatusChange: (id: string, status: string) => void;
}) {
  const [itemStatus, setItemStatus] = useState<Record<string, string>>({});

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold">
              {order.orderNumber || order.id.slice(0, 8)}
            </span>
            {order.tableNumber && (
              <span className="text-xs text-muted-foreground">Mesa {order.tableNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-muted-foreground">
            {new Date(order.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {order.customerName && (
        <p className="text-sm text-muted-foreground mb-3">{order.customerName}</p>
      )}

      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{item.productName}</span>
                <span className="text-xs text-muted-foreground">×{item.quantity}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-muted-foreground italic">{item.notes}</p>
              )}
            </div>
            <div className="text-right">
              <select
                value={itemStatus[item.id] || item.status}
                onChange={(e) => {
                  setItemStatus((prev) => ({ ...prev, [item.id]: e.target.value }));
                  onItemStatusChange(item.id, e.target.value as any);
                }}
                className="rounded border border-border bg-white px-2 py-1 text-xs"
              >
                <option value="PENDING">Pendiente</option>
                <option value="PREPARING">En preparación</option>
                <option value="READY">Listo</option>
                <option value="CANCELLED">Cancelar</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="mt-2 text-xs text-muted-foreground">{order.notes}</p>
      )}
    </div>
  );
}
