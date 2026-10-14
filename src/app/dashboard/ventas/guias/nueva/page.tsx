import Link from "next/link";
import { redirect } from "next/navigation";

import { requireContext, canWrite } from "@/lib/auth";
import { listCustomers } from "@/lib/partners";
import { listSalespeople } from "@/lib/catalogs";
import { todayISO } from "@/lib/money";
import { cardClass } from "@/lib/ui";
import { GuiaForm } from "./guia-form";

export default async function NuevaGuiaPage() {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/dashboard/ventas/guias");

  const [customers, salespeople] = await Promise.all([
    listCustomers(ctx.company.id),
    listSalespeople(ctx.company.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/ventas/guias"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Guías de Despacho
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nueva guía de despacho</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra una guía de despacho electrónica pendiente de factura.
        </p>
      </div>

      <GuiaForm customers={customers} salespeople={salespeople} today={todayISO()} />
    </div>
  );
}
