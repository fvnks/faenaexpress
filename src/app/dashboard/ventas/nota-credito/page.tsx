import { requireContext } from "@/lib/auth";
import { cardClass } from "@/lib/ui";

export default async function NotaCreditoPage() {
  await requireContext("ventas");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nota de Crédito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notas de crédito emitidas y recibidas para anulación o ajuste de facturas.
        </p>
      </div>
      <div className={cardClass + " px-4 py-10 text-center"}>
        <p className="font-medium">Sección en preparación.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente: listado y gestión de notas de crédito. Por ahora, las notas
          de crédito se registran desde Ventas con tipo de documento &quot;Nota de
          crédito&quot; y se asocian a una factura original.
        </p>
      </div>
    </div>
  );
}
