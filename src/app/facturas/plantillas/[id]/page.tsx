"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import {
  obtenerPlantillaFactura,
  actualizarPlantillaFactura,
  importarPlantillaExcel,
} from "@/app/actions/factura-plantilla";
import { CAMPOS_PLANTILLA } from "@/lib/factura-plantilla-campos";

/** Una plantilla tal como la devuelve la acción. */
type Plantilla = {
  id: string;
  nombre: string;
  tipo: "VENTA" | "COMPRA";
  esPredeterminada: boolean;
  esActiva: boolean;
  configuracion: Record<string, boolean> | null;
};

/** Campos que la plantilla permite mostrar u ocultar en el PDF. Fuente única:
 * la misma que usan la descarga en Excel, la importación y el PDF. */
const CAMPOS = CAMPOS_PLANTILLA;

export default function EditarPlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerPlantillaFactura(id)
      .then((data) => {
        if (!activo) return;
        if (data) {
          setPlantilla(data as unknown as Plantilla);
        } else {
          setError("Plantilla no encontrada.");
        }
      })
      .catch(() => {
        if (activo) setError("Error al cargar la plantilla.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  async function guardarPlantilla(formData: FormData) {
    if (!plantilla) return;
    setGuardando(true);
    try {
      const resultado = await actualizarPlantillaFactura(plantilla.id, {}, formData);
      if (resultado?.ok) {
        alert("Plantilla guardada correctamente.");
      } else {
        alert(resultado?.error || "Error al guardar la plantilla.");
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">
          Cargando plantilla...
        </p>
      </div>
    );
  }

  if (error || !plantilla) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <p>{error || "Plantilla no encontrada."}</p>
        <Link
          href="/facturas/plantillas"
          className="mt-4 text-sm underline"
        >
          Volver
        </Link>
      </div>
    );
  }

  const config = plantilla.configuracion ?? {};

  async function importarPlantilla(formData: FormData) {
    const resultado = await importarPlantillaExcel(formData);
    if (resultado?.ok) {
      alert("Plantilla importada desde Excel correctamente.");
      window.location.reload();
    } else {
      alert(resultado?.error || "Error al importar la plantilla desde Excel.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Editar plantilla</h1>
        <p className="text-sm text-muted-foreground">
          Tipo: <span className="font-medium">{plantilla.tipo === "VENTA" ? "Venta" : "Compra"}</span> ·
          Elija qué datos se imprimen en la factura comercial. Lo que quede sin marcar no aparece en el PDF.{" "}
          <Link
            href="/facturas/plantillas/ayuda"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Ver qué dato va en cada lugar
          </Link>
          .
        </p>
      </div>

      <form
        action={guardarPlantilla}
        className="flex flex-col gap-6 max-w-2xl"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre de la plantilla
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            defaultValue={plantilla.nombre}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="tipo" className="text-sm font-medium">
            Tipo de documento (no editable)
          </label>
          <input
            id="tipo"
            type="text"
            value={plantilla.tipo === "VENTA" ? "Venta" : "Compra"}
            readOnly
            className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
          />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Campos a mostrar</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {CAMPOS.map((campo) => (
              <label
                key={campo.campo}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  name={campo.campo}
                  defaultChecked={config[campo.campo] ?? campo.porDefecto}
                  className="size-4 rounded border-border text-primary focus:ring-0"
                />
                {campo.etiqueta}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-2">
          <input
            id="esPredeterminada"
            name="esPredeterminada"
            type="checkbox"
            defaultChecked={plantilla.esPredeterminada}
            className="size-4 rounded border-border text-primary focus:ring-0"
          />
          <label htmlFor="esPredeterminada" className="text-sm">
            Usar esta plantilla en las facturas de la empresa
          </label>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href="/facturas/plantillas"
            className="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <form action={importarPlantilla} className="flex flex-col gap-4 max-w-2xl">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Importar desde Excel</legend>
          <p className="text-sm text-muted-foreground">
            Subí un archivo .xlsx descargado desde esta misma sección para aplicar
            nuevos valores a los campos de la plantilla.
          </p>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input type="hidden" name="id" value={plantilla.id} />
        </fieldset>
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Importar plantilla desde Excel
        </button>
      </form>
    </div>
  );
}
