import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireContext("inventario");
  const [stocks, products] = await Promise.all([
    db.productStock.groupBy({
      by: ["productId"],
      where: { companyId: ctx.company.id },
      _sum: { quantity: true },
    }),
    db.product.findMany({
      where: {
        companyId: ctx.company.id,
        active: true,
        tracksStock: true,
        OR: [{ reorderPoint: { not: null } }, { minStock: { not: null } }],
      },
      orderBy: { name: "asc" },
      select: {
        id: true, sku: true, name: true,
        reorderPoint: true, minStock: true, reorderQty: true, leadTimeDays: true,
        supplier: { select: { name: true } },
      },
    }),
  ]);

  const total = new Map(stocks.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));
  const filas = products
    .map((p) => {
      const umbral = Number(p.reorderPoint ?? p.minStock ?? 0);
      const hay = total.get(p.id) ?? 0;
      const sugerido = p.reorderQty ? Number(p.reorderQty) : Math.max(1, Math.round(umbral * 2 - hay));
      return { p, umbral, hay, sugerido };
    })
    .filter((f) => f.hay <= f.umbral);

  const csv = [
    ["sku", "producto", "proveedor", "stock", "punto_reorden", "reponer", "plazo_dias"].join(";"),
    ...filas.map((f) =>
      [f.p.sku, f.p.name, f.p.supplier?.name ?? "", f.hay.toFixed(3), f.umbral.toFixed(3), String(f.sugerido), String(f.p.leadTimeDays ?? "")].join(";"),
    ),
  ].join("\n");

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reposicion.csv"',
    },
  });
}
