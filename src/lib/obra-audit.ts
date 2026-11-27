// Auditoría del módulo Obras. Reutiliza `AuditLog` (visible en
// /facturas/auditoria) con el prefijo de la obra en el resumen, para que un
// mismo log sirva para empresas y para obras sin crear otra tabla.
//
// Si quien opera es personal de plataforma sin empresa activa, no se escribe
// acá: la consola ya deja su rastro en `PlatformAudit`.

import type { AuditAction } from "@/generated/prisma/client";

import { recordAudit } from "@/lib/audit";
import { getActiveMembership } from "@/lib/auth";
import type { ObraContext } from "@/lib/obra-auth";

export type ObraAuditInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  changes?: unknown;
};

export async function recordObraAudit(
  ctx: ObraContext,
  input: ObraAuditInput,
): Promise<void> {
  const active = await getActiveMembership();
  if (!active) return;

  await recordAudit(
    { company: { id: active.company.id }, user: { id: ctx.user.id, name: ctx.user.name } },
    { ...input, summary: `[${ctx.obra.name}] ${input.summary}` },
  );
}
