import { PartnerList } from "@/components/partner-list";
import { canWrite, requireContext } from "@/lib/auth";
import { listPartners } from "@/lib/partners";

export default async function CustomersPage() {
  const ctx = await requireContext("clientes");
  const partners = await listPartners(ctx.company.id, "customers");
  const writable = canWrite(ctx, "clientes");

  return (
    <PartnerList
      partners={partners}
      basePath="/dashboard/clientes"
      writable={writable}
      title="Clientes"
      subtitle="A quién le facturas y con quién registras las ventas."
      newLabel="Nuevo cliente"
      emptyTitle="Aún no registras clientes."
      emptyBody="Agrega clientes para asociarlos a las ventas."
    />
  );
}
