import Link from "next/link";
import type { PlatformInvoiceStatus } from "@/generated/prisma/client";

import { formatCLP } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { db } from "@/lib/db";
import { cardClass, controlClass, secondaryButtonClass } from "@/lib/ui";
import { ConfirmarPagoForm, JobsFacturacionForm } from "./payment-form";

const ESTADOS: PlatformInvoiceStatus[] = ["DRAFT", "PENDING", "PARTIAL", "PAID", "OVERDUE", "VOID"];
const una = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminFacturacionPage(props: PageProps<"/admin/facturacion">) {
  const ctx = await requirePlatformStaff("SUPPORT");
  const puedeEditar = ctx.staff.level !== "SUPPORT";
  const sp = await props.searchParams;
  const q = una(sp.q).trim();
  const estadoRaw = una(sp.estado);
  const periodo = una(sp.periodo).trim();
  const estado = ESTADOS.includes(estadoRaw as PlatformInvoiceStatus) ? (estadoRaw as PlatformInvoiceStatus) : undefined;

  const [facturas, pendientes, vencidas, cobrado] = await Promise.all([
    db.platformInvoice.findMany({
      where: {
        ...(estado ? { status: estado } : {}),
        ...(periodo ? { period: periodo } : {}),
        ...(q ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { organization: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
    }),
    db.platformInvoice.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { totalCLP: true },
    }),
    db.platformInvoice.count({ where: { status: "OVERDUE" } }),
    db.platformInvoice.aggregate({
      where: { status: "PAID" },
      _sum: { totalCLP: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / Comercial</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Facturación SaaS</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Facturas de las cuentas, cobros y vencimientos. Las acciones de pago del cliente viven en /billing; aquí se opera desde la consola.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Por cobrar", value: formatCLP(pendientes._sum.totalCLP ?? 0) },
          { label: "Vencidas", value: String(vencidas) },
          { label: "Cobrado", value: formatCLP(cobrado._sum.totalCLP ?? 0) },
          { label: "Facturas listadas", value: String(facturas.length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {puedeEditar ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Mantenimiento</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            Genera las facturas del mes según las suscripciones activas y marca como vencidas las que pasaron su fecha.
          </p>
          <JobsFacturacionForm />
        </section>
      ) : null}

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-card border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Buscar
          <input name="q" defaultValue={q} placeholder="Factura o cuenta…" className={controlClass + " w-52"} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Estado
          <select name="estado" defaultValue={estado ?? ""} className={controlClass + " w-40"}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Período
          <input name="periodo" defaultValue={periodo} placeholder="YYYY-MM" className={controlClass + " w-32"} />
        </label>
        <button type="submit" className={secondaryButtonClass}>Filtrar</button>
      </form>

      <section className={`${cardClass} overflow-x-auto`}>
        {facturas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay facturas con esos filtros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {facturas.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-primary">{f.number} · {f.period}</p>
                    <p className="font-medium">
                      <Link href={`/admin/organizaciones/${f.organizationId}`} className="hover:underline">
                        {f.organization.name}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {f.dueAt.toLocaleDateString("es-CL")} · {f._count.payments} pago(s)
                      {f.paidAt ? ` · pagada el ${f.paidAt.toLocaleDateString("es-CL")}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-semibold">{formatCLP(f.totalCLP)}</p>
                    <span className={`text-xs font-medium ${f.status === "PAID" ? "text-success" : f.status === "OVERDUE" ? "text-danger" : "text-muted-foreground"}`}>
                      {f.status}
                    </span>
                  </div>
                </div>
                {puedeEditar && !["PAID", "VOID"].includes(f.status) ? (
                  <ConfirmarPagoForm invoiceId={f.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
