"use client";

import { useEffect, useState } from "react";

import { controlClass, secondaryButtonClass } from "@/lib/ui";

type Centro = { id: string; codigo: string; nombre: string };
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
}: {
  centros: Centro[];
  iniciales: Array<{ centroCostoId: string; monto: number }>;
  objetivo: number;
  /** 1 para facturas/boletas, -1 para notas de crédito. */
  signo: number;
  onValidez: (valido: boolean) => void;
}) {
  const [filas, setFilas] = useState<Fila[]>(
    iniciales.map((r) => ({ centroCostoId: r.centroCostoId, monto: String(Math.abs(r.monto)) })),
  );

  const suma = filas.reduce((acc, f) => acc + (Number(f.monto.replace(",", ".")) || 0), 0);
  const cuadra = filas.length === 0 || suma === objetivo;
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
    const resto = objetivo - suma;
    setFilas((prev) => [...prev, { centroCostoId: libre.id, monto: String(resto > 0 ? resto : 0) }]);
  };

  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Centros de costo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Distribuye el total de esta factura entre uno o más centros. Puedes dejarlo sin asignar.
          </p>
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

      {centros.length > filas.length ? (
        <button type="button" onClick={agregar} className={secondaryButtonClass + " mt-3"}>
          + Agregar centro
        </button>
      ) : null}

      {filas.length > 0 ? (
        <p className={`mt-2 text-xs tabular ${cuadra ? "text-success" : "text-danger"}`}>
          Repartido {fmt(suma)} · {cuadra ? "cuadra" : `falta ${fmt(objetivo - suma)}`}
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
