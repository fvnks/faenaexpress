// Cálculo del presupuesto de obra. La identidad que se cumple, partida por
// partida:  obligado = precioUnitario × cantidad  y  desviación = real − obligado.
//
// El costo real NO se escribe a mano: se deriva de los documentos de Facturas
// (compras, gastos, abonos) vinculados a la obra. Igual que en `ledger.ts`,
// los totales se calculan en un solo lugar para que el panel y la lista digan
// siempre lo mismo.

export type PartidaParaTotal = {
  id: string;
  parentId: string | null;
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
  aprobada: boolean;
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
    .filter((c) => c.aprobada)
    .reduce((sum, c) => sum + c.cantidad, 0);
  const avanceFisico = presupuestado > 0 ? cubicadoAprobado / presupuestado : 0;

  const porPartida = new Map(vigentes.map((p) => [p.id, p]));
  const aprobadasPorPartida = new Map<string, number>();
  for (const c of cubicaciones.filter((x) => x.aprobada)) {
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
