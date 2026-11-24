import { getActiveMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDefaultWarehouse } from "@/lib/inventory";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";
import { ConsumirForm, TraspasarForm } from "./acciones";

export default async function ObraBodegaPage() {
  const ctx = await requireObraContext("bodega");
  const writable = obraCanWrite(ctx, "bodega");
  const active = await getActiveMembership();
  const companyId = active?.company.id ?? "";

  const [bodega, movimientos, partidas, productosCentral] = await Promise.all([
    db.bodegaObra.findMany({
      where: { obraId: ctx.obra.id },
      orderBy: { product: { name: "asc" } },
      select: { id: true, cantidad: true, product: { select: { name: true, sku: true } } },
    }),
    db.movimientoBodegaObra.findMany({
      where: { bodegaObra: { obraId: ctx.obra.id } },
      orderBy: { fecha: "desc" },
      take: 30,
      select: {
        id: true, tipo: true, cantidad: true, fecha: true,
        partida: { select: { codigo: true, descripcion: true } },
        createdBy: { select: { name: true } },
      },
    }),
    db.partida.findMany({
      where: { obraId: ctx.obra.id, estado: "VIGENTE", cantidad: { gt: 0 } },
      select: { id: true, codigo: true, descripcion: true },
      orderBy: { orden: "asc" },
    }),
    (async () => {
      const wh = await getOrCreateDefaultWarehouse(companyId);
      if (!wh) return [];
      const stocks = await db.productStock.findMany({
        where: { companyId, warehouseId: wh.id, quantity: { gt: 0 } },
        include: { product: { select: { id: true, name: true, sku: true, active: true } } },
        orderBy: { product: { name: "asc" } },
      });
      return stocks
        .filter((s) => s.product.active)
        .map((s) => ({
          id: s.product.id,
          name: s.product.name,
          sku: s.product.sku,
          stockCentral: Number(s.quantity),
        }));
    })(),
  ]);

  const totalUnidades = bodega.reduce((s, b) => s + b.cantidad, 0);
  const fmt = (v: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(v);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 06 — Bodega</p>
        <h1 className="text-2xl font-bold tracking-tight">Bodega de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stock en la obra, traspasado desde la bodega central de Facturas.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Productos en obra", value: String(bodega.length) },
          { label: "Unidades en obra", value: fmt(totalUnidades) },
          { label: "Movimientos", value: String(movimientos.length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable && productosCentral.length > 0 ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Traspasar desde bodega central</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Genera un movimiento TRANSFER real en el kardex de Facturas.</p>
          <TraspasarForm productos={productosCentral} />
        </section>
      ) : null}

      {writable && bodega.length > 0 ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Registrar consumo</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Descuenta de la bodega de la obra y puede imputarse a una partida.</p>
          <ConsumirForm bodega={bodega} partidas={partidas} />
        </section>
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Stock en la obra</h2>
        </div>
        {bodega.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay stock en esta obra todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Producto</th><th className="px-3 py-2 text-right">Cantidad</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bodega.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2"><span className="font-mono text-xs text-subtle">{b.product.sku}</span> {b.product.name}</td>
                  <td className="px-3 py-2 text-right tabular font-medium">{fmt(b.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {movimientos.length > 0 ? (
        <section className={`${cardClass} overflow-x-auto`}>
          <div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Últimos movimientos</h2></div>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-right">Cantidad</th><th className="px-3 py-2 text-left">Partida</th><th className="px-3 py-2 text-left">Usuario</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(m.fecha).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2"><span className={m.tipo === "IN" ? "text-success" : "text-danger"}>{m.tipo}</span></td>
                  <td className="px-3 py-2 text-right tabular">{fmt(m.cantidad)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.partida ? `${m.partida.codigo} · ${m.partida.descripcion}` : "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
