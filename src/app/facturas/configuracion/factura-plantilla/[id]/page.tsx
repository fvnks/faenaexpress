"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { obtenerPlantillaFactura, actualizarPlantillaFactura } from "@/app/actions/factura-plantilla";

export default function EditarPlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [plantilla, setPlantilla] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarPlantilla() {
    try {
      const paramsData = await params;
      const data = await obtenerPlantillaFactura(paramsData.id);
      if (data) {
        setPlantilla(data);
      } else {
        setError("Plantilla no encontrada.");
      }
    } catch (err) {
      setError("Error al cargar la plantilla.");
    } finally {
      setCargando(false);
    }
  }

  async function guardarPlantilla() {
    if (!plantilla) return;
    setCargando(true);
    try {
      const nombre = (document.getElementById("nombre") as HTMLInputElement)?.value || plantilla.nombre;
      const configuracion = JSON.stringify({
        mostrarEmpresa: (document.getElementById("mostrarEmpresa") as HTMLInputElement)?.checked ?? true,
        mostrarRUT: (document.getElementById("mostrarRUT") as HTMLInputElement)?.checked ?? true,
        mostrarDireccion: (document.getElementById("mostrarDireccion") as HTMLInputElement)?.checked ?? true,
        mostrarTelefono: (document.getElementById("mostrarTelefono") as HTMLInputElement)?.checked ?? true,
        mostrarCorreo: (document.getElementById("mostrarCorreo") as HTMLInputElement)?.checked ?? true,
        mostrarReceptor: (document.getElementById("mostrarReceptor") as HTMLInputElement)?.checked ?? true,
        mostrarRUTReceptor: (document.getElementById("mostrarRUTReceptor") as HTMLInputElement)?.checked ?? true,
        mostrarDireccionReceptor: (document.getElementById("mostrarDireccionReceptor") as HTMLInputElement)?.checked ?? true,
        mostrarFechaEmision: (document.getElementById("mostrarFechaEmision") as HTMLInputElement)?.checked ?? true,
        mostrarFechaVencimiento: (document.getElementById("mostrarFechaVencimiento") as HTMLInputElement)?.checked ?? true,
        mostrarFolio: (document.getElementById("mostrarFolio") as HTMLInputElement)?.checked ?? true,
        mostrarTipoDocumento: (document.getElementById("mostrarTipoDocumento") as HTMLInputElement)?.checked ?? true,
        mostrarItems: (document.getElementById("mostrarItems") as HTMLInputElement)?.checked ?? true,
        mostrarTotales: (document.getElementById("mostrarTotales") as HTMLInputElement)?.checked ?? true,
        mostrarRetencion: (document.getElementById("mostrarRetencion") as HTMLInputElement)?.checked ?? false,
        mostrarExento: (document.getElementById("mostrarExento") as HTMLInputElement)?.checked ?? false,
        mostrarRecargo: (document.getElementById("mostrarRecargo") as HTMLInputElement)?.checked ?? false,
        mostrarFormaPago: (document.getElementById("mostrarFormaPago") as HTMLInputElement)?.checked ?? true,
        mostrarPagado: (document.getElementById("mostrarPagado") as HTMLInputElement)?.checked ?? true,
        mostrarPendiente: (document.getElementById("mostrarPendiente") as HTMLInputElement)?.checked ?? true,
        mostrarImporteLetras: (document.getElementById("mostrarImporteLetras") as HTMLInputElement)?.checked ?? true,
      });

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("configuracion", configuracion);

      const resultado = await actualizarPlantillaFactura(plantilla.id, formData);
      if (resultado.ok) {
        alert("Plantilla guardada correctamente.");
      } else {
        alert(resultado.error || "Error al guardar la plantilla.");
      }
    } catch (err) {
      alert("Error al guardar la plantilla.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPlantilla();
  }, []);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-muted-foreground">Cargando plantilla...</p>
      </div>
    );
  }

  if (error || !plantilla) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p>{error || "Plantilla no encontrada."}</p>
        <Link
          href="/facturas/configuracion/factura-plantillas"
          className="mt-4 text-sm underline"
        >
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Editar Plantilla</h1>
        <p className="text-sm text-muted-foreground">
          Configure qué campos mostrar en la factura y en qué orden aparecen.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); guardarPlantilla(); }} className="flex flex-col gap-6 max-w-md">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Nombre de la plantilla</label>
          <input
            id="nombre"
            type="text"
            defaultValue={plantilla.nombre}
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
                  defaultChecked={plantilla.configuracion?.mostrarEmpresa ?? true}
                  className="rounded border border-border bg-background text-primary focus:ring-0"
                />
                <label className="text-sm text-muted-foreground">Nombre de empresa</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRUT" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarRUT ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">RUT del emisor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarDireccion" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarDireccion ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Dirección</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarTelefono" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarTelefono ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Teléfono</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarCorreo" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarCorreo ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Correo electrónico</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRUTReceptor" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarRUTReceptor ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">RUT del receptor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarDireccionReceptor" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarDireccionReceptor ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Dirección del receptor</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFechaEmision" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarFechaEmision ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Fecha de emisión</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFechaVencimiento" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarFechaVencimiento ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Fecha de vencimiento</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFolio" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarFolio ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Folio</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarTipoDocumento" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarTipoDocumento ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Tipo de documento</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarItems" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarItems ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Ítems (detalle)</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarTotales" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarTotales ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Totales</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRetencion" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarRetencion ?? false} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Retención</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarExento" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarExento ?? false} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Exento</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarRecargo" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarRecargo ?? false} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Recargo IVA</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarFormaPago" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarFormaPago ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Forma de pago</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarPagado" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarPagado ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Pagado</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarPendiente" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarPendiente ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
                <label className="text-sm text-muted-foreground">Pendiente de pago</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="mostrarImporteLetras" type="checkbox" defaultChecked={plantilla.configuracion?.mostrarImporteLetras ?? true} className="rounded border border-border bg-background text-primary focus:ring-0" />
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
            {cargando ? "Guardando..." : "Guardar cambios"}
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
