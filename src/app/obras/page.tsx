import Link from "next/link";

import { requireObraContext } from "@/lib/obra-auth";
import { obraRoleLabel, obraStatusLabel } from "@/lib/obra-permissions";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export default async function ObrasHomePage() {
  const ctx = await requireObraContext("panel");
  const { obra } = ctx;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Índice / 01 — Obra activa
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {obraStatusLabel(obra.status)} · {obraRoleLabel(ctx.role)} en esta obra
          {obra.mandante ? ` · Mandante: ${obra.mandante}` : ""}
        </p>
      </div>

      <div className={`${cardClass} p-6`}>
        <h2 className="font-semibold">Módulo Obras — Fase 0</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          La obra ya está creada y aislada por permisos. Las siguientes fases agregan el presupuesto
          por partidas, el costo real derivado de compras y gastos, el avance físico y los estados
          de pago.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/obras" className={secondaryButtonClass}>
            Administrar obras
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Avance físico", value: "—" },
          { label: "Obligado", value: "—" },
          { label: "Costo real", value: "—" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
