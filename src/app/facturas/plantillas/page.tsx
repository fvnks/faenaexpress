"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  obtenerPlantillasFactura,
  eliminarPlantillaFactura,
  establecerPlantillaPredeterminada,
  crearPlantillaEjemplo,
} from "@/app/actions/factura-plantilla";

/** Una plantilla tal como la devuelve la acción (configuración es JSON). */
type PlantillaListada = {
  id: string;
  nombre: string;
  tipo: "VENTA" | "COMPRA";
  esPredeterminada: boolean;
  esActiva: boolean;
  configuracion: unknown;
};

export default function FacturaPlantillasPage() {
  const [plantillas, setPlantillas] = useState<PlantillaListada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarPlantillas() {
    const data = await obtenerPlantillasFactura();
    setPlantillas((data ?? []) as PlantillaListada[]);
  }

  useEffect(() => {
    let activo = true;
    obtenerPlantillasFactura()
      .then((data) => {
        if (activo) setPlantillas((data ?? []) as PlantillaListada[]);
      })
      .catch(() => {
        if (activo) setError("Error al cargar las plantillas de factura.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  async function eliminarPlantilla(id: string) {
    if (!window.confirm("¿Está seguro de que desea eliminar esta plantilla?")) {
      return;
    }
    const resultado = await eliminarPlantillaFactura(id);
    if (resultado?.ok) {
      await cargarPlantillas();
    } else if (resultado?.error) {
      alert(resultado.error || "Error al eliminar la plantilla.");
    }
  }

  async function establecerPredeterminada(id: string) {
    const resultado = await establecerPlantillaPredeterminada(id);
    if (resultado?.ok) {
      await cargarPlantillas();
    } else if (resultado?.error) {
      alert(
        resultado.error || "Error al establecer la plantilla predeterminada.",
      );
    }
  }

  async function crearEjemplo() {
    const resultado = await crearPlantillaEjemplo();
    if (resultado?.ok) {
      await cargarPlantillas();
      alert("Plantillas de ejemplo (Venta y Compra) creadas con todos los campos visibles.");
    } else if (resultado?.error) {
      alert(resultado.error || "Error al crear la plantilla de ejemplo.");
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-muted-foreground">
          Cargando plantillas...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setCargando(true);
            cargarPlantillas().finally(() => setCargando(false));
          }}
          className="mt-4 text-sm underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Plantillas de Factura
        </h1>
        <p className="text-sm text-muted-foreground">
          Cree y gestione plantillas de factura para ventas y compras.{" "}
          <Link
            href="/facturas/plantillas/ayuda"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Ver qué dato va en cada lugar
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/facturas/plantillas/nueva"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Nueva plantilla
            </Link>
            <button
              type="button"
              onClick={crearEjemplo}
              className="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Plantilla de ejemplo
            </button>
          </div>
        </div>

        {plantillas.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
            No hay plantillas creadas aún. Cree su primera plantilla de factura.
          </div>
        ) : (
          <div className="space-y-6">
            {["VENTA", "COMPRA"].map((tipo) => {
              const plantillasTipo = plantillas.filter((p) => p.tipo === tipo);
              if (plantillasTipo.length === 0) return null;
              return (
                <section key={tipo} className="space-y-3">
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    {tipo === "VENTA" ? "Plantillas de Venta" : "Plantillas de Compra"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plantillasTipo.map((plantilla) => (
                      <div
                        key={plantilla.id}
                        className="border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold">
                              {plantilla.nombre}
                            </h3>
                            <div className="flex items-center gap-1">
                              {plantilla.esPredeterminada && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  Predeterminada
                                </span>
                              )}
                              {!plantilla.esActiva && (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Inactiva
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {JSON.stringify(plantilla.configuracion || {}).slice(0, 80)}
                            ...
                          </p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <a
                            href={`/facturas/plantillas/${plantilla.id}/descargar`}
                            className="flex-1 inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            Descargar Excel
                          </a>
                          <Link
                            href={`/facturas/plantillas/${plantilla.id}`}
                            className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => establecerPredeterminada(plantilla.id)}
                            disabled={plantilla.esPredeterminada}
                            className="flex-1 inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {plantilla.esPredeterminada ? "Predeterminada" : "Predeterminar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarPlantilla(plantilla.id)}
                            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}