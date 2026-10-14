import Link from "next/link";

import { requireContext, canWrite } from "@/lib/auth";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function CotizacionesPage() {
  const ctx = await requireContext("ventas");
  const writable = canWrite(ctx, "ventas");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cotizaciones enviadas a clientes, con conversión a factura de venta.
          </p>
        </div>
        {writable ? (
          <Link href="/dashboard/ventas/nueva" className={primaryButtonClass}>
            Nueva cotización
          </Link>
        ) : null}
      </div>
      <div className={cardClass + " px-4 py-10 text-center"}>
        <p className="font-medium">Sección en preparación.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente: creación y gestión de cotizaciones, envío a clientes y
          conversión a factura de venta. Por ahora, gestione las cotizaciones
          previas por fuera del sistema.
        </p>
      </div>
    </div>
  );
}
