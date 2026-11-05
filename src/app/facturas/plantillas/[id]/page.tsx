"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import {
  obtenerPlantillaFactura,
  actualizarPlantillaFactura,
  importarPlantillaExcel,
} from "@/app/actions/factura-plantilla";

/** Una plantilla tal como la devuelve la acción. */
type Plantilla = {
  id: string;
  nombre: string;
  esPredeterminada: boolean;
  esActiva: boolean;
  configuracion: Record<string, boolean> | null;
};

/** Campos que la plantilla permite mostrar u ocultar en el PDF. */
const CAMPOS: Array<{ clave: string; etiqueta: string; porDefecto: boolean }> = [
  { clave: "mostrarEmpresa", etiqueta: "Nombre de la empresa", porDefecto: true },
  { clave: "mostrarRUT", etiqueta: "RUT del emisor", porDefecto: true },
  { clave: "mostrarDireccion", etiqueta: "Dirección y giro", porDefecto: true },
  { clave: "mostrarTelefono", etiqueta: "Teléfono", porDefecto: true },
  { clave: "mostrarCorreo", etiqueta: "Correo y sitio web", porDefecto: true },
  { clave: "mostrarReceptor", etiqueta: "Receptor", porDefecto: true },
  { clave: "mostrarRUTReceptor", etiqueta: "RUT del receptor", porDefecto: true },
  {
    clave: "mostrarDireccionReceptor",
    etiqueta: "Dirección del receptor",
    porDefecto: true,
  },
  { clave: "mostrarFechaEmision", etiqueta: "Fecha de emisión", porDefecto: true },
  {
    clave: "mostrarFechaVencimiento",
    etiqueta: "Fecha de vencimiento",
    porDefecto: true,
  },
  { clave: "mostrarFolio", etiqueta: "Folio", porDefecto: true },
  { clave: "mostrarTipoDocumento", etiqueta: "Tipo de documento", porDefecto: true },
  { clave: "mostrarItems", etiqueta: "Ítems (detalle)", porDefecto: true },
  { clave: "mostrarTotales", etiqueta: "Totales y timbre", porDefecto: true },
  { clave: "mostrarRetencion", etiqueta: "Retención", porDefecto: true },
  { clave: "mostrarExento", etiqueta: "Exento", porDefecto: true },
  { clave: "mostrarRecargo", etiqueta: "Recargo IVA", porDefecto: true },
  { clave: "mostrarFormaPago", etiqueta: "Forma de pago", porDefecto: true },
  { clave: "mostrarPagado", etiqueta: "Pagado", porDefecto: true },
  { clave: "mostrarPendiente", etiqueta: "Pendiente de pago", porDefecto: true },
  { clave: "mostrarImporteLetras", etiqueta: "Importe en letras", porDefecto: true },
];

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
          Elija qué datos se imprimen en la factura comercial (ventas y
          compras). Lo que quede sin marcar no aparece en el PDF.{" "}
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

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Campos a mostrar</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {CAMPOS.map((campo) => (
              <label
                key={campo.clave}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  name={campo.clave}
                  defaultChecked={config[campo.clave] ?? campo.porDefecto}
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
