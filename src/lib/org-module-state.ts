// Estado de los módulos de una organización: qué tiene habilitado y qué no.
//
// La resolución tiene tres capas, en este orden:
//
//   1. Lo que el OPERADOR habilitó a mano (fila `source = "manual"`): manda.
//      Un módulo vendido suelto sobrevive a un cambio de plan.
//   2. Lo que trae el PLAN contratado: la fila `source = "plan"` refleja el
//      catálogo, y el plan manda sobre el defecto.
//   3. El defecto: habilitado. La maqueta no bloquea a nadie, así que una
//      cuenta recién creada no se queda sin nada por un olvido de backfill.
//
// El corte real (que no se vea un módulo por URL) está en `requireContext`, que
// es el único lugar por donde pasan todas las páginas.

import { db } from "@/lib/db";
import { ALL_ORG_MODULES, findOrgModule, moduleForSection, ORG_MODULES, type OrgModule } from "@/lib/org-modules";
import type { Section } from "@/lib/permissions";

/** Estado de un módulo para una organización. */
export type ModuleState = {
  module: OrgModule;
  enabled: boolean;
  /** De dónde salió: "plan", "manual" o "defecto" (sin fila). */
  source: string;
};

/** Todos los módulos con su estado para la organización indicada. */
export async function organizationModuleStates(organizationId: string | null): Promise<ModuleState[]> {
  if (!organizationId) {
    return ALL_ORG_MODULES.map((module) => ({ module, enabled: true, source: "defecto" }));
  }

  const [rows, subscription] = await Promise.all([
    db.organizationModule.findMany({ where: { organizationId } }),
    db.subscription.findUnique({
      where: { organizationId },
      select: { plan: { select: { modules: true } } },
    }),
  ]);

  const byCode = new Map(rows.map((r) => [r.moduleCode, r]));
  const delPlan = new Set(subscription?.plan.modules ?? []);
  const ahora = new Date();

  return ALL_ORG_MODULES.map((module) => {
    const row = byCode.get(module.code);

    // 1. Lo manual manda.
    if (row?.source === "manual") {
      const vigente = row.enabledTo === null || row.enabledTo > ahora;
      return { module, enabled: row.enabled && vigente, source: "manual" };
    }

    // 2. El plan contracted manda sobre el defecto.
    if (delPlan.has(module.code)) {
      return { module, enabled: true, source: "plan" };
    }

    // 3. Fila del plan que dice que no (o defecto).
    if (row?.source === "plan") {
      const vigente = row.enabledTo === null || row.enabledTo > ahora;
      return { module, enabled: row.enabled && vigente, source: "plan" };
    }

    return { module, enabled: true, source: "defecto" };
  });
}

/** Códigos de los módulos habilitados para la organización. */
export async function enabledModuleCodes(organizationId: string | null): Promise<string[]> {
  const states = await organizationModuleStates(organizationId);
  return states.filter((s) => s.enabled).map((s) => s.module.code);
}

/**
 * ¿La sección está habilitada para esta organización?
 *
 * Sin organización (instalación suelta) todo está habilitado. Una sección del
 * núcleo siempre. Las demás, según el módulo que las agrupa.
 */
export async function isSectionEnabled(
  organizationId: string | null,
  section: Section,
): Promise<boolean> {
  const modulo = moduleForSection(section);
  if (!modulo) return true;
  if (modulo.core) return true;
  if (!organizationId) return true;

  const states = await organizationModuleStates(organizationId);
  const state = states.find((s) => s.module.code === modulo.code);
  return state?.enabled ?? true;
}

/**
 * Módulos deshabilitados para la organización. Es lo que la UI usa para
 * esconder los ítems del menú: en vez de calcularlo en cada render, se resuelve
 * una vez y se pasa al sidebar.
 */
export async function disabledModuleCodes(organizationId: string | null): Promise<string[]> {
  const states = await organizationModuleStates(organizationId);
  return states.filter((s) => !s.enabled).map((s) => s.module.code);
}

/** Habilita o deshabilita un módulo para una organización (idempotente). */
export async function setOrganizationModule(
  organizationId: string,
  moduleCode: string,
  enabled: boolean,
  source = "manual",
): Promise<void> {
  const modulo = findOrgModule(moduleCode);
  if (!modulo) throw new Error(`Módulo desconocido: ${moduleCode}`);
  if (modulo.core) throw new Error("El núcleo no se puede deshabilitar.");

  const now = new Date();
  const existing = await db.organizationModule.findUnique({
    where: { organizationId_moduleCode: { organizationId, moduleCode } },
  });

  if (existing) {
    await db.organizationModule.update({
      where: { id: existing.id },
      data: {
        enabled,
        // Al habilitar se abre la ventana; al deshabilitar se cierra. Así el
        // historial queda: «estuvo habilitado entre X e Y».
        enabledFrom: enabled ? now : existing.enabledFrom,
        enabledTo: enabled ? null : now,
        source,
      },
    });
    return;
  }

  await db.organizationModule.create({
    data: {
      organizationId,
      moduleCode,
      enabled,
      enabledFrom: now,
      enabledTo: enabled ? null : now,
      source,
    },
  });
}

/**
 * Refleja en la organización los módulos que trae el plan.
 *
 * La lista del plan es **autoritativa** para los módulos que administra: si un
 * módulo no está en el plan, queda DESHABILITADO para esa cuenta. Por eso se
 * escribe una fila `source = "plan"` para cada módulo contratable, también
 * para los que no están (con `enabled: false`): si no, el defecto
 * («habilitado») los dejaría activos y un cliente pagaría por un plan que no
 * los incluye.
 *
 * Lo que el operador habilitó a mano (un módulo vendido suelto) **no se pisa
 * nunca**: esas filas son `source = "manual"` y mandan sobre el plan.
 */
export async function syncPlanModules(
  organizationId: string,
  planModules: string[],
): Promise<void> {
  const delPlan = new Set(planModules);
  const ahora = new Date();

  const existentes = await db.organizationModule.findMany({
    where: { organizationId, source: "plan" },
  });
  const porCodigo = new Map(existentes.map((r) => [r.moduleCode, r]));

  // Todos los módulos contratables, no solo los del plan: la lista del plan
  // tiene que ser la que manda.
  for (const modulo of ORG_MODULES) {
    const row = porCodigo.get(modulo.code);
    const debeEstar = delPlan.has(modulo.code);

    if (!row) {
      await db.organizationModule.create({
        data: {
          organizationId,
          moduleCode: modulo.code,
          enabled: debeEstar,
          enabledFrom: ahora,
          enabledTo: debeEstar ? null : ahora,
          source: "plan",
        },
      });
      continue;
    }

    if (debeEstar && !row.enabled) {
      await db.organizationModule.update({
        where: { id: row.id },
        data: { enabled: true, enabledFrom: ahora, enabledTo: null },
      });
    } else if (!debeEstar && row.enabled) {
      await db.organizationModule.update({
        where: { id: row.id },
        data: { enabled: false, enabledTo: ahora },
      });
    }
  }
}
