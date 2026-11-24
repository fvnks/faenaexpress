import "dotenv/config";
import { db } from "../src/lib/db";

/** Agrega "obras" al catálogo de módulos de todos los planes, una vez por entorno. */
async function main() {
  const planes = await db.plan.findMany({ select: { id: true, code: true, modules: true } });
  for (const plan of planes) {
    if (plan.modules.includes("obras")) {
      console.log(`${plan.code}: ya lo tiene`);
      continue;
    }
    await db.plan.update({
      where: { id: plan.id },
      data: { modules: { push: "obras" } },
    });
    console.log(`${plan.code}: obras agregado`);
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
