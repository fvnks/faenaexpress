import type { AuditAction, PlatformLevel } from "@/generated/prisma/client";

import { csvDate, csvResponse, toCsv } from "@/lib/csv";
import { requirePlatformStaff } from "@/lib/platform";
import { queryPlatformAudit } from "@/lib/platform-audit";

const ACCIONES: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "IMPORT"];
const NIVELES: PlatformLevel[] = ["SUPPORT", "OPERATOR", "OWNER"];

export async function GET(request: Request) {
  await requirePlatformStaff("SUPPORT");
  const sp = new URL(request.url).searchParams;
  const accion = ACCIONES.includes(sp.get("accion") as AuditAction) ? (sp.get("accion") as AuditAction) : undefined;
  const nivel = NIVELES.includes(sp.get("nivel") as PlatformLevel) ? (sp.get("nivel") as PlatformLevel) : undefined;
  const desdeRaw = sp.get("desde") ?? "";
  const hastaRaw = sp.get("hasta") ?? "";

  const rows = await queryPlatformAudit({
    q: sp.get("q")?.trim() || undefined,
    action: accion,
    level: nivel,
    entityType: sp.get("entidad") || undefined,
    organizationId: sp.get("organizacion") || undefined,
    desde: desdeRaw ? new Date(`${desdeRaw}T00:00:00.000Z`) : undefined,
    hasta: hastaRaw ? new Date(`${hastaRaw}T23:59:59.999Z`) : undefined,
    limit: 10_000,
  });

  const csv = toCsv(
    ["fecha", "autor", "email", "nivel", "accion", "entidad", "detalle", "cambios", "organizacionId"],
    rows.map((r) => [
      csvDate(r.createdAt),
      r.staffUserName,
      r.staffUserEmail,
      r.level,
      r.action,
      r.entityType,
      r.summary,
      r.changes ? JSON.stringify(r.changes) : "",
      r.organizationId ?? "",
    ]),
  );
  return csvResponse("auditoria-plataforma.csv", csv);
}
