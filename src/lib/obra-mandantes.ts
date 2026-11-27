// Lectura de mandantes visibles para el usuario de Obras. Un mandante aparece
// si tiene alguna obra que el usuario ve; la dirección de la organización ve
// además todos los mandantes creados en su cuenta.

import type { SessionUser } from "@/lib/auth";
import { isOrgManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleObras } from "@/lib/obra-auth";

export async function mandantesVisibles(user: SessionUser) {
  const organizationId = user.orgMembership?.organizationId ?? null;
  const obras = await visibleObras(user);
  const conObraVisible = { obras: { some: { id: { in: obras.map((obra) => obra.id) } } } };
  const where =
    organizationId && isOrgManager(user)
      ? { OR: [{ organizationId }, conObraVisible] }
      : conObraVisible;

  return db.mandanteObra.findMany({
    where,
    include: { _count: { select: { obras: true } } },
    orderBy: { name: "asc" },
  });
}
