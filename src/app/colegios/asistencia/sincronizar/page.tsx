"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  listOfflineAttendance,
  markOfflineAttendanceSynced,
  deleteOfflineAttendance,
} from "@/lib/offline-attendance";
import { saveAttendance } from "@/app/actions/schools";
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

    const pending = records.filter((r) => !r.synced);
    let success = 0;
    let failed = 0;

    for (const record of pending) {
      try {
        const formData = new FormData();
        formData.append("sessionId", record.sessionId);
        record.alumnos.forEach((a) => {
          formData.append("studentId", a.studentId);
          formData.append("estado", a.estado);
          formData.append("justificacion", a.justificacion);
        });
        // Llamamos a saveAttendance directamente
        const result = await saveAttendance(undefined, formData);
        if (result?.ok) {
          await markOfflineAttendanceSynced(record.id, true);
          success += 1;
        } else {
          await markOfflineAttendanceSynced(record.id, false, result?.error ?? "Error desconocido");
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    await loadRecords();
    setSyncing(false);
    setSyncMessage(
      failed > 0
        ? `Sincronizadas ${success} de ${pending.length} asistencias. ${failed} fallaron.`
        : `Todas las ${success} asistencia{success !== 1 ? "s" : ""} se sincronizaron.`,
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
        Las asistencias guardadas sin conexión se sincronizan automáticamente al recuperar internet.
        También puedes sincronizarlas manualmente desde aquí.
      </p>

      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-control text-xs font-medium border ${
          navigator.onLine ? "border-border bg-surface text-muted-foreground" : "border-warning bg-warning-soft text-warning"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${
          navigator.onLine ? "bg-success" : "bg-warning"
        }`} />
        {navigator.onLine ? "Conectado" : "Sin conexión"}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={syncAll}
          disabled={syncing || pendientes.length === 0 || !navigator.onLine}
          className={primaryButtonClass + " px-4 py-2 text-sm"}
        >
          {syncing ? "Sincronizando..." : `Sincronizar ${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""}`}
        </button>
        {sincronizadas.length > 0 && (
          <button
            onClick={() => {
              clearSynced().then(() => {
                loadRecords();
                setSyncMessage(`Se eliminaron ${sincronizadas.length} registro${sincronizadas.length !== 1 ? "s" : ""} ya sincronizados.`);
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
            No hay asistencias pendientes de sincronizar.
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

  async function clearSynced(): Promise<number> {
    const synced = records.filter((r) => r.synced);
    for (const record of synced) {
      await deleteOfflineAttendance(record.id);
    }
    return synced.length;
  }
}
