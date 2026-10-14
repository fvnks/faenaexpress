import { requireContext } from "@/lib/auth";
import { cardClass } from "@/lib/ui";

export default async function CotizacionesPage() {
  await requireContext("ventas");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cotizaciones enviadas a clientes, con conversión a factura de venta.
        </p>
      </div>
      <div className={cardClass + " px-4 py-10 text-center"}>
        <p className="font-medium">Sección en preparación.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente: creación y gestión de cotizaciones, envío a clientes y
          conversión a factura de venta.
        </p>
      </div>
    </div>
  );
}
