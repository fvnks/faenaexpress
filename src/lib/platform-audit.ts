// Auditoría de plataforma: lo que el equipo de Yellow ERP hace sobre las cuentas
// de los clientes. Es la contraparte de `AuditLog` (que es por empresa): aquí es
// por persona del equipo, porque muchas acciones no tienen una empresa única
// (crear una organización, cambiar un plan).

import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { PlatformContext } from "@/lib/platform";

export type PlatformAuditInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /** Cuenta afectada, cuando la acción tiene una. */
  organizationId?: string | null;
  summary: string;
  changes?: unknown;
};

// Nunca debe tumbar la operación que registra.
export async function recordPlatformAudit(
  ctx: PlatformContext,
  input: PlatformAuditInput,
): Promise<void> {
  try {
    await db.platformAudit.create({
      data: {
        staffUserId: ctx.user.id,
        staffUserName: ctx.user.name,
        staffUserEmail: ctx.user.email,
        level: ctx.staff.level,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        organizationId: input.organizationId ?? null,
        summary: input.summary,
        changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // La auditoría es secundaria: si falla, la acción del operador ya se hizo.
  }
}

export async function listPlatformAudit(filters: {
  organizationId?: string;
  staffUserId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return db.platformAudit.findMany({
    where: {
      organizationId: filters.organizationId,
      staffUserId: filters.staffUserId,
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });
}
