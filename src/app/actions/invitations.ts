"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
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
  const ctx = await requireContext();
  if (ctx.role !== "ADMIN") {
    return { error: "Solo un administrador puede generar invitaciones." };
  }
  // La invitación pertenece a la organización del usuario (el OWNER), no a la
  // empresa activa. Sin organización no se puede invitar a nadie.
  const orgId = ctx.user.orgMembership?.organizationId;
  if (!orgId || !ctx.user.orgMembership?.canSwitchCompanies) {
    return { error: "Necesitas el permiso de revisión multiempresa para generar invitaciones." };
  }

  const userKey = ctx.user.id;
  if (!limiter.allow(`invite:${userKey}`)) {
    return { error: "Demasiadas invitaciones. Espera un momento." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "VIEWER");
  const companyIdRaw = String(formData.get("companyId") ?? "").trim();
  const companyId = companyIdRaw || null;

  const alreadyActive = await db.invitation.count({
    where: {
      email,
      expiresAt: { gt: new Date() },
      acceptedAt: null,
      organizationId: orgId,
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
      organizationId: orgId,
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

  await db.auditLog.create({
    data: {
      companyId: ctx.company.id,
      userId: ctx.user.id,
      userName: ctx.user.name,
      action: "CREATE",
      entityType: "Invitation",
      summary: `Invitación generada para ${email} (${role}).`,
    },
  });

  revalidatePath("/facturas/configuracion");
  return { ok: true, url };
}

export async function listInvitations(): Promise<
  { id: string; email: string; role: string; companyId: string | null; companyName: string | null; expiresAt: string; createdAt: string }[]
> {
  const ctx = await requireContext();
  if (!ctx.user.orgMembership?.canSwitchCompanies) return [];
  if (ctx.role !== "ADMIN") return [];

  const orgId = ctx.user.orgMembership?.organizationId;
  if (!orgId) return [];

  const invites = await db.invitation.findMany({
    where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
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