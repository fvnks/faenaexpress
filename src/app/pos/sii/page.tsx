import Link from "next/link";

import { PosSiiConfigForm } from "@/app/pos/sii/config-form";
import { PosSiiCafForm } from "@/app/pos/sii/caf-form";
import { DteErrorReenvio } from "@/app/pos/sii/dte-error-reenvio";
import { requireContext } from "@/lib/auth";
import { getPosSiiConfigForUI } from "@/app/actions/pos-sii-caf";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

type DteEnError = {
  id: string;
  tipoDte: number;
  folio: number;
  estado: string;
  trackId: string | null;
  createdAt: Date;
};

export default async function PosSiiPage() {
  const ctx = await requireContext();
  const config = await getPosSiiConfigForUI(ctx.company.id);
  const siiEnvironment =
    process.env.SII_ENVIRONMENT === "produccion" ? "produccion" : "pruebas";

  // DTEs en error para reenvío masivo.
  const { db } = await import("@/lib/db");
  const dtesEnError = await db.posDte.findMany({
    where: {
      companyId: ctx.company.id,
      estado: { in: ["ERROR_ENVIO", "RECHAZADO"] },
    },
    orderBy: { createdAt: "desc" },
  });

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
          <PosSiiConfigForm config={config} siiEnvironment={siiEnvironment} />
        </section>

        <section className={cardClass + " p-5"}>
          <PosSiiCafForm config={config} />
        </section>
      </div>

      {dtesEnError.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <DteErrorReenvio dtesEnError={dtesEnError as DteEnError[]} />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al POS
        </Link>
      </div>
    </div>
  );
}
