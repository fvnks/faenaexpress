import Link from "next/link";
import { redirect } from "next/navigation";

import { createPartner } from "@/app/actions/partners";
import { PartnerForm } from "@/components/partner-form";
import { canWrite, requireContext } from "@/lib/auth";

export default async function NewSupplierPage() {
  const ctx = await requireContext("proveedores");
  if (!canWrite(ctx, "proveedores")) {
    redirect("/dashboard/proveedores");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/proveedores"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Proveedores
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nuevo proveedor</h1>
        <p className="mt-1 text-sm text-muted-foreground">A quién le compras.</p>
      </div>

      <PartnerForm action={createPartner} defaultType="SUPPLIER" redirectTo="/dashboard/proveedores" />
    </div>
  );
}
