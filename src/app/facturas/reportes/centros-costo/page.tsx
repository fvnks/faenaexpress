import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentPeriod, formatCLP, formatDate, formatPeriod, monthRange } from "@/lib/money";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

type Fila = {
  id: string;
  codigo: string;
  nombre: string;
  compras: number;
  ventas: number;
  gastos: number;
  documentos: Array<{ id: string; tipo: "compra" | "venta" | "gasto"; folio: string; tercero: string; fecha: Date; monto: number }>;
};

export default async function ReporteCentrosCostoPage(props: PageProps<"/facturas/reportes/centros-costo">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const [repartos, sinCompra, sinVenta, gastos, sinGasto] = await Promise.all([
    db.repartoCentroCosto.findMany({
      where: {
        companyId: ctx.company.id,
        OR: [
          { purchase: { date: { gte: range.from, lte: range.to } } },
          { sale: { date: { gte: range.from, lte: range.to } } },
        ],
      },
      orderBy: { centroCosto: { codigo: "asc" } },
      select: {
        id: true, monto: true,
        centroCosto: { select: { id: true, codigo: true, nombre: true, active: true } },
        purchase: { select: { id: true, date: true, documentNumber: true, totalAmount: true, partner: { select: { name: true } } } },
        sale: { select: { id: true, date: true, documentNumber: true, totalAmount: true, partner: { select: { name: true } } } },
      },
    }),
    db.purchase.count({
      where: { companyId: ctx.company.id, date: { gte: range.from, lte: range.to }, repartosCentroCosto: { none: {} } },
    }),
    db.sale.count({
      where: { companyId: ctx.company.id, date: { gte: range.from, lte: range.to }, repartosCentroCosto: { none: {} } },
    }),
    db.expense.findMany({
      where: {
        companyId: ctx.company.id,
        date: { gte: range.from, lte: range.to },
        centroCostoId: { not: null },
      },
      orderBy: { centroCosto: { codigo: "asc" } },
      select: {
        id: true, date: true, documentNumber: true, totalAmount: true,
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        paidBy: { select: { name: true } },
      },
    }),
    db.expense.count({
      where: { companyId: ctx.company.id, date: { gte: range.from, lte: range.to }, centroCostoId: null },
    }),
  ]);

  const porCentro = new Map<string, Fila>();
  for (const r of repartos) {
    const centro = r.centroCosto;
    let fila = porCentro.get(centro.id);
    if (!fila) {
      fila = { id: centro.id, codigo: centro.codigo, nombre: centro.nombre, compras: 0, ventas: 0, gastos: 0, documentos: [] };
      porCentro.set(centro.id, fila);
    }
    if (r.purchase) {
      fila.compras += r.monto;
      fila.documentos.push({
        id: r.purchase.id, tipo: "compra", folio: r.purchase.documentNumber ?? "Sin folio",
        tercero: r.purchase.partner.name, fecha: r.purchase.date, monto: r.monto,
      });
    } else if (r.sale) {
      fila.ventas += r.monto;
      fila.documentos.push({
        id: r.sale.id, tipo: "venta", folio: r.sale.documentNumber ?? "Sin folio",
        tercero: r.sale.partner.name, fecha: r.sale.date, monto: r.monto,
      });
    }
  }
  for (const gasto of gastos) {
    const centro = gasto.centroCosto;
    if (!centro) continue;
    let fila = porCentro.get(centro.id);
    if (!fila) {
      fila = { id: centro.id, codigo: centro.codigo, nombre: centro.nombre, compras: 0, ventas: 0, gastos: 0, documentos: [] };
      porCentro.set(centro.id, fila);
    }
    fila.gastos += gasto.totalAmount;
    fila.documentos.push({
      id: gasto.id, tipo: "gasto", folio: gasto.documentNumber ?? "Sin documento",
      tercero: gasto.paidBy.name, fecha: gasto.date, monto: gasto.totalAmount,
    });
  }

  const filas = [...porCentro.values()].sort((a, b) =>
    Math.abs(b.compras + b.ventas + b.gastos) - Math.abs(a.compras + a.ventas + a.gastos),
  );
  const max = Math.max(1, ...filas.map((f) => Math.abs(f.compras) + Math.abs(f.ventas) + Math.abs(f.gastos)));
  const totalCompras = filas.reduce((s, f) => s + f.compras, 0);
  const totalVentas = filas.reduce((s, f) => s + f.ventas, 0);
  const totalGastos = filas.reduce((s, f) => s + f.gastos, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / Análisis</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Centros de costo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Desglose de compras, ventas y gastos por centro en {formatPeriod(period)}. Las notas de crédito restan; los gastos indirectos (gasolina, luz, arriendo) se imputan desde su categoría.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/centros-costo" />
      <PeriodFilter period={period} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Compras asignadas", value: formatCLP(totalCompras) },
          { label: "Ventas asignadas", value: formatCLP(totalVentas) },
          { label: "Gastos asignados", value: formatCLP(totalGastos) },
          { label: "Compras sin centro", value: String(sinCompra) },
          { label: "Ventas sin centro", value: String(sinVenta) },
          { label: "Gastos sin centro", value: String(sinGasto) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Totales por centro</h2>
          <p className="text-xs text-muted-foreground">Ancho de barra según el valor absoluto asignado.</p>
        </div>
        {filas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay movimientos asignados en este período. Asigna las facturas desde su detalle y configura el centro por defecto de cada categoría de gasto en Catálogos.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filas.map((f) => {
              const ancho = Math.round((Math.abs(f.compras) + Math.abs(f.ventas) + Math.abs(f.gastos)) / max * 100);
              return (
                <li key={f.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span><span className="font-mono text-xs text-primary">{f.codigo}</span> · {f.nombre}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      C {formatCLP(f.compras)} · V {formatCLP(f.ventas)} · G {formatCLP(f.gastos)} · {f.documentos.length} líneas
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                    <div className="h-full bg-primary" style={{ width: `${ancho}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {filas.length > 0 ? (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Desglose por documento</h2>
          </div>
          <ul className="divide-y divide-border">
            {filas.map((f) => (
              <li key={f.id}>
                <details className="px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {f.codigo} · {f.nombre} <span className="text-xs font-normal text-muted-foreground">({f.documentos.length})</span>
                  </summary>
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="py-2 text-left">Documento</th>
                        <th className="py-2 text-left">Tercero</th>
                        <th className="py-2 text-left">Fecha</th>
                        <th className="py-2 text-right">Monto imputado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {f.documentos.map((d) => (
                        <tr key={d.id}>
                          <td className="py-2">
                            <Link
                              href={
                                d.tipo === "compra"
                                  ? `/facturas/compras/${d.id}`
                                  : d.tipo === "venta"
                                    ? `/facturas/ventas/${d.id}`
                                    : `/facturas/gastos/${d.id}`
                              }
                              className="text-primary hover:underline"
                            >
                              {d.tipo === "compra" ? "Compra" : d.tipo === "venta" ? "Venta" : "Gasto"} {d.folio}
                            </Link>
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">{d.tercero}</td>
                          <td className="py-2 text-xs text-muted-foreground">{formatDate(d.fecha)}</td>
                          <td className="py-2 text-right tabular">{formatCLP(d.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
