"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import { guardarPlantillaFactura } from "@/app/actions/factura-plantilla";

/** Campos que la plantilla permite mostrar u ocultar en el PDF. */
const CAMPOS: Array<{ clave: string; etiqueta: string }> = [
  { clave: "mostrarEmpresa", etiqueta: "Nombre de la empresa" },
  { clave: "mostrarRUT", etiqueta: "RUT del emisor" },
  { clave: "mostrarDireccion", etiqueta: "Dirección y giro" },
  { clave: "mostrarTelefono", etiqueta: "Teléfono" },
  { clave: "mostrarCorreo", etiqueta: "Correo y sitio web" },
  { clave: "mostrarReceptor", etiqueta: "Receptor" },
  { clave: "mostrarRUTReceptor", etiqueta: "RUT del receptor" },
  { clave: "mostrarDireccionReceptor", etiqueta: "Dirección del receptor" },
  { clave: "mostrarFechaEmision", etiqueta: "Fecha de emisión" },
  { clave: "mostrarFechaVencimiento", etiqueta: "Fecha de vencimiento" },
  { clave: "mostrarFolio", etiqueta: "Folio" },
  { clave: "mostrarTipoDocumento", etiqueta: "Tipo de documento" },
  { clave: "mostrarItems", etiqueta: "Ítems (detalle)" },
  { clave: "mostrarTotales", etiqueta: "Totales y timbre" },
  { clave: "mostrarRetencion", etiqueta: "Retención" },
  { clave: "mostrarExento", etiqueta: "Exento" },
  { clave: "mostrarRecargo", etiqueta: "Recargo IVA" },
  { clave: "mostrarFormaPago", etiqueta: "Forma de pago" },
  { clave: "mostrarPagado", etiqueta: "Pagado" },
  { clave: "mostrarPendiente", etiqueta: "Pendiente de pago" },
  { clave: "mostrarImporteLetras", etiqueta: "Importe en letras" },
];

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crearPlantilla(formData: FormData) {
    setError(null);
    const configuracion: Record<string, boolean> = {};
    for (const campo of CAMPOS) {
      configuracion[campo.clave] = formData.get(campo.clave) === "on";
    }
    formData.set("configuracion", JSON.stringify(configuracion));

    setGuardando(true);
    try {
      const resultado = await guardarPlantillaFactura({}, formData);
      if (resultado?.ok) {
        router.push("/facturas/plantillas");
      } else {
        setError(resultado?.error || "Error al guardar la plantilla.");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Nueva plantilla</h1>
        <p className="text-sm text-muted-foreground">
          Elija qué datos se imprimen en la factura comercial (ventas y
          compras). Puede ajustarlo después.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form action={crearPlantilla} className="flex flex-col gap-6 max-w-2xl">
        <div className="flex flex-col gap-2">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre de la plantilla
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            placeholder="Ej: Factura estándar"
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
                  defaultChecked
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
            {guardando ? "Guardando..." : "Guardar plantilla"}
          </button>
          <Link
            href="/facturas/plantillas"
            className="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
