import { PartnerList } from "@/components/partner-list";
import { canWrite, requireContext } from "@/lib/auth";
import { listPartners } from "@/lib/partners";

export default async function SuppliersPage() {
  const ctx = await requireContext("proveedores");
  const partners = await listPartners(ctx.company.id, "suppliers");
  const writable = canWrite(ctx, "proveedores");

  return (
    <PartnerList
      partners={partners}
      basePath="/facturas/proveedores"
      writable={writable}
      linkNames
      title="Proveedores"
      subtitle="A quién le compras y con quién registras las compras."
      newLabel="Nuevo proveedor"
      emptyTitle="Aún no registras proveedores."
      emptyBody="Agrega proveedores para asociarlos a las compras."
    />
  );
}
