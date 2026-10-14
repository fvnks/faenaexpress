import { requireContext } from "@/lib/auth";
import { cardClass } from "@/lib/ui";

export default async function OrdenCompraPage() {
  await requireContext("compras");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orden de Compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de órdenes de compra y su trazabilidad con las facturas de compra.
        </p>
      </div>
      <div className={cardClass + " px-4 py-10 text-center"}>
        <p className="font-medium">Sección en preparación.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente: creación de órdenes de compra, vinculación con facturas y
          control de recepción. Por ahora, el número de OC se registra en cada factura
          de compra desde el campo &quot;Orden de compra&quot;.
        </p>
      </div>
    </div>
  );
}
