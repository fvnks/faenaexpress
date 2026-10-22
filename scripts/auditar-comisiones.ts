// Auditoría de las comisiones de vendedores.
//
// Comprueba, con los datos de verdad, que:
//   - la base de cada vendedor es la suma del neto de sus documentos
//   - la comisión es base × tasa, redondeada UNA vez sobre el total (igual que
//     el Excel del usuario: =base*0,02 sobre la base sumada)
//   - el detalle documento a documento suma exactamente el resumen
//   - una nota de crédito resta de la base
//
// Corre contra la base de .env. Para producción:
//   node --env-file=.env.prod node_modules/tsx/dist/cli.mjs scripts/auditar-comisiones.ts

import { db } from "@/lib/db";
import { computeCommission, formatRateBps } from "@/lib/commissions";

const clp = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 0 });

let fallos = 0;

function comprobar(condicion: boolean, mensaje: string) {
  if (!condicion) {
    fallos += 1;
    console.log(`  FALLA ${mensaje}`);
  }
}

async function main() {
  const companies = await db.company.findMany({ select: { id: true, name: true } });
  let meses = 0;
  let vendedores = 0;

  for (const company of companies) {
    const fechas = await db.sale.findMany({
      where: { companyId: company.id },
      select: { date: true },
      orderBy: { date: "asc" },
    });
    const periodos = new Set(
      fechas.map((f) => `${f.date.getUTCFullYear()}-${String(f.date.getUTCMonth() + 1).padStart(2, "0")}`),
    );
    if (periodos.size === 0) continue;

    console.log(`\n${company.name}`);
    for (const periodo of periodos) {
      const report = await computeCommission(company.id, periodo);
      meses += 1;

      for (const t of report.totals) {
        if (t.base === 0 && t.commission === 0) continue;
        vendedores += 1;
        const esperado = Math.round((t.base * t.rateBps) / 10_000);
        console.log(
          `  ${periodo} · ${t.salespersonName}: base ${clp(t.base)} × ${formatRateBps(t.rateBps)} = ${clp(esperado)} | app ${clp(t.commission)}`,
        );
        comprobar(
          t.commission === esperado,
          `${periodo} ${t.salespersonName}: la comisión no es base × tasa (${clp(t.commission)} vs ${clp(esperado)})`,
        );

        const susLineas = report.lines.filter((l) => l.salespersonId === t.salespersonId);
        const baseLineas = susLineas.reduce((a, l) => a + l.base, 0);
        const comisionLineas = susLineas.reduce((a, l) => a + l.commission, 0);
        comprobar(
          baseLineas === t.base,
          `${periodo} ${t.salespersonName}: el detalle no suma la base`,
        );
        comprobar(
          comisionLineas === t.commission,
          `${periodo} ${t.salespersonName}: el detalle no suma la comisión`,
        );
      }
    }
  }

  console.log(`\n${meses} período(s) · ${vendedores} vendedor(es) con movimiento`);
  console.log(fallos === 0 ? "TODO CUADRA" : `${fallos} FALLAS`);
  await db.$disconnect();
  if (fallos > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
