// Cálculo del presupuesto de obra. La identidad que se cumple, partida por
// partida:  obligado = precioUnitario × cantidad  y  desviación = real − obligado.
//
// El costo real NO se escribe a mano: se deriva de los documentos de Facturas
// (compras, gastos, abonos) vinculados a la obra. Igual que en `ledger.ts`,
// los totales se calculan en un solo lugar para que el panel y la lista digan
// siempre lo mismo.

export type PartidaParaTotal = {
  id: string;
  parentId?: string | null;
  cantidad: number;
  precioUnitario: number;
  total: number;
  estado: string;
};

export type CostoParaTotal = {
  partidaId: string | null;
  monto: number;
};

export type CubicacionParaTotal = {
  partidaId: string;
  cantidad: number;
  /** Si se omiten las no aprobadas en la consulta, se asume aprobada. */
  aprobada?: boolean;
};

export type TotalesObra = {
  /** Suma del presupuesto vigente (partidas VIGENTE). */
  obligado: number;
  /** Costo real acumulado desde documentos. */
  real: number;
  /** real − obligado (positivo = sobre costo). */
  desviacion: number;
  /** Porcentaje de desviación sobre lo obligado (null si no hay base). */
  desviacionPct: number | null;
  /** Avance físico en unidades: cubicado / presupuestado. */
  avanceFisico: number;
  /** Importe valorizado de lo cubicado aprobado. */
  avanceValorizado: number;
  /** Cantidad de partidas vigentes. */
  partidas: number;
};

/** Recalcula el total de una partida (el archivo nunca trae el total correcto). */
export function totalPartida(cantidad: number, precioUnitario: number): number {
  return Math.round(cantidad * precioUnitario * 100) / 100;
}

export function calcularTotalesObra(
  partidas: PartidaParaTotal[],
  costos: CostoParaTotal[],
  cubicaciones: CubicacionParaTotal[],
): TotalesObra {
  const vigentes = partidas.filter((p) => p.estado !== "ANULADA");
  const obligado = vigentes.reduce((sum, p) => sum + totalPartida(p.cantidad, p.precioUnitario), 0);
  const real = costos.reduce((sum, c) => sum + c.monto, 0);
  const desviacion = real - obligado;

  const presupuestado = vigentes.reduce((sum, p) => sum + p.cantidad, 0);
  const cubicadoAprobado = cubicaciones
    .filter((c) => c.aprobada !== false)
    .reduce((sum, c) => sum + c.cantidad, 0);
  const avanceFisico = presupuestado > 0 ? cubicadoAprobado / presupuestado : 0;

  const porPartida = new Map(vigentes.map((p) => [p.id, p]));
  const aprobadasPorPartida = new Map<string, number>();
  for (const c of cubicaciones.filter((x) => x.aprobada !== false)) {
    aprobadasPorPartida.set(c.partidaId, (aprobadasPorPartida.get(c.partidaId) ?? 0) + c.cantidad);
  }
  let avanceValorizado = 0;
  for (const [id, cantidad] of aprobadasPorPartida) {
    const p = porPartida.get(id);
    if (p) avanceValorizado += totalPartida(Math.min(cantidad, p.cantidad), p.precioUnitario);
  }

  return {
    obligado,
    real,
    desviacion,
    desviacionPct: obligado !== 0 ? Math.round((desviacion / obligado) * 10000) / 100 : null,
    avanceFisico,
    avanceValorizado,
    partidas: vigentes.length,
  };
}

/** Punto de la curva S: avance acumulado (valorizado) mes a mes. */
export type PuntoCurvaS = {
  mes: string; // YYYY-MM
  planificado: number; // obligado acumulado hasta el mes (lineal entre inicio y término)
  real: number; // avance valorizado acumulado hasta el mes
};

/**
 * Curva S sencilla: el plan se reparte en línea recta entre las fechas de la
 * obra y el real se acumula desde las cubicaciones aprobadas por mes.
 * No es una curva de programación con hitos: es la comparación honesta que se
 * puede hacer con los datos que existen (presupuesto + cubicaciones).
 */
export function curvaS(
  obligado: number,
  fechaInicio: Date | null,
  fechaTermino: Date | null,
  valorizadoPorMes: Array<{ mes: string; valor: number }>,
): PuntoCurvaS[] {
  const inicio = fechaInicio ? new Date(fechaInicio) : new Date();
  const termino = fechaTermino && fechaTermino > inicio ? new Date(fechaTermino) : new Date(inicio.getTime() + 90 * 864e5);

  const meses: string[] = [];
  const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
  const fin = new Date(Date.UTC(termino.getUTCFullYear(), termino.getUTCMonth(), 1));
  while (cursor <= fin && meses.length < 60) {
    meses.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  if (meses.length === 0) meses.push(inicio.toISOString().slice(0, 7));

  const totalMeses = meses.length;
  const porMes = new Map(valorizadoPorMes.map((v) => [v.mes, v.valor]));
  let acumuladoReal = 0;

  return meses.map((mes, index) => {
    acumuladoReal += porMes.get(mes) ?? 0;
    return {
      mes,
      // Reparto lineal inclusive: en el último mes llega al 100% del obligado.
      planificado: Math.round((obligado * (index + 1)) / totalMeses),
      real: Math.round(acumuladoReal),
    };
  });
}

/** Costo real por partida (los documentos sin partida quedan en "sin imputar"). */
export function costosPorPartida(costos: CostoParaTotal[]): {
  porPartida: Map<string, number>;
  sinImputar: number;
} {
  const porPartida = new Map<string, number>();
  let sinImputar = 0;
  for (const costo of costos) {
    if (costo.partidaId) {
      porPartida.set(costo.partidaId, (porPartida.get(costo.partidaId) ?? 0) + costo.monto);
    } else {
      sinImputar += costo.monto;
    }
  }
  return { porPartida, sinImputar };
}
