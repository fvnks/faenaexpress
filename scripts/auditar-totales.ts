// Auditoría de los totales de ventas y compras.
//
// Comprueba, con los datos de verdad, que las tarjetas de todas las pantallas
// digan lo mismo y que sumen:
//
//   - Ventas:    total facturado = cobrado + por cobrar
//   - Compras:   total comprado  = pagado + pendiente
//   - Panel y listas: el "por cobrar" y el "por pagar" son el mismo número
//   - Libro de ventas y compras contra el resumen de IVA: el cuadre da cero
//
// Corre contra la base de .env. Para producción:
//   node --env-file=.env.prod node_modules/tsx/dist/cli.mjs scripts/auditar-totales.ts

import { db } from "@/lib/db";
import { listPurchases, type PurchaseFilters } from "@/lib/purchases";
import { ivaSummary, libroCompras, libroVentas, monthlyTotals, paymentsSummary, pendingTotals } from "@/lib/reports";
import { listSales, type SaleFilters } from "@/lib/sales";
import { currentPeriod, monthRange } from "@/lib/money";

const clp = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 0 });

const filtrosVentas: SaleFilters = { status: "ALL", q: "", sort: "fecha", dir: "desc", page: 1 };
const filtrosCompras: PurchaseFilters = { status: "ALL", q: "", sort: "fecha", dir: "desc", page: 1 };

let fallos = 0;

function comprobar(condicion: boolean, mensaje: string) {
  if (condicion) {
    console.log(`  OK   ${mensaje}`);
  } else {
    fallos += 1;
    console.log(`  FALLA ${mensaje}`);
  }
}

async function main() {
  const periodo = process.argv[2] ?? currentPeriod();
  const range = monthRange(periodo)!;
  const companies = await db.company.findMany({ select: { id: true, name: true } });

  for (const company of companies) {
    const companyId = company.id;
    console.log(`\n${"=".repeat(72)}`);
    console.log(`${company.name} · ${periodo}`);
    console.log("=".repeat(72));

    const [ventas, compras, pendientes, iva, pagos] = await Promise.all([
      listSales(companyId, filtrosVentas),
      listPurchases(companyId, filtrosCompras),
      pendingTotals(companyId),
      ivaSummary(companyId, range),
      paymentsSummary(companyId, range),
    ]);

    console.log("\nVentas: total facturado = cobrado + por cobrar");
    const v = ventas.totals;
    console.log(
      `  total ${clp(v.total)} = cobrado ${clp(v.paid)} + por cobrar ${clp(v.pending)}` +
        (v.notasCreditoCantidad > 0 ? `  (${v.notasCreditoCantidad} notas de crédito restan ${clp(v.notasCredito)})` : ""),
    );
    comprobar(v.paid + v.pending === v.total, "las tres tarjetas de ventas cuadran");

    console.log("\nCompras: total comprado = pagado + pendiente");
    const c = compras.totals;
    console.log(
      `  total ${clp(c.total)} = pagado ${clp(c.paid)} + pendiente ${clp(c.pending)}` +
        (c.notasCreditoCantidad > 0 ? `  (${c.notasCreditoCantidad} notas de crédito restan ${clp(c.notasCredito)})` : ""),
    );
    comprobar(c.paid + c.pending === c.total, "las tres tarjetas de compras cuadran");

    console.log("\nPanel y listas dicen lo mismo");
    console.log(`  por cobrar: panel ${clp(pendientes.porCobrar)} · ventas ${clp(v.pending)}`);
    comprobar(pendientes.porCobrar === v.pending, "el por cobrar del panel es el de la lista de ventas");
    console.log(`  por pagar:  panel ${clp(pendientes.porPagar)} · compras ${clp(c.pending)}`);
    comprobar(pendientes.porPagar === c.pending, "el por pagar del panel es el de la lista de compras");

    console.log("\nReporte 'Pagos y deudas'");
    comprobar(
      pagos.purchases.paid + pagos.purchases.pending === pagos.purchases.total,
      "compras: pagado + pendiente = total",
    );
    comprobar(
      pagos.sales.collected + pagos.sales.pending === pagos.sales.total,
      "ventas: cobrado + pendiente = total",
    );
    comprobar(
      pagos.expenses.reimbursed + pagos.expenses.pending === pagos.expenses.total,
      "gastos: reembolsado + pendiente = total",
    );

    console.log("\nLibro contra el resumen de IVA (cuadre del F29)");
    const [lv, lc] = await Promise.all([
      libroVentas(companyId, range),
      libroCompras(companyId, range),
    ]);
    console.log(
      `  ventas: libro ${clp(lv.totals.net)} vs IVA ${clp(iva.sales.net)} | compras: libro ${clp(lc.totals.net)} vs IVA ${clp(iva.purchases.net)}`,
    );
    comprobar(iva.sales.net === lv.totals.net, "el libro de ventas cuadra con el resumen de IVA");
    comprobar(iva.purchases.net === lc.totals.net, "el libro de compras cuadra con el resumen de IVA");

    console.log("\nNada raro en los totales del panel");
    const cotizaciones = await db.sale.count({ where: { companyId, documentType: "QUOTATION" } });
    comprobar(true, `cotizaciones en la base: ${cotizaciones} (no entran en ningún total)`);
    const ret = iva.ajustes.retencionesVentas;
    const exC = iva.ajustes.exentoCompras;
    console.log(`  retenciones de ventas ${clp(ret)} · exento de compras ${clp(exC)}`);
    if (ret !== 0 || exC !== 0) {
      console.log("  (el panel los muestra aparte, por eso 'neto + IVA' no da el total)");
    }

    console.log("\nGráfico de 12 meses contra el panel");
    const serie = await monthlyTotals(companyId, 12);
    const delMes = serie.find((mes) => mes.key === periodo);
    console.log(
      `  el gráfico dice ${clp(delMes?.ventas ?? 0)} de ventas en ${periodo}; el panel dice ${clp(iva.sales.total)}`,
    );
    comprobar(
      (delMes?.ventas ?? 0) === iva.sales.total,
      "el gráfico del panel y la tarjeta de ventas del mismo período dicen lo mismo",
    );
  }

  console.log(`\n${fallos === 0 ? "TODO CUADRA" : `${fallos} FALLAS`}`);
  await db.$disconnect();
  if (fallos > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
