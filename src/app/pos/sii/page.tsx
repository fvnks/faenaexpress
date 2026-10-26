import Link from "next/link";
import { redirect } from "next/navigation";

import { PosSiiConfigForm } from "@/app/pos/sii/config-form";
import { PosSiiCafForm } from "@/app/pos/sii/caf-form";
import { requireContext } from "@/lib/auth";
import { getPosSiiConfigForUI } from "@/app/actions/pos-sii-caf";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export default async function PosSiiPage() {
  const ctx = await requireContext();
  const config = await getPosSiiConfigForUI(ctx.company.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración SII</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Certificado digital, datos del emisor, CAFs y habilitación de facturación electrónica.
          </p>
        </div>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al POS
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className={cardClass + " p-5"}>
          <PosSiiConfigForm config={config} />
        </section>

        <section className={cardClass + " p-5"}>
          <PosSiiCafForm config={config} />
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al POS
        </Link>
      </div>
    </div>
  );
}