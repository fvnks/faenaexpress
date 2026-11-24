// Lectura del presupuesto de una obra: partidas, APU, cubicaciones y costos.
// Todo filtrado por obraId: el aislamiento del módulo depende de esto.

import { db } from "@/lib/db";
import { calcularTotalesObra, costosPorPartida, type TotalesObra } from "@/lib/obra-budget";

export type PartidaVista = {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  orden: number;
  estado: string;
  esCapitulo: boolean;
  obligado: number;
  real: number;
  desviacion: number;
  desviacionPct: number | null;
  cubicado: number;
  avance: number;
};

export type ApuVista = { tipo: string; descripcion: string; cantidad: number; precioUnitario: number; total: number };

export async function cargarPresupuesto(obraId: string): Promise<{
  partidas: PartidaVista[];
  totales: TotalesObra;
  sinImputar: number;
  apuPorPartida: Map<string, ApuVista[]>;
}> {
  const [partidasRaw, costosRaw, cubicacionesRaw, apuRaw] = await Promise.all([
    db.partida.findMany({
      where: { obraId },
      orderBy: [{ orden: "asc" }, { codigo: "asc" }],
      select: {
        id: true, parentId: true, codigo: true, descripcion: true, unidad: true,
        cantidad: true, precioUnitario: true, total: true, orden: true, estado: true,
      },
    }),
    db.costoObra.findMany({
      where: { obraId },
      select: { partidaId: true, monto: true },
    }),
    db.cubicacion.findMany({
      where: { partida: { obraId } },
      select: { partidaId: true, cantidad: true, aprobada: true },
    }),
    db.apu.findMany({
      where: { partida: { obraId } },
      select: { partidaId: true, tipo: true, descripcion: true, cantidad: true, precioUnitario: true, total: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totales = calcularTotalesObra(partidasRaw, costosRaw, cubicacionesRaw);
  const { porPartida, sinImputar } = costosPorPartida(costosRaw);

  const cubicadoPorPartida = new Map<string, number>();
  for (const c of cubicacionesRaw.filter((x) => x.aprobada)) {
    cubicadoPorPartida.set(c.partidaId, (cubicadoPorPartida.get(c.partidaId) ?? 0) + c.cantidad);
  }

  const apuPorPartida = new Map<string, Array<{ tipo: string; descripcion: string; cantidad: number; precioUnitario: number; total: number }>>();
  for (const apu of apuRaw) {
    const list = apuPorPartida.get(apu.partidaId) ?? [];
    list.push({ tipo: String(apu.tipo), descripcion: apu.descripcion, cantidad: apu.cantidad, precioUnitario: apu.precioUnitario, total: apu.total });
    apuPorPartida.set(apu.partidaId, list);
  }

  const partidas: PartidaVista[] = partidasRaw.map((p) => {
    const obligado = p.total;
    const real = porPartida.get(p.id) ?? 0;
    const desviacion = real - obligado;
    const cubicado = cubicadoPorPartida.get(p.id) ?? 0;
    return {
      id: p.id,
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidad: p.unidad,
      cantidad: p.cantidad,
      precioUnitario: p.precioUnitario,
      total: p.total,
      orden: p.orden,
      estado: p.estado,
      esCapitulo: p.cantidad === 0 && p.precioUnitario === 0,
      obligado,
      real,
      desviacion,
      desviacionPct: obligado !== 0 ? Math.round((desviacion / obligado) * 10000) / 100 : null,
      cubicado,
      avance: p.cantidad > 0 ? cubicado / p.cantidad : 0,
    };
  });

  return { partidas, totales, sinImputar, apuPorPartida };
}
