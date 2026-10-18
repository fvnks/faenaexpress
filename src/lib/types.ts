// Tipos compartidos entre session.ts y auth.ts.
// Exportados desde auth.ts para que los consumers no tengan que importarlos de aquí.

import type { Company, InventoryAccess, Membership, OrgMember, Role, User } from "@/generated/prisma/client";

// Usuario autenticado con sus memberships y su pertenencia a una organización.
// `orgMembership` es null si el usuario no pertenece a ninguna organización (instalación
// standalone sin backfill). Cuando existe, `orgMembership.canSwitchCompanies` gobierna
// cuántas empresas son visibles.
export type SessionUser = User & {
  memberships: (Membership & { company: Company })[];
  orgMembership: (OrgMember & { organization: { id: string; name: string } }) | null;
};

export type AuthContext = {
  user: SessionUser;
  company: Company;
  role: Role;
  inventoryAccess?: InventoryAccess;
};
