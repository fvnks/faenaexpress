// Auditoría de plataforma: lo que el equipo de Yellow ERP hace sobre las cuentas
// de los clientes. Es la contraparte de `AuditLog` (que es por empresa): aquí es
// por persona del equipo, porque muchas acciones no tienen una empresa única
// (crear una organización, cambiar un plan).

import type { AuditAction, PlatformLevel, Prisma } from "@/generated/prisma/client";
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

export type PlatformAuditFilters = {
  q?: string;
  action?: AuditAction;
  level?: PlatformLevel;
  entityType?: string;
  organizationId?: string;
  desde?: Date;
  hasta?: Date;
  limit?: number;
  offset?: number;
};

/** Filtros compartidos por la vista global y la exportación CSV. */
export function platformAuditWhere(f: PlatformAuditFilters): Prisma.PlatformAuditWhereInput {
  const where: Prisma.PlatformAuditWhereInput = {};
  if (f.organizationId) where.organizationId = f.organizationId;
  if (f.action) where.action = f.action;
  if (f.level) where.level = f.level;
  if (f.entityType) where.entityType = f.entityType;
  if (f.desde || f.hasta) {
    where.createdAt = {};
    if (f.desde) where.createdAt.gte = f.desde;
    if (f.hasta) where.createdAt.lte = f.hasta;
  }
  if (f.q) {
    where.OR = [
      { summary: { contains: f.q, mode: "insensitive" } },
      { staffUserName: { contains: f.q, mode: "insensitive" } },
      { staffUserEmail: { contains: f.q, mode: "insensitive" } },
      { entityType: { contains: f.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function queryPlatformAudit(filters: PlatformAuditFilters) {
  return db.platformAudit.findMany({
    where: platformAuditWhere(filters),
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });
}

export async function countPlatformAudit(filters: PlatformAuditFilters) {
  return db.platformAudit.count({ where: platformAuditWhere(filters) });
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
