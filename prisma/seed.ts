import "dotenv/config";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@facturas.local";
  const password = process.env.ADMIN_PASSWORD ?? "cambiar-esto-123";

  // Empresa por defecto.
  let company = await db.company.findFirst();
  if (!company) {
    company = await db.company.create({
      data: {
        name: process.env.COMPANY_NAME ?? "Mi Empresa",
        currency: "CLP",
        ivaRate: 19,
      },
    });
    console.log("Empresa creada con IVA 19%.");
  }

  // Usuario administrador.
  const existingUser = await db.user.findUnique({ where: { email } });
  const user =
    existingUser ??
    (await db.user.create({
      data: {
        name: process.env.ADMIN_NAME ?? "Administrador",
        email,
        passwordHash: await hash(password, 12),
      },
    }));

  if (existingUser) {
    console.log(`El usuario ${email} ya existe, no se modifica.`);
  } else {
    console.log(`Usuario administrador creado: ${email}`);
  }

  // El admin es ADMIN de la empresa por defecto.
  await db.membership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: "ADMIN", active: true },
    create: { userId: user.id, companyId: company.id, role: "ADMIN" },
  });

  const areas = ["Administración", "Operaciones", "Ventas", "Finanzas", "TI"];
  for (const name of areas) {
    await db.area.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: { companyId: company.id, name },
    });
  }

  const categories = ["Insumos", "Servicios", "Arrendamiento", "Combustible", "Mantención"];
  for (const name of categories) {
    await db.category.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: { companyId: company.id, name, kind: "EXPENSE" },
    });
  }
  console.log("Áreas y categorías base aseguradas.");

  // Personal de plataforma (acceso a /admin). Va con variable de entorno a
  // propósito: el acceso transversal a TODAS las cuentas no se reparte por
  // defecto. Define PLATFORM_STAFF_EMAIL (y opcionalmente PLATFORM_STAFF_LEVEL)
  // para dejar un dueño de plataforma. El primer OWNER ya se puede agregar solo
  // desde /admin/equipo.
  const staffEmail = process.env.PLATFORM_STAFF_EMAIL;
  // Plan de la maqueta: `Free`, sin topes y con todos los módulos. La pantalla
  // de facturación queda completa desde el día uno, pero no bloquea a nadie.
  // Los números reales entran cuando haya precio; el modelo no cambia.
  const freePlan =
    (await db.plan.findUnique({ where: { code: "free" } })) ??
    (await db.plan.create({
      data: {
        code: "free",
        name: "Free",
        description: "Para empezar: registro de compras, ventas y gastos sin límites.",
        priceCLP: 0,
        period: "MONTHLY",
        maxCompanies: null,
        maxUsers: null,
        maxDocsPerMonth: null,
        // Facturas se contrata (ya no es núcleo): el plan Free la incluye para
        // que las cuentas nuevas no se queden sin el ERP. Sin fila u origen
        // «defecto», lo habilitado por defecto cubre igualmente.
        modules: ["facturas", "rrhh", "inventario", "comisiones", "banco"],
        active: true,
      },
    }));

  // Cada organización tiene una suscripción: sin ella no hay corte que aplicar.
  const organizaciones = await db.organization.findMany({ select: { id: true } });
  for (const org of organizaciones) {
    const existente = await db.subscription.findUnique({
      where: { organizationId: org.id },
    });
    if (!existente) {
      await db.subscription.create({
        data: { organizationId: org.id, planId: freePlan.id, status: "ACTIVE" },
      });
    }
  }
  console.log(
    `Plan «${freePlan.name}» asegurado y ${organizaciones.length} suscripción(es) vigente(s).`,
  );

  if (staffEmail) {
    const staffUser = await db.user.findUnique({ where: { email: staffEmail } });
    if (!staffUser) {
      console.log(`PLATFORM_STAFF_EMAIL=${staffEmail} no corresponde a ningún usuario; se omite.`);
    } else {
      const levelRaw = process.env.PLATFORM_STAFF_LEVEL ?? "OWNER";
      const level = ["SUPPORT", "OPERATOR", "OWNER"].includes(levelRaw)
        ? (levelRaw as "SUPPORT" | "OPERATOR" | "OWNER")
        : "OWNER";
      await db.platformStaff.upsert({
        where: { userId: staffUser.id },
        update: { level, active: true },
        create: { userId: staffUser.id, level },
      });
      console.log(`Personal de plataforma asegurado: ${staffEmail} (${level}).`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
