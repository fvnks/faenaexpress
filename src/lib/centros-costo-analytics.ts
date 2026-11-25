// Análisis de centros de costo: una sola regla de datos para la pantalla y
// para las exportaciones. Todo filtrado por companyId, igual que el resto.
//
// Las compras y ventas se leen desde `RepartoCentroCosto` (el monto ya viene
// con signo de nota de crédito); los gastos indirectos se leen desde
// `Expense.centroCostoId`. Ni unos ni otros se recalculan aquí.

import type { MonthlyBucket, MonthlyMatrixResult } from "@/lib/reports";
import { db } from "@/lib/db";
import { monthRange, shiftPeriod } from "@/lib/money";

export type CentroAnalisis = {
  id: string;
  codigo: string;
  nombre: string;
  esSinAsignar: boolean;
  active: boolean;
  compras: number;
  ventas: number;
  gastos: number;
  total: number;
  byMonth: Record<string, number>;
};

export type DocumentoAnalisis = {
  id: string;
  tipo: "compra" | "venta" | "gasto";
  centroId: string;
  centroNombre: string;
  folio: string;
  tercero: string;
  fecha: Date;
  monto: number;
  href: string;
};

export type AnalisisCentrosResult = {
  periodo: string;
  desde: Date;
  hasta: Date;
  meses: MonthlyBucket[];
  centros: CentroAnalisis[];
  documentos: DocumentoAnalisis[];
  matriz: MonthlyMatrixResult;
  totales: {
    compras: number;
    ventas: number;
    gastos: number;
    total: number;
    sinAsignar: number;
    documentos: number;
    centrosActivos: number;
  };
  /** Variación del mes elegido contra el inmediatamente anterior. */
  variacion: number;
};

