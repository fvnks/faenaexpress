"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { obtenerPlantillasFactura, eliminarPlantillaFactura, establecerPlantillaPredeterminada } from "@/app/actions/factura-plantilla";

export default function FacturaPlantillasPage() {
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarPlantillas() {
    try {
      const data = await obtenerPlantillasFactura();
      setPlantillas(data || []);
    } catch (err) {
      setError("Error al cargar las plantillas de factura.");
    } finally {
      setCargando(false);
    }
  }

  async function eliminarPlantilla(id: string) {
    if (!window.confirm("¿Está seguro de que desea eliminar esta plantilla?")) return;
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
      alert(resultado.error || "Error al establecer la plantilla predeterminada.");
    }
  }

  useEffect(() => {
    cargarPlantillas();
  }, []);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-muted-foreground">Cargando plantillas...</p>
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
            cargarPlantillas();
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
        <h1 className="text-2xl font-bold tracking-tight">Plantillas de Factura</h1>
        <p className="text-sm text-muted-foreground">
          Cree y gestione plantillas de factura para ventas y compras.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/facturas/configuracion/factura-plantilla/nueva"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Nueva plantilla
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.length === 0 ? (
            <div className="col-span-full p-6 text-center text-muted-foreground">
              No hay plantillas creadas aún. Cree su primera plantilla de factura.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plantillas.map((plantilla: any) => (
                <div
                  key={plantilla.id}
                  className="border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{plantilla.nombre}</h3>
                      {plantilla.esPredeterminada && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Predeterminada
                        </span>
                      )}
                      {!plantilla.esActiva && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(plantilla.configuracion || {}).slice(0, 80)}...
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/facturas/configuracion/factura-plantilla/${plantilla.id}/editar`}
                      className="flex-1 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => establecerPredeterminada(plantilla.id)}
                      className={`flex-1 inline-flex items-center rounded-md text-xs font-medium px-3 py-1.5 transition-colors ${plantilla.esPredeterminada ? "bg-gray-200 text-gray-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {plantilla.esPredeterminada ? "Predeterminada" : "Predeterminar"}
                    </button>
                    <button
                      onClick={() => eliminarPlantilla(plantilla.id)}
                      className="inline-flex items-center rounded-md text-xs font-medium px-3 py-1.5 transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
