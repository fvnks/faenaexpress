"use client";

// Manda la cola offline de avance al servidor. La acción conserva su corte de
// alcance: si la obra activa no coincide con la de la medición, la deja pendiente.

import { registrarCubicacion } from "@/app/actions/obra-avance";
import { subirFotoCubicacion } from "@/app/actions/obra-terreno";
import {
  listOfflineCubicaciones,
  markCubicacionSynced,
} from "@/lib/offline-cubicaciones";
import type { ObraActionState } from "@/app/actions/obra-avance";

export type ResultadoSyncAvance = { exitosas: number; fallidas: number };

export async function sincronizarCubicacionesPendientes(): Promise<ResultadoSyncAvance> {
  const pendientes = (await listOfflineCubicaciones()).filter((record) => !record.synced);
  let exitosas = 0;
  let fallidas = 0;

  for (const record of pendientes) {
    const datos = new FormData();
    datos.append("obraId", record.obraId);
    datos.append("partidaId", record.partidaId);
    datos.append("cantidad", String(record.cantidad));
    datos.append("fecha", record.fecha);
    if (record.cuadrillaId) datos.append("cuadrillaId", record.cuadrillaId);

    try {
      const resultado: ObraActionState = await registrarCubicacion(undefined, datos);
      if (!resultado?.ok) {
        await markCubicacionSynced(record.id, false, resultado?.error ?? "No se pudo registrar");
        fallidas += 1;
        continue;
      }

      if (record.photo && resultado.cubicacionId) {
        const foto = new FormData();
        foto.append("cubicacionId", resultado.cubicacionId);
        foto.append("file", record.photo, record.photoName ?? "foto.jpg");
        const subida = await subirFotoCubicacion(undefined, foto);
        if (!subida?.ok) {
          await markCubicacionSynced(record.id, false, subida?.error ?? "No se pudo subir la foto");
          fallidas += 1;
          continue;
        }
      }

      await markCubicacionSynced(record.id, true);
      exitosas += 1;
    } catch {
      await markCubicacionSynced(record.id, false, "Sin conexión").catch(() => {});
      fallidas += 1;
    }
  }

  return { exitosas, fallidas };
}
