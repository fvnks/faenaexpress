"use client";

// El que manda la cola offline (IndexedDB) al servidor.
//
// Lo usan dos pantallas: «Sincronizar asistencia» a mano, y la vista móvil
// sola, al recuperar conexión — el auto-sync que promete la UI. La cola vive
// en `lib/offline-attendance.ts`; la acción que acepta en las filas es
// `saveAttendance` (con todo su corte de alcance del lado del servidor).

import { saveAttendance } from "@/app/actions/schools";
import {
  listOfflineAttendance,
  markOfflineAttendanceSynced,
} from "@/lib/offline-attendance";

export type ResultadoSync = { exitosas: number; fallidas: number };

export async function sincronizarPendientes(): Promise<ResultadoSync> {
  const pendientes = (await listOfflineAttendance()).filter((r) => !r.synced);
  let exitosas = 0;
  let fallidas = 0;

  for (const record of pendientes) {
    const formData = new FormData();
    formData.append("sessionId", record.sessionId);
    for (const a of record.alumnos) {
      formData.append("studentId", a.studentId);
      formData.append("estado", a.estado);
      formData.append("justificacion", a.justificacion);
    }
    try {
      const result = await saveAttendance(undefined, formData);
      if (result?.ok) {
        await markOfflineAttendanceSynced(record.id, true);
        exitosas += 1;
      } else {
        await markOfflineAttendanceSynced(record.id, false, result?.error ?? "Error desconocido");
        fallidas += 1;
      }
    } catch {
      await markOfflineAttendanceSynced(record.id, false, "Sin conexión").catch(() => {});
      fallidas += 1;
    }
  }

  return { exitosas, fallidas };
}
