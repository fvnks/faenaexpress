import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updatePartner } from "@/app/actions/partners";
import { PartnerForm, type PartnerForForm } from "@/components/partner-form";
import { canWrite, requireContext } from "@/lib/auth";
import { getPartner } from "@/lib/partners";

export default async function EditSupplierPage(props: PageProps<"/facturas/proveedores/[id]/editar">) {
  const ctx = await requireContext("proveedores");
  if (!canWrite(ctx, "proveedores")) {
    redirect("/facturas/proveedores");
  }

  const { id } = await props.params;
  const partner = await getPartner(ctx.company.id, id);

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
    active: partner.active,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/facturas/proveedores/${partner.id}`}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← {partner.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Editar proveedor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estos datos alimentan la ficha del proveedor y los PDF de compra.
        </p>
      </div>

      <PartnerForm
        action={updatePartner.bind(null, partner.id)}
        defaults={defaults}
        redirectTo={`/facturas/proveedores/${partner.id}`}
      />
    </div>
  );
}
