"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useOnline } from "@/components/connection-status";
import {
  clearSyncedOfflineAttendance,
  listOfflineAttendance,
} from "@/lib/offline-attendance";
import { sincronizarPendientes } from "@/lib/offline-attendance-sync";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type OfflineAttendanceItem = {
  id: string;
  sessionId: string;
  alumnos: Array<{ studentId: string; estado: string; justificacion: string }>;
  createdAt: number;
  synced: boolean;
  syncError: string | null;
};

export default function AsistenciaSyncPage() {
  const [records, setRecords] = useState<OfflineAttendanceItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // La conexión llega del hook compartido: el servidor siempre pinta
  // "conectado" y ahí no hay hydration rota ni estado desactualizado.
  const online = useOnline();

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const data = await listOfflineAttendance();
      setRecords(data);
    } catch {
      setRecords([]);
    }
  }

  async function syncAll() {
    if (!navigator.onLine) {
      setSyncMessage("No hay conexión a internet.");
      return;
    }
    setSyncing(true);
    setSyncMessage(null);

    const pendientes = records.filter((r) => !r.synced).length;
    const { exitosas, fallidas } = await sincronizarPendientes();

    await loadRecords();
    setSyncing(false);
    setSyncMessage(
      fallidas > 0
        ? fallidas === 1
          ? `Sincronizadas ${exitosas} de ${pendientes}. La pendiente falló; revisa su error en la lista.`
          : `Sincronizadas ${exitosas} de ${pendientes}. Fallaron ${fallidas}; revisa el error de cada una en la lista.`
        : pendientes === 0
          ? "No había asistencias pendientes."
          : `Sincronizadas ${pendientes} asistencia${pendientes !== 1 ? "s" : ""}.`,
    );
  }

  const pendientes = records.filter((r) => !r.synced);
  const sincronizadas = records.filter((r) => r.synced);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold tracking-tight">Sincronizar asistencia</h1>
        <Link
          href="/colegios/asistencia"
          className={secondaryButtonClass + " text-sm"}
        >
          ← Volver a asistencia
        </Link>
      </div>

      <p className="mt-0.5 text-sm text-muted-foreground">
        Las asistencias guardadas sin conexión también se sincronizan solas al
        recuperar internet. Aquí puedes verlas todas y forzar la sincronización.
      </p>

      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-control text-xs font-medium border ${
          online
            ? "border-border bg-surface text-muted-foreground"
            : "border-warning bg-warning-soft text-warning"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-success" : "bg-warning"}`} />
        {online ? "Conectado" : "Sin conexión"}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={syncAll}
          disabled={syncing || pendientes.length === 0 || !online}
          className={primaryButtonClass + " px-4 py-2 text-sm"}
        >
          {syncing ? "Sincronizando..." : `Sincronizar ${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""}`}
        </button>
        {sincronizadas.length > 0 && (
          <button
            onClick={() => {
              clearSyncedOfflineAttendance().then((n) => {
                loadRecords();
                setSyncMessage(
                  `Se eliminaron ${n} registro${n !== 1 ? "s" : ""} ya sincronizado${n !== 1 ? "s" : ""}.`,
                );
              });
            }}
            className={secondaryButtonClass + " px-4 py-2 text-sm"}
          >
            Limpiar sincronizadas
          </button>
        )}
      </div>

      {syncMessage ? (
        <p className="mt-2 text-sm text-muted-foreground">{syncMessage}</p>
      ) : null}

      {records.length === 0 ? (
        <div className={cardClass + " p-6 text-center"}>
          <p className="text-sm text-muted-foreground">
            No hay asistencias guardadas en este equipo.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {records.map((r) => {
            const estadoTexto = r.alumnos
              .map((a) => `${a.estado === "PRESENT" ? "P" : a.estado === "ABSENT" ? "A" : a.estado === "LATE" ? "T" : "J"}`)
              .join(" ");
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    Clase {r.sessionId.slice(-6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("es-CL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    · {r.alumnos.length} alumno{r.alumnos.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{estadoTexto}</p>
                  {r.syncError ? <p className="text-xs text-danger">{r.syncError}</p> : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.synced
                      ? "bg-success-soft text-success"
                      : r.syncError
                        ? "bg-danger-soft text-danger"
                        : "bg-accent-soft text-accent"
                  }`}
                >
                  {r.synced ? "Sincronizada" : r.syncError ? "Error" : "Pendiente"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
