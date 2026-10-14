import { requireContext } from "@/lib/auth";
import { cardClass } from "@/lib/ui";

export default async function NotaDebitoPage() {
  await requireContext("ventas");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nota de Débito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notas de débito emitidas y recibidas para cargos adicionales.
        </p>
      </div>
      <div className={cardClass + " px-4 py-10 text-center"}>
        <p className="font-medium">Sección en preparación.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente: listado y gestión de notas de débito. Por ahora, las notas de
          débito se registran desde Ventas con tipo de documento &quot;Nota de
          débito&quot; y se asocian a una factura original.
        </p>
      </div>
    </div>
  );
}
