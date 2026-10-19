import Link from "next/link";
import { redirect } from "next/navigation";

import { createPartner } from "@/app/actions/partners";
import { PartnerForm } from "@/components/partner-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listSalespeople } from "@/lib/catalogs";
import { canAccess } from "@/lib/permissions";

export default async function NewCustomerPage() {
  const ctx = await requireContext("clientes");
  if (!canWrite(ctx, "clientes")) {
    redirect("/facturas/clientes");
  }

  const salespeople = await listSalespeople(ctx.company.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/facturas/clientes"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nuevo cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">A quién le facturas.</p>
      </div>

      <PartnerForm
        action={createPartner}
        defaultType="CUSTOMER"
        redirectTo="/facturas/clientes"
        salespeople={salespeople}
        canManageSalespeople={canAccess(ctx.role, "catalogos")}
      />
    </div>
  );
}
