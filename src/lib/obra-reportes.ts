// Fuente única de los reportes de obra: la pantalla y los CSV salen de acá,
// para que los números nunca se contradigan.

import { db } from "@/lib/db";
import {
  calcularTotalesObra,
  curvaS,
  type PuntoCurvaS,
  type TotalesObra,
} from "@/lib/obra-budget";

export type DesviacionObra = {
  id: string;
  codigo: string;
  descripcion: string;
  obligado: number;
  real: number;
  desviacion: number;
  desviacionPct: number | null;
};

export type ProductividadCuadrilla = {
  id: string;
  nombre: string;
  integrantes: number;
  mediciones: number;
  cantidad: number;
  valorizado: number;
  porIntegrante: number;
};

export type ReporteObra = {
  obra: { name: string; fechaInicio: Date | null; fechaTermino: Date | null };
  totales: TotalesObra;
  puntos: PuntoCurvaS[];
  totalFacturado: number;
  desviaciones: DesviacionObra[];
  cuadrillas: ProductividadCuadrilla[];
};

export async function cargarReporteObra(obraId: string): Promise<ReporteObra> {
  const [obra, partidas, costos, cubicaciones, estados, cuadrillasRaw] = await Promise.all([
    db.obra.findUniqueOrThrow({
      where: { id: obraId },
      select: { name: true, fechaInicio: true, fechaTermino: true },
    }),
    db.partida.findMany({
      where: { obraId },
      select: { id: true, codigo: true, descripcion: true, cantidad: true, precioUnitario: true, total: true, estado: true },
    }),
    db.costoObra.findMany({ where: { obraId }, select: { partidaId: true, monto: true } }),
    db.cubicacion.findMany({
      where: { partida: { obraId }, aprobada: true },
      select: {
        partidaId: true, cantidad: true, fecha: true, cuadrillaId: true,
        partida: { select: { precioUnitario: true } },
      },
    }),
    db.estadoPago.findMany({
      where: { obraId, estado: { in: ["APROBADO", "FACTURADO", "PAGADO"] } },
      select: { total: true },
    }),
    db.cuadrilla.findMany({
      where: { obraId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, integrantes: true },
    }),
  ]);

  const totales = calcularTotalesObra(partidas, costos, cubicaciones);

  const porMes = new Map<string, number>();
  for (const cubicacion of cubicaciones) {
    const mes = cubicacion.fecha.toISOString().slice(0, 7);
    const valor = Math.round(cubicacion.cantidad * cubicacion.partida.precioUnitario);
    porMes.set(mes, (porMes.get(mes) ?? 0) + valor);
  }
  const puntos = curvaS(
    totales.obligado,
    obra.fechaInicio,
    obra.fechaTermino,
    [...porMes.entries()].map(([mes, valor]) => ({ mes, valor })),
  );

  const totalFacturado = estados.reduce((sum, estado) => sum + estado.total, 0);

  const desviaciones = partidas
    .filter((partida) => partida.estado === "VIGENTE" && partida.total > 0)
    .map((partida) => {
      const real = costos
        .filter((costo) => costo.partidaId === partida.id)
        .reduce((sum, costo) => sum + costo.monto, 0);
      const desviacion = real - partida.total;
      return {
        id: partida.id,
        codigo: partida.codigo,
        descripcion: partida.descripcion,
        obligado: partida.total,
        real,
        desviacion,
        desviacionPct: partida.total !== 0
          ? Math.round((desviacion / partida.total) * 10000) / 100
          : null,
      };
    })
    .sort((a, b) => Math.abs(b.desviacion) - Math.abs(a.desviacion));

  const cuadrillas = cuadrillasRaw.map((cuadrilla) => {
    const mediciones = cubicaciones.filter((c) => c.cuadrillaId === cuadrilla.id);
    const cantidad = mediciones.reduce((sum, m) => sum + m.cantidad, 0);
    const valorizado = mediciones.reduce(
      (sum, m) => sum + Math.round(m.cantidad * m.partida.precioUnitario),
      0,
    );
    const integrantes = Math.max(cuadrilla.integrantes, 1);
    return {
      id: cuadrilla.id,
      nombre: cuadrilla.nombre,
      integrantes,
      mediciones: mediciones.length,
      cantidad,
      valorizado,
      porIntegrante: Math.round(valorizado / integrantes),
    };
  }).sort((a, b) => b.valorizado - a.valorizado);

  return { obra, totales, puntos, totalFacturado, desviaciones, cuadrillas };
}
