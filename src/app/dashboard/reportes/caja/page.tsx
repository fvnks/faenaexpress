import { cashFlowProjection } from "@/lib/reports";
import { requireContext } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { cardClass } from "@/lib/ui";
import { ReportNav } from "../report-shell";

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-accent" : "";
  return (
    <div className={cardClass + " p-5"}>
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={"tabular mt-2 text-xl font-bold tracking-tight " + color}>{value}</div>
    </div>
  );
}

export default async function CashFlowPage() {
  const ctx = await requireContext("reportes");
  const flow = await cashFlowProjection(ctx.company.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flujo de caja proyectado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuándo entra y sale dinero en {ctx.company.name}: ventas por cobrar y compras por pagar,
          agrupadas por su fecha de vencimiento.
        </p>
      </div>

      <ReportNav active="/dashboard/reportes/caja" />

      <div className="flex justify-end">
        <a
          href="/dashboard/reportes/caja/export"
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Exportar Excel
        </a>
      </div>

      <section aria-labelledby="caja-kpis">
        <h2 id="caja-kpis" className="text-sm font-semibold text-muted-foreground">
          Totales pendientes
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Por cobrar" value={formatCLP(flow.totalEntradas)} />
          <Kpi label="Por pagar" value={formatCLP(flow.totalSalidas)} />
          <Kpi
            label="Vencido (neto)"
            value={formatCLP(flow.vencidoEntradas - flow.vencidoSalidas)}
            tone={flow.vencidoEntradas - flow.vencidoSalidas >= 0 ? "warning" : "danger"}
          />
          <Kpi
            label="Neto proyectado"
            value={formatCLP(flow.netoProyectado)}
            tone={flow.netoProyectado >= 0 ? "success" : "danger"}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          El neto proyectado suma todo lo pendiente sin fecha límite: entradas menos salidas. Los
          reembolsos a pagadores se revisan en el reporte de pagos.
        </p>
      </section>

      <section className={cardClass + " p-5"} aria-label="Detalle por período">
        <h2 className="font-semibold">Detalle por período</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Documentos sin fecha de vencimiento usan su fecha de emisión para proyectar.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Período</th>
                <th className="px-3 py-2 text-right font-medium">Entra (por cobrar)</th>
                <th className="px-3 py-2 text-right font-medium">Sale (por pagar)</th>
                <th className="px-3 py-2 text-right font-medium">Neto</th>
              </tr>
            </thead>
            <tbody>
              {flow.buckets.map((bucket) => {
                const neto = bucket.entradas - bucket.salidas;
                const vacio = bucket.entradas === 0 && bucket.salidas === 0;
                return (
                  <tr
                    key={bucket.key}
                    className={
                      "border-b border-border last:border-0 " +
                      (bucket.key === "vencido" && !vacio ? "bg-danger-soft/40" : "")
                    }
                  >
                    <td className="px-3 py-2.5 align-top font-medium">
                      {bucket.label}
                      {bucket.key === "vencido" && !vacio ? (
                        <span className="ml-2 inline-flex whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                          requiere atención
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2.5 text-right align-top">
                      {bucket.entradas === 0 ? <span className="text-muted-foreground">—</span> : formatCLP(bucket.entradas)}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2.5 text-right align-top">
                      {bucket.salidas === 0 ? <span className="text-muted-foreground">—</span> : formatCLP(bucket.salidas)}
                    </td>
                    <td className={"tabular whitespace-nowrap px-3 py-2.5 text-right align-top font-semibold " + (neto >= 0 ? "" : "text-danger")}>
                      {formatCLP(neto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
