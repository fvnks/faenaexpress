import { requireContext } from "@/lib/auth";
import { cardClass } from "@/lib/ui";

export default async function GuiasPage() {
  await requireContext("ventas");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guías de Despacho</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guías de despacho electrónicas emitidas al cliente.
        </p>
      </div>
      <div className={cardClass + " px-4 py-10 text-center"}>
        <p className="font-medium">Sección en preparación.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente: gestión de guías de despacho y vinculación con facturas de
          venta. Por ahora, el número de guía se registra en cada factura desde el
          campo &quot;Guía de despacho&quot;.
        </p>
      </div>
    </div>
  );
}
