import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type AuditActor = {
  company: { id: string };
  user: { id: string; name: string };
};

export type AuditInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  // Objeto serializable (normalmente el resultado de diffChanges).
  changes?: unknown;
};

// Deja el rastro de auditoría. Nunca debe tumbar la operación que registra.
export async function recordAudit(actor: AuditActor, input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        companyId: actor.company.id,
        userId: actor.user.id,
        userName: actor.user.name,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // La auditoría es secundaria: si falla, la mutación ya se hizo.
  }
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

// Devuelve solo los campos que cambiaron entre dos versiones del registro.
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(after)) {
    const a = normalize(before[key]);
    const b = normalize(after[key]);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes[key] = { before: a, after: b };
    }
  }
  return changes;
}

export async function listAuditLogs(
  companyId: string,
  filters: { entityType?: string; action?: AuditAction; limit?: number } = {},
) {
  return db.auditLog.findMany({
    where: {
      companyId,
      entityType: filters.entityType,
      action: filters.action,
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 100,
  });
}
