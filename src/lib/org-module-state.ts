// Estado de los módulos de una organización: qué tiene habilitado y qué no.
//
// La fila en `OrganizationModule` es el estado explícito. Si no hay fila, aplica
// el defecto, que es «habilitado»: la maqueta no bloquea a nadie y así una
// cuenta recién creada no se queda sin nada por un forgets de backfill.
//
// El corte real (que no se vea un módulo por URL) está en `requireContext`, que
// es el único lugar por donde pasan todas las páginas.

import { db } from "@/lib/db";
import { ALL_ORG_MODULES, findOrgModule, moduleForSection, type OrgModule } from "@/lib/org-modules";
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
  const rows = organizationId
    ? await db.organizationModule.findMany({ where: { organizationId } })
    : [];

  const byCode = new Map(rows.map((r) => [r.moduleCode, r]));
  const ahora = new Date();

  return ALL_ORG_MODULES.map((module) => {
    const row = byCode.get(module.code);
    if (!row) {
      // Sin fila: el defecto. El núcleo siempre; lo contratable también, porque
      // la maqueta no bloquea a nadie.
      return { module, enabled: true, source: "defecto" };
    }
    // Con fila, manda la fila. Una ventana vencida (`enabledTo` en el pasado)
    // cuenta como deshabilitado.
    const vigente = row.enabledTo === null || row.enabledTo > ahora;
    return { module, enabled: row.enabled && vigente, source: row.source };
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
