"use client";

import { useEffect, useState } from "react";

import { controlClass, secondaryButtonClass } from "@/lib/ui";

type Centro = { id: string; codigo: string; nombre: string; esSinAsignar?: boolean };
type Fila = { centroCostoId: string; monto: string };

const fmt = (v: number) => `$${v.toLocaleString("es-CL")}`;

/**
 * Reparto entre centros de costo dentro del formulario de venta.
 * Los montos se editan como valores positivos; el hidden input guarda el
 * valor con signo (negativo en notas de crédito) para que la action cuadre.
 */
export function RepartoForm({
  centros,
  iniciales,
  objetivo,
  signo,
  onValidez,
  obligatorio = false,
}: {
  centros: Centro[];
  iniciales: Array<{ centroCostoId: string; monto: number }>;
  objetivo: number;
  /** 1 para facturas/boletas, -1 para notas de crédito. */
  signo: number;
  onValidez: (valido: boolean) => void;
  /** Las facturas de combustible no pueden quedar sin centro. */
  obligatorio?: boolean;
}) {
  const [filas, setFilas] = useState<Fila[]>(
    iniciales.map((r) => ({ centroCostoId: r.centroCostoId, monto: String(Math.abs(r.monto)) })),
  );

  const suma = filas.reduce((acc, f) => acc + (Number(f.monto.replace(",", ".")) || 0), 0);
  const resto = objetivo - suma;
  const cuadra = filas.length === 0 ? !obligatorio : resto === 0;
  const sinAsignar = centros.find((centro) => centro.esSinAsignar);
  useEffect(() => {
    onValidez(cuadra);
  }, [cuadra, onValidez]);

  const cambiar = (index: number, campo: keyof Fila, valor: string) => {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  };
  const agregar = () => {
    const usados = new Set(filas.map((f) => f.centroCostoId));
    const libre = centros.find((c) => !usados.has(c.id));
    if (!libre) return;
    setFilas((prev) => [...prev, { centroCostoId: libre.id, monto: String(resto > 0 ? resto : 0) }]);
  };

  /** Estaciona el saldo en el centro «Sin asignar» para cuadrar el documento. */
  const dejarResto = () => {
    if (!sinAsignar || resto <= 0) return;
    const monto = Math.round(resto);
    setFilas((prev) => {
      const existente = prev.find((f) => f.centroCostoId === sinAsignar.id);
      if (existente) {
        return prev.map((f) =>
          f.centroCostoId === sinAsignar.id
            ? { ...f, monto: String(Math.round((Number(f.monto.replace(",", ".")) || 0) + monto)) }
            : f,
        );
      }
      return [...prev, { centroCostoId: sinAsignar.id, monto: String(monto) }];
    });
  };

  return (
    <section className={`rounded-card border bg-surface p-4 ${obligatorio && filas.length === 0 ? "border-danger" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Centros de costo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Distribuye el total de esta factura entre uno o más centros. El saldo que aún no quieras imputar puedes dejarlo en el centro «Sin asignar».
          </p>
          {obligatorio ? (
            <p className="mt-1 text-xs font-medium text-danger">
              Las facturas de combustible deben llevar al menos un centro de costo.
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total a repartir</p>
          <p className="tabular text-lg font-bold">{fmt(objetivo)}</p>
        </div>
      </div>

      {filas.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Centro</th>
                <th className="py-2 text-right">Monto</th>
                <th className="py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((fila, index) => (
                <tr key={index}>
                  <td className="py-2 pr-3">
                    <select
                      value={fila.centroCostoId}
                      onChange={(e) => cambiar(index, "centroCostoId", e.target.value)}
                      className={controlClass}
                    >
                      {centros.map((c) => (
                        <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-right">
                    <input
                      value={fila.monto}
                      onChange={(e) => cambiar(index, "monto", e.target.value)}
                      inputMode="decimal"
                      className={controlClass + " w-40 text-right tabular"}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setFilas((prev) => prev.filter((_, i) => i !== index))}
                      className="text-xs text-danger hover:underline"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Sin centros asignados.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {centros.length > filas.length ? (
          <button type="button" onClick={agregar} className={secondaryButtonClass}>
            + Agregar centro
          </button>
        ) : null}
        {sinAsignar && resto > 0 ? (
          <button type="button" onClick={dejarResto} className={secondaryButtonClass}>
            Dejar {fmt(resto)} en «{sinAsignar.nombre}»
          </button>
        ) : null}
      </div>

      {filas.length > 0 ? (
        <p className={`mt-2 text-xs tabular ${cuadra ? "text-success" : "text-danger"}`}>
          Repartido {fmt(suma)} · {cuadra ? "cuadra" : `falta ${fmt(resto)}`}
        </p>
      ) : null}
      {!sinAsignar ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Para estacionar un saldo sin decidir su centro, marca uno como «Sin asignar» en Catálogos → Centros de costo.
        </p>
      ) : null}

      <input
        type="hidden"
        name="repartos"
        value={JSON.stringify(
          filas.map((f) => ({
            centroCostoId: f.centroCostoId,
            monto: Math.round((Number(f.monto.replace(",", ".")) || 0) * signo),
          })),
        )}
      />
    </section>
  );
}
