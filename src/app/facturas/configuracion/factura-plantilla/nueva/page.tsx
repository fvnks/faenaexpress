"use client";

import { useState } from "react";
import Link from "next/link";

import { guardarPlantillaFactura } from "@/app/actions/factura-plantilla";

export default function NuevaPlantillaPage() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardarPlantilla() {
    const nombreInput = document.getElementById("nombre") as HTMLInputElement | null;
    const nombre = nombreInput ? nombreInput.value : "";

    if (!nombre) {
      setError("El nombre de la plantilla es requerido.");
      return;
    }

    setCargando(true);
    try {
      const configuracion = {
        mostrarEmpresa: true,
        mostrarRUT: true,
        mostrarDireccion: true,
        mostrarTelefono: true,
        mostrarCorreo: true,
        mostrarReceptor: true,
        mostrarRUTReceptor: true,
        mostrarDireccionReceptor: true,
        mostrarFechaEmision: true,
        mostrarFechaVencimiento: true,
        mostrarFolio: true,
        mostrarTipoDocumento: true,
        mostrarItems: true,
        mostrarTotales: true,
        mostrarRetencion: false,
        mostrarExento: false,
        mostrarRecargo: false,
        mostrarFormaPago: true,
        mostrarPagado: true,
        mostrarPendiente: true,
        mostrarImporteLetras: true,
      };

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("configuracion", JSON.stringify(configuracion));

      const resultado = await guardarPlantillaFactura({}, formData);
      if (resultado.ok) {
        alert("Plantilla creada correctamente.");
      } else {
        alert(resultado.error || "Error al guardar la plantilla.");
      }
    } catch (err) {
      alert("Error al guardar la plantilla.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Nueva Plantilla</h1>
        <p className="text-sm text-muted-foreground">
          Cree una nueva plantilla de factura para reutilizar en sus documentos.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); guardarPlantilla(); }} className="flex flex-col gap-6 max-w-md">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Nombre de la plantilla</label>
          <input
            id="nombre"
            type="text"
            placeholder="Ej: Factura estándar"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Campos a mostrar</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <input
                  id="mostrarEmpresa"
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border border-border bg-background text-primary focus:ring-0"
                />
                <label className="text-sm text-muted-foreground">Nombre de empresa</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRUT" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">RUT del emisor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarDireccion" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Dirección</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarTelefono" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Teléfono</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarCorreo" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Correo electrónico</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarReceptor" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Receptor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRUTReceptor" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">RUT del receptor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarDireccionReceptor" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Dirección del receptor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFechaEmision" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Fecha de emisión</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFechaVencimiento" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Fecha de vencimiento</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFolio" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Folio</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarTipoDocumento" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Tipo de documento</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarItems" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Ítems (detalle)</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarTotales" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Totales</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRetencion" type="checkbox" defaultChecked={false} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Retención</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarExento" type="checkbox" defaultChecked={false} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Exento</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRecargo" type="checkbox" defaultChecked={false} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Recargo IVA</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFormaPago" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Forma de pago</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarPagado" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Pagado</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarPendiente" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Pendiente de pago</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarImporteLetras" type="checkbox" defaultChecked={true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Importe en letras</label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={cargando}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {cargando ? "Guardando..." : "Guardar plantilla"}
          </button>
          <Link
            href="/facturas/configuracion/factura-plantillas"
            className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
