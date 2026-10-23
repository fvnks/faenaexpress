#!/usr/bin/env tsx

// Job programado para ejecutar tareas de facturación SaaS:
// - Generar facturas mensuales
// - Marcar facturas vencidas (morosidad)
// - Actualizar estado de suscripciones
//
// Se ejecuta via cron: 0 6 1 * * (día 1 de cada mes a las 06:00)

import { generateMonthlyInvoices, runOverdueJob } from "@/lib/saas-billing/invoice-generation";
import { db } from "@/lib/db";

async function main() {
  console.log("=== Iniciando job de facturación SaaS ===");
  const inicio = Date.now();

  try {
    // 1. Generar facturas mensuales
    console.log("Generando facturas mensuales...");
    const facturas = await generateMonthlyInvoices();
    console.log(`  Facturas creadas: ${facturas.created}`);
    if (facturas.errors.length > 0) {
      console.error("  Errores:", facturas.errors);
    }

    // 2. Job de morosidad (se puede correr diario)
    console.log("Ejecutando job de morosidad...");
    const morosidad = await runOverdueJob();
    console.log(`  Facturas marcadas como vencidas: ${morosidad.updated}`);
    console.log(`  Suscripciones pasadas a PAST_DUE: ${morosidad.notifications}`);

    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
    console.log(`=== Job completado en ${duracion}s ===`);

    // Log en BD para auditoría (usamos la primera company de la org si existe)
    const primeraOrg = await db.organization.findFirst({
      select: {
        id: true,
        companies: { select: { id: true }, take: 1 },
      },
    });
    const companyId = primeraOrg?.companies[0]?.id ?? primeraOrg?.id ?? "";

    await db.auditLog.create({
      data: {
        companyId,
        userName: "sistema",
        action: "UPDATE",
        entityType: "PlatformInvoice",
        entityId: "saas-billing-job",
        summary: `Job mensual: ${facturas.created} facturas, ${morosidad.updated} vencidas, ${morosidad.notifications} morosas`,
        changes: {
          facturas: facturas.created,
          errores: facturas.errors,
          vencidas: morosidad.updated,
          morosas: morosidad.notifications,
          duracionSegundos: duracion,
        },
      },
    });

  } catch (e) {
    console.error("Error en job de facturación:", e);
    const primeraOrg = await db.organization.findFirst({
      select: {
        id: true,
        companies: { select: { id: true }, take: 1 },
      },
    });
    const companyId = primeraOrg?.companies[0]?.id ?? primeraOrg?.id ?? "";

    await db.auditLog.create({
      data: {
        companyId,
        userName: "sistema",
        action: "UPDATE",
        entityType: "PlatformInvoice",
        entityId: "saas-billing-job",
        summary: `Error en job: ${e instanceof Error ? e.message : String(e)}`,
        changes: { error: e instanceof Error ? e.message : String(e) },
      },
    });
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();