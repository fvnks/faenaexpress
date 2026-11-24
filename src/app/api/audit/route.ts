import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveMembership } from "@/lib/auth";

/** Historial de auditoría de un documento, limitado a la empresa activa. */
export async function GET(request: Request) {
  const user = await requireUser();
  const active = await getActiveMembership();
  if (!active) return NextResponse.json({ events: [] });

  const params = new URL(request.url).searchParams;
  const entityType = (params.get("entityType") ?? "").slice(0, 40);
  const entityId = (params.get("entityId") ?? "").slice(0, 80);
  if (!entityType || !entityId) return NextResponse.json({ events: [] });

  const logs = await db.auditLog.findMany({
    where: { companyId: active.company.id, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, summary: true, userName: true, createdAt: true },
  });

  return NextResponse.json({
    events: logs.map((log) => ({
      ...log,
      action: String(log.action),
      createdAt: log.createdAt.toISOString(),
    })),
  });
}