const MES_ABREV = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export async function cargarAnalisisCentros(
  companyId: string,
  periodo: string,
  cantidadMeses = 12,
): Promise<AnalisisCentrosResult> {
  const hasta = monthRange(periodo)?.to ?? new Date();
  const primerPeriodo = shiftPeriod(periodo, -(cantidadMeses - 1));
  const desde = monthRange(primerPeriodo)?.from ?? new Date();
  const meses = Array.from(
    { length: cantidadMeses },
    (_, i) => shiftPeriod(primerPeriodo, i),
  );
  const indicePorMes = new Map(meses.map((mes, i) => [mes, i]));
  const buckets: MonthlyBucket[] = meses.map((mes) => {
    const label = MES_ABREV[Number(mes.slice(5, 7)) - 1];
    return { key: mes, label, ventas: 0, compras: 0, gastos: 0 };
  });

  const [centros, repartos, gastos] = await Promise.all([
    db.centroCosto.findMany({
      where: { companyId },
      orderBy: [{ active: "desc" }, { codigo: "asc" }],
      select: { id: true, codigo: true, nombre: true, esSinAsignar: true, active: true },
    }),
    db.repartoCentroCosto.findMany({
      where: {
        companyId,
        OR: [
          { purchase: { date: { gte: desde, lt: hasta } } },
          { sale: { date: { gte: desde, lt: hasta } } },
        ],
      },
      select: {
        id: true,
        centroCostoId: true,
        monto: true,
        purchase: {
          select: {
            id: true, date: true, documentNumber: true,
            partner: { select: { name: true } },
          },
        },
        sale: {
          select: {
            id: true, date: true, documentNumber: true,
            partner: { select: { name: true } },
          },
        },
      },
    }),
    db.expense.findMany({
      where: {
        companyId,
        centroCostoId: { not: null },
        date: { gte: desde, lt: hasta },
      },
      select: {
        id: true, date: true, documentNumber: true, totalAmount: true, centroCostoId: true,
        centroCosto: { select: { codigo: true, nombre: true } },
        paidBy: { select: { name: true } },
      },
    }),
  ]);

  const porCentro = new Map<string, CentroAnalisis>();
  for (const centro of centros) {
    porCentro.set(centro.id, {
      ...centro,
      compras: 0,
      ventas: 0,
      gastos: 0,
      total: 0,
      byMonth: {},
    });
  }
  function centro(id: string): CentroAnalisis {
    let fila = porCentro.get(id);
    if (!fila) {
      fila = {
        id, codigo: "—", nombre: "Centro eliminado", esSinAsignar: false, active: false,
        compras: 0, ventas: 0, gastos: 0, total: 0, byMonth: {},
      };
      porCentro.set(id, fila);
    }
    return fila;
  }
  function sumar(id: string, mes: string, tipo: "compras" | "ventas" | "gastos", monto: number) {
    const fila = centro(id);
    fila[tipo] += monto;
    fila.total += monto;
    fila.byMonth[mes] = (fila.byMonth[mes] ?? 0) + monto;
    const bucket = buckets[indicePorMes.get(mes) ?? -1];
    if (bucket) bucket[tipo] += monto;
  }

  const documentos: DocumentoAnalisis[] = [];
  for (const reparto of repartos) {
    const compra = reparto.purchase;
    const venta = reparto.sale;
    const doc = compra ?? venta;
    if (!doc) continue;
    const mes = monthKey(doc.date);
    if (!indicePorMes.has(mes)) continue;
    const tipo = compra ? "compras" : "ventas";
    sumar(reparto.centroCostoId, mes, tipo, reparto.monto);
    const fila = centro(reparto.centroCostoId);
    documentos.push({
      id: reparto.id,
      tipo: compra ? "compra" : "venta",
      centroId: fila.id,
      centroNombre: fila.nombre,
      folio: doc.documentNumber ?? "Sin folio",
      tercero: doc.partner.name,
      fecha: doc.date,
      monto: reparto.monto,
      href: compra ? `/facturas/compras/${compra.id}` : `/facturas/ventas/${venta!.id}`,
    });
  }
  for (const gasto of gastos) {
    const id = gasto.centroCostoId!;
    const mes = monthKey(gasto.date);
    if (!indicePorMes.has(mes)) continue;
    sumar(id, mes, "gastos", gasto.totalAmount);
    const fila = centro(id);
    documentos.push({
      id: gasto.id,
      tipo: "gasto",
      centroId: id,
      centroNombre: fila.nombre,
      folio: gasto.documentNumber ?? "Sin documento",
      tercero: gasto.paidBy.name,
      fecha: gasto.date,
      monto: gasto.totalAmount,
      href: `/facturas/gastos/${gasto.id}`,
    });
  }

  documentos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  const centrosOrdenados = [...porCentro.values()].sort(
    (a, b) => Math.abs(b.total) - Math.abs(a.total) || a.codigo.localeCompare(b.codigo, "es"),
  );
  const totales = centrosOrdenados.reduce(
    (acc, fila) => {
      acc.compras += fila.compras;
      acc.ventas += fila.ventas;
      acc.gastos += fila.gastos;
      acc.total += fila.total;
      if (fila.esSinAsignar) acc.sinAsignar += fila.total;
      return acc;
    },
    { compras: 0, ventas: 0, gastos: 0, total: 0, sinAsignar: 0, documentos: documentos.length, centrosActivos: centros.filter((c) => c.active).length },
  );

  const actual = meses[meses.length - 1];
  const anterior = shiftPeriod(actual, -1);
  const totalMes = (mes: string) =>
    centrosOrdenados.reduce((sum, fila) => sum + (fila.byMonth[mes] ?? 0), 0);
  const valorAnterior = indicePorMes.has(anterior) ? totalMes(anterior) : 0;
  const valorActual = totalMes(actual);
  const variacion = valorAnterior !== 0 ? ((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 100 : 0;

  const matriz: MonthlyMatrixResult = {
    rows: centrosOrdenados.map((fila) => {
      const conDatos = meses.filter((mes) => (fila.byMonth[mes] ?? 0) !== 0);
      const periodTotal = meses.reduce((sum, mes) => sum + (fila.byMonth[mes] ?? 0), 0);
      const peak = conDatos
        .map((mes) => ({ month: mes, total: fila.byMonth[mes] ?? 0 }))
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))[0] ?? null;
      return {
        id: fila.id,
        name: `${fila.codigo} · ${fila.nombre}`,
        byMonth: fila.byMonth,
        periodTotal,
        monthlyAverage: conDatos.length ? periodTotal / conDatos.length : 0,
        peakMonth: peak,
      };
    }),
    months: meses,
    grandTotal: totales.total,
    grandMonthlyAverage: meses.length ? totales.total / meses.length : 0,
  };

  return {
    periodo,
    desde,
    hasta,
    meses: buckets,
    centros: centrosOrdenados,
    documentos,
    matriz,
    totales,
    variacion,
  };
}

/** Misma regla para la pantalla y el archivo descargable. */
export function etiquetaVariacion(variacion: number): string {
  const signo = variacion > 0 ? "+" : "";
  return `${signo}${variacion.toFixed(1).replace(".", ",")} %`;
}

export function resumenParaCsv(analisis: AnalisisCentrosResult): string[][] {
  const filas: string[][] = [
    ["Período", "Código", "Centro", "Compras", "Ventas", "Gastos", "Total"],
  ];
  for (const centro of analisis.centros) {
    filas.push([
      analisis.periodo, centro.codigo, centro.nombre,
      String(centro.compras), String(centro.ventas), String(centro.gastos), String(centro.total),
    ]);
  }
  filas.push([
    analisis.periodo, "TOTAL", "Todos los centros",
    String(analisis.totales.compras), String(analisis.totales.ventas),
    String(analisis.totales.gastos), String(analisis.totales.total),
  ]);
  return filas;
}

export function detalleParaCsv(analisis: AnalisisCentrosResult): string[][] {
  const filas: string[][] = [
    ["Fecha", "Centro", "Tipo", "Folio", "Tercero", "Monto asignado"],
  ];
  for (const doc of analisis.documentos) {
    filas.push([
      doc.fecha.toISOString().slice(0, 10),
      doc.centroNombre,
      doc.tipo === "compra" ? "Compra" : doc.tipo === "venta" ? "Venta" : "Gasto",
      doc.folio,
      doc.tercero,
      String(doc.monto),
    ]);
  }
  return filas;
}
