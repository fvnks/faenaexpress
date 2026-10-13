import Link from "next/link";

import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardClass } from "@/lib/ui";
import { RatesEditor, type RateRow } from "../commission-actions";
import { CommissionNav } from "../commission-shell";

const RULES = [
  {
    key: "INVOICE",
    label: "Facturas del mes",
    body: "Cobra por todas las facturas emitidas en el mes, con guía o sin ella. Es la opción por defecto y la más común para vendedores de escritorio.",
  },
  {
    key: "GUIDE",
    label: "Solo las que llevan guía",
    body: "Cobra solo las facturas que traen guía de despacho. Útil cuando la comisión depende de que el pedido efectivamente salga del local. Las facturas sin guía quedan fuera del cómputo.",
  },
] as const;

export default async function SalespeoplePage() {
  const ctx = await requireContext("comisiones");
  const canEdit = canWrite(ctx, "comisiones");

  const people = await db.salesperson.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const rows: RateRow[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    active: person.active,
    ratePercent: (person.commissionRate / 100).toLocaleString("es-CL", {
      maximumFractionDigits: 2,
    }),
    rule: person.commissionRule,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendedores y reglas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El porcentaje de cada vendedor y qué documentos entran en su comisión. Se aplica
          sobre el neto emitido, sin IVA.
        </p>
      </div>

      <CommissionNav active="/dashboard/comisiones/vendedores" />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Las tasas no dependen del período: se aplican desde hoy y hacia adelante.
        </p>
        <span className="text-sm text-muted-foreground">{people.length} vendedor(es)</span>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Cómo se calcula</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="w-fit rounded border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              Base
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              El neto de cada documento, sin IVA. Una nota de crédito resta de la base,
              así que una anulación también resta comisión.
            </p>
          </div>
          <div>
            <span className="w-fit rounded border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              Tasa
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              Un porcentaje por vendedor, fijo, con hasta dos decimales. Se guarda como
              centésimas: escribir 2,5 significa 2,50%.
            </p>
          </div>
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Regla por vendedor</h2>
        <div className="mt-3 flex flex-col gap-3">
          {RULES.map((rule) => (
            <div
              key={rule.key}
              className="border-t border-border pt-3 first:border-0 first:pt-0"
            >
              <span className="w-fit rounded border border-border px-1.5 py-0.5 text-xs font-medium">
                {rule.label}
              </span>
              <p className="mt-1 text-sm text-muted-foreground">{rule.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Una asignación manual siempre comisiona, pase lo que pase con la regla. La regla
          solo gobierna lo que entra solo por fecha.
        </p>
      </section>

      {canEdit ? (
        <RatesEditor rows={rows} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Puedes consultar las tasas, pero solo administración o contabilidad las cambian.
          Para crear o dar de baja vendedores, ve a{" "}
          <Link
            href="/dashboard/catalogos"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Catálogos
          </Link>
          .
        </p>
      )}
    </div>
  );
}
