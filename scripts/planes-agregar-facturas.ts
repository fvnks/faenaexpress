// Agrega "facturas" al catálogo de módulos de todos los planes existentes.
//
// Contexto: Facturas pasó de núcleo a módulo contratable. Los planes creados
// antes del cambio no la listan (era núcleo, no se listaba), así que si un
// operador vuelve a guardar un plan, `syncPlanModules` la deshabilitaría para
// las cuentas que lo tienen. Este script deja los planes como estaban: con
// Facturas incluida.
//
// Correr una vez por entorno después del deploy:
//   node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/planes-agregar-facturas.ts
//   node --env-file=.env.prod node_modules/tsx/dist/cli.mjs scripts/planes-agregar-facturas.ts
import "dotenv/config";

import { db } from "@/lib/db";

async function main() {
  const planes = await db.plan.findMany({ select: { id: true, code: true, modules: true } });
  let tocados = 0;

  for (const plan of planes) {
    if (plan.modules.includes("facturas")) continue;
    await db.plan.update({
      where: { id: plan.id },
      data: { modules: { push: "facturas" } },
    });
    tocados += 1;
    console.log(`Plan «${plan.code}»: facturas agregada.`);
  }

  console.log(`${planes.length} plan(es) revisados, ${tocados} actualizado(s).`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
