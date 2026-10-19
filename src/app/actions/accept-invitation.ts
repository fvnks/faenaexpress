"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { hashPassword, verifyPassword } from "@/lib/password";
import { RateLimiter } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

const limiter = new RateLimiter({ max: 10, windowMs: 60_000 });

export type AcceptInvitationState = { error?: string } | undefined;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Acepta una invitación por enlace copiable.
 *
 * Dos caminos:
 *  - El correo de la invitación no tiene cuenta todavía: se crea con la contraseña
 *    provisional del formulario y `mustChangePassword = true`.
 *  - El correo ya tiene cuenta: se verifica la contraseña actual y se agrega a la
 *    organización (sin cambiar la contraseña).
 *
 * En ambos casos se crean el OrgMember y las Memberships (una empresa si la
 * invitación apunta a una; todas las de la organización si no).
 */
export async function acceptInvitation(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token || !limiter.allow(`accept:${token.slice(0, 8)}`)) {
    return { error: "Enlace inválido o demasiados intentos." };
  }

  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: true },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return { error: "La invitación no existe, ya se usó o expiró. Pide una nueva al administrador." };
  }

  const orgId = invitation.organizationId;
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Camino 1: la cuenta todavía no existe → crearla.
  const existing = await db.user.findUnique({ where: { email: invitation.email } });
  if (!existing) {
    if (name.length < 1 || password.length < 8) {
      return { error: "Ingresa tu nombre y una contraseña de al menos 8 caracteres." };
    }

    const user = await db.user.create({
      data: {
        name,
        email: invitation.email,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });

    await db.orgMember.create({
      data: { userId: user.id, organizationId: orgId, orgRole: "MEMBER" },
    });
    await db.membership.createMany({
      data: await membershipsFor(invitation.companyId, orgId, user.id, invitation.role),
    });
    await db.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), userId: user.id },
    });

    await createSession(user.id, false);
    revalidatePath("/", "layout");
    redirect("/perfil");
  }

  // Camino 2: la cuenta existe → verificar identidad con la contraseña actual.
  if (password.length < 1) {
    return { error: "Ingresa tu contraseña actual para confirmar que eres tú." };
  }
  const ok = await verifyPassword(password, existing.passwordHash);
  if (!ok) {
    return { error: "La contraseña no coincide con la de esa cuenta." };
  }

  const yaEsMiembro = await db.orgMember.findFirst({
    where: { userId: existing.id, organizationId: orgId },
  });
  if (!yaEsMiembro) {
    await db.orgMember.create({
      data: { userId: existing.id, organizationId: orgId, orgRole: "MEMBER" },
    });
  }
  await db.membership.createMany({
    data: await membershipsFor(invitation.companyId, orgId, existing.id, invitation.role),
    skipDuplicates: true,
  });
  await db.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date(), userId: existing.id },
  });

  const sesionActiva = await getCurrentUser();
  if (!sesionActiva) {
    await createSession(existing.id, false);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Memberships a crear según el alcance de la invitación. */
async function membershipsFor(companyId: string | null, orgId: string, userId: string, role: Role) {
  const companies = companyId
    ? await db.company.findMany({ where: { id: companyId }, select: { id: true } })
    : await db.company.findMany({ where: { organizationId: orgId }, select: { id: true } });

  return companies.map((company) => ({
    userId,
    companyId: company.id,
    role,
    inventoryAccess: "NONE" as const,
    active: true,
  }));
}
