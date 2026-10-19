"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { isOrgOwner, requireOrgManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { RateLimiter } from "@/lib/rate-limit";
import { roleValues } from "@/lib/validation";

const limiter = new RateLimiter({ max: 5, windowMs: 60_000 }); // 5 por minuto por usuario
const TOKEN_LEN = 32; // bytes → 43 chars base64url

function generateToken(): string {
  const buf = new Uint8Array(TOKEN_LEN);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type GenerateInvitationState = { error?: string; ok?: boolean; url?: string };

export async function generateInvitation(
  _prev: GenerateInvitationState,
  formData: FormData,
): Promise<GenerateInvitationState> {
  // Invitar es una capacidad de la ORGANIZACIÓN (OWNER/ADMIN), no de la empresa
  // activa: la invitación pertenece al grupo, aunque apunte a una sola empresa.
  const org = await requireOrgManager();

  const userKey = org.user.id;
  if (!limiter.allow(`invite:${userKey}`)) {
    return { error: "Demasiadas invitaciones. Espera un momento." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "VIEWER");
  const companyIdRaw = String(formData.get("companyId") ?? "").trim();
  const companyId = companyIdRaw || null;

  // Invitar sin empresa destino da acceso a TODAS las empresas de la
  // organización: es una decisión del dueño, no de un administrador.
  if (!companyId && !isOrgOwner(org.user)) {
    return { error: "Solo el dueño puede invitar a toda la organización. Elige una empresa." };
  }

  // Si la invitación apunta a una empresa, tiene que ser de la organización del
  // usuario: nunca se invita a una empresa ajena.
  if (companyId) {
    const belongs = await db.company.findFirst({
      where: { id: companyId, organizationId: org.organization.id },
      select: { id: true },
    });
    if (!belongs) {
      return { error: "Esa empresa no pertenece a tu organización." };
    }
  }

  const alreadyActive = await db.invitation.count({
    where: {
      email,
      expiresAt: { gt: new Date() },
      acceptedAt: null,
      organizationId: org.organization.id,
      companyId: companyId ? { equals: companyId } : undefined,
    },
  });
  if (alreadyActive > 0) {
    return { error: undefined, ok: true, url: undefined };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  const role = (roleValues as readonly string[]).includes(roleRaw)
    ? (roleRaw as typeof roleValues[number])
    : "VIEWER";

  await db.invitation.create({
    data: {
      organizationId: org.organization.id,
      companyId,
      email,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 h
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const url = `${baseUrl}/invitacion/${token}`;

  // La auditoría es por empresa (AuditLog.companyId es obligatorio). La invitación
  // pertenece a la organización, así que se registra en su primera empresa; si la
  // organización aún no tiene empresas, se omite el registro en vez de romper.
  const auditCompanyId =
    companyId ??
    (await db.company.findFirst({
      where: { organizationId: org.organization.id },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }))?.id ??
    null;

  if (auditCompanyId) {
    await db.auditLog.create({
      data: {
        companyId: auditCompanyId,
        userId: org.user.id,
        userName: org.user.name,
        action: "CREATE",
        entityType: "Invitation",
        summary: `Invitación generada para ${email} (${role}).`,
      },
    });
  }

  revalidatePath("/facturas/organizacion");
  return { ok: true, url };
}

export async function listInvitations(): Promise<
  { id: string; email: string; role: string; companyId: string | null; companyName: string | null; expiresAt: string; createdAt: string }[]
> {
  const org = await requireOrgManager();

  const invites = await db.invitation.findMany({
    where: {
      organizationId: org.organization.id,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } } },
    take: 50,
  });

  return invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    companyId: i.companyId,
    companyName: i.company?.name ?? null,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  }));
}