import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updatePartner } from "@/app/actions/partners";
import { PartnerForm, type PartnerForForm } from "@/components/partner-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listSalespeople } from "@/lib/catalogs";
import { getPartner } from "@/lib/partners";

export default async function EditCustomerPage(props: PageProps<"/dashboard/clientes/[id]">) {
  const ctx = await requireContext("clientes");
  if (!canWrite(ctx, "clientes")) {
    redirect("/dashboard/clientes");
  }

  const { id } = await props.params;
  const partner = await getPartner(ctx.company.id, id);
  const salespeople = await listSalespeople(ctx.company.id);

  if (!partner) {
    notFound();
  }

  const defaults: PartnerForForm = {
    type: partner.type,
    name: partner.name,
    rut: partner.rut ?? "",
    email: partner.email ?? "",
    phone: partner.phone ?? "",
    address: partner.address ?? "",
    notes: partner.notes ?? "",
    salespersonId: partner.salespersonId ?? "",
    active: partner.active,
  };

  const action = updatePartner.bind(null, partner.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/clientes"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Editar cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">{partner.name}</p>
      </div>

      <PartnerForm action={action} defaults={defaults} redirectTo="/dashboard/clientes" salespeople={salespeople} />
    </div>
  );
}
