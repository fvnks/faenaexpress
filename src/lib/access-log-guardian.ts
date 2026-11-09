import { db } from "@/lib/db";

/** Historial de accesos al portal de un apoderado, por su email o nombre. */
export async function listGuardianPortalAccess(guardianEmail: string | null, guardianName: string, limit = 20) {
  const where: {
    kind: string;
    OR?: Array<{ userEmail: { contains: string } }>;
  } = { kind: "portal_login" };

  const condiciones: Array<{ userEmail: { contains: string } }> = [];
  if (guardianEmail) {
    condiciones.push({ userEmail: { contains: guardianEmail } });
  }
  condiciones.push({ userEmail: { contains: guardianName } });
  where.OR = condiciones;

  return db.accessLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userEmail: true,
      kind: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });
}
