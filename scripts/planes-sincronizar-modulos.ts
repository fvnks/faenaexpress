import "dotenv/config";
import { db } from "../src/lib/db";
import { ORG_MODULES } from "../src/lib/org-modules";

/**
 * Una vez por entorno: agrega al catálogo de TODOS los planes los módulos que
 * hoy existen (Facturas, Colegios, POS y Obras incluidos). No quita nada: solo
 * rellena lo que faltaba en planes creados antes de que existieran esos módulos.
 */
async function main() {
  const codigos = ORG_MODULES.map((m) => m.code);
  console.log("Módulos vigentes:", codigos.join(", "));
  const planes = await db.plan.findMany({ select: { id: true, code: true, modules: true } });
  for (const plan of planes) {
    const faltan = codigos.filter((c) => !plan.modules.includes(c));
    if (faltan.length === 0) {
      console.log(`${plan.code}: al día`);
      continue;
    }
    await db.plan.update({
      where: { id: plan.id },
      data: { modules: { push: faltan } },
    });
    console.log(`${plan.code}: agregados ${faltan.join(", ")}`);
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
