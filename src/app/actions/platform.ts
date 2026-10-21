"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  createImpersonationSession,
  deleteImpersonationSession,
  getImpersonationContext,
} from "@/lib/impersonation";
import { recordPlatformAudit } from "@/lib/platform-audit";
import { clearPendingInvite, setPendingInvite } from "@/lib/platform-invite";
import { setOrganizationModule, syncPlanModules } from "@/lib/org-module-state";
import { findOrgModule, ORG_MODULES } from "@/lib/org-modules";
import { recomputeUsage } from "@/lib/plans";
import {
  CONFIGURABLE_SECTIONS,
  SECTION_ACCESS_VALUES,
  type SectionAccess,
} from "@/lib/permissions";
import { disableTwoFactor } from "@/lib/two-factor";
import { requirePlatformStaff } from "@/lib/platform";
import { RateLimiter } from "@/lib/rate-limit";
import { roleValues } from "@/lib/validation";

// Acciones de la consola de operador. TODAS exigen `requirePlatformStaff` con el
// nivel que corresponde: la consola es la superficie más peligrosa del sistema
// (un fallo de autorización aquí no filtra una empresa, filtra todas).
//
// `SUPPORT` solo lee: no hay ninguna acción que le baste. Crear cuenta e invitar
// es de `OPERATOR`; gestionar al equipo de plataforma, de `OWNER`.

export type PlatformActionState =
  | {
      error?: string;
      ok?: boolean;
      url?: string;
      organizationId?: string;
      /** Estado resultante, para que la interfaz no adivine. */
      enabled?: boolean;
    }
  | undefined;

/**
 * Desactiva o reactiva la cuenta de un usuario.
 *
 * Desactivar, no borrar: el usuario conserva su trazabilidad (auditoría,
 * documentos que creó) y deja de poder entrar. Es la misma regla de la Fase A
 * para los miembros de una organización, pero aquí alcanza a TODAS sus cuentas:
 * un usuario desactivado no entra a ninguna.
 */
export async function setPlatformUserActive(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const userId = String(formData.get("userId") ?? "").trim();
  const active = String(formData.get("active")) === "true";

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!user) return { error: "Ese usuario no existe." };

  if (userId === ctx.user.id) {
    return { error: "No puedes desactivar tu propia cuenta desde la consola." };
  }

  if (!active) {
    // Invariante: una organización no puede quedar sin dueño activo.
    const orgs = await db.orgMember.findMany({
      where: { userId, active: true, orgRole: "OWNER" },
      select: { organizationId: true, organization: { select: { name: true } } },
    });
    for (const org of orgs) {
      const otherOwners = await db.orgMember.count({
        where: {
          organizationId: org.organizationId,
          orgRole: "OWNER",
          active: true,
          userId: { not: userId },
        },
      });
      if (otherOwners === 0) {
        return {
          error: `No se puede desactivar: «${user.name}» es el único dueño de «${org.organization.name}». Deja otro dueño primero.`,
        };
      }
    }
  }

  if (user.active === active) return { ok: true };

  await db.user.update({ where: { id: userId }, data: { active } });

  // Al desactivar, sus sesiones dieeben dejar de servir: se cierran.
  if (!active) {
    await db.session.deleteMany({ where: { userId } });
  }

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    summary: `${active ? "Reactivó" : "Desactivó"} la cuenta de ${user.name} (${user.email}).`,
    changes: { active: { before: user.active, after: active } },
  });

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true };
}

/**
 * Genera una invitación para un usuario que YA tiene cuenta, para que entre a
 * otra organización. La persona confirma abriendo el enlace: nadie se auto-asigna
 * un rol.
 */
export async function inviteExistingUser(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const userId = String(formData.get("userId") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "VIEWER");
  const companyId = String(formData.get("companyId") ?? "").trim() || null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!user) return { error: "Ese usuario no existe." };
  if (!user.active) return { error: "El usuario está desactivado. Reactívalo antes." };

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  // Si ya es miembro de la organización, no hay nada que invitar.
  const yaEs = await db.orgMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true, active: true },
  });
  if (yaEs?.active) {
    return { error: `${user.name} ya es miembro de «${organization.name}».` };
  }

  if (companyId) {
    const pertenece = await db.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    });
    if (!pertenece) return { error: "Esa empresa no pertenece a la organización." };
  }

  const role = (roleValues as readonly string[]).includes(roleRaw)
    ? (roleRaw as (typeof roleValues)[number])
    : "VIEWER";

  const token = generateToken();
  try {
    await db.invitation.create({
      data: {
        organizationId,
        companyId,
        email: user.email,
        role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });
  } catch {
    return { error: `Ya hay una invitación para ${user.email} en «${organization.name}».` };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const url = `${baseUrl}/invitacion/${token}`;

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "Invitation",
    entityId: user.id,
    organizationId,
    summary: `Generó una invitación para ${user.name} (${user.email}) en «${organization.name}».`,
  });

  await setPendingInvite({
    id: crypto.randomUUID(),
    url,
    email: user.email,
    organizationId,
  });

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath(`/admin/organizaciones/${organizationId}`);
  return { ok: true, url };
}

/**
 * Crea o actualiza un plan del catálogo.
 *
 * El catálogo es lo que vendes: lo edita el operador, no el cliente. Los
 * límites en blanco (sin número) significan «sin tope».
 */
export async function savePlan(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const planId = String(formData.get("planId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priceCLP = Number(formData.get("priceCLP") ?? 0);
  const period = String(formData.get("period") ?? "MONTHLY");
  const active = String(formData.get("active")) === "true";

  if (!code) return { error: "El código del plan es obligatorio." };
  if (!/^[a-z0-9-]+$/.test(code)) {
    return { error: "El código solo puede tener letras minúsculas, números y guiones." };
  }
  if (name.length < 2 || name.length > 60) {
    return { error: "El nombre debe tener entre 2 y 60 caracteres." };
  }
  if (!Number.isInteger(priceCLP) || priceCLP < 0) {
    return { error: "El precio debe ser un número de pesos válido." };
  }
  if (period !== "MONTHLY" && period !== "YEARLY") {
    return { error: "El período debe ser mensual o anual." };
  }

  // Límites: en blanco = sin tope.
  const leerLimite = (campo: string): number | null => {
    const crudo = String(formData.get(campo) ?? "").trim();
    if (crudo === "") return null;
    const n = Number(crudo);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const maxCompanies = leerLimite("maxCompanies");
  const maxUsers = leerLimite("maxUsers");
  const maxDocsPerMonth = leerLimite("maxDocsPerMonth");

  // Módulos incluidos: los del catálogo, no los del núcleo.
  const modulos = ORG_MODULES.filter((m) =>
    formData.get(`modulo:${m.code}`) === "on",
  ).map((m) => m.code);

  const data = {
    code,
    name,
    description,
    priceCLP,
    period,
    maxCompanies,
    maxUsers,
    maxDocsPerMonth,
    modules: modulos,
    active,
  };

  if (planId) {
    const before = await db.plan.findUnique({ where: { id: planId } });
    if (!before) return { error: "Ese plan no existe." };

    const choque = await db.plan.findFirst({ where: { code, NOT: { id: planId } } });
    if (choque) return { error: `Ya existe un plan con el código «${code}».` };

    await db.plan.update({ where: { id: planId }, data });

    // Los módulos del plan se reflejan en las cuentas que lo tienen.
    const cuentas = await db.subscription.findMany({ where: { planId } });
    for (const cuenta of cuentas) {
      await syncPlanModules(cuenta.organizationId, modulos);
    }

    await recordPlatformAudit(ctx, {
      action: "UPDATE",
      entityType: "Plan",
      entityId: planId,
      summary: `Editó el plan «${name}» (${code}).`,
      changes: {
        priceCLP: { before: before.priceCLP, after: priceCLP },
        maxDocsPerMonth: { before: before.maxDocsPerMonth, after: maxDocsPerMonth },
        maxUsers: { before: before.maxUsers, after: maxUsers },
        maxCompanies: { before: before.maxCompanies, after: maxCompanies },
        modules: { before: before.modules, after: modulos },
        active: { before: before.active, after: active },
      },
    });
  } else {
    const existe = await db.plan.findUnique({ where: { code } });
    if (existe) return { error: `Ya existe un plan con el código «${code}».` };

    const plan = await db.plan.create({ data });

    await recordPlatformAudit(ctx, {
      action: "CREATE",
      entityType: "Plan",
      entityId: plan.id,
      summary: `Creó el plan «${name}» (${code}).`,
      changes: { priceCLP: { before: null, after: priceCLP } },
    });
  }

  revalidatePath("/admin/planes");
  revalidatePath("/admin/organizaciones");
  return { ok: true };
}

/**
 * Cambia el plan de una cuenta (o el estado de su suscripción). Es el «upgrade
 * libera el mismo día»: el corte se recalcula al instante.
 */
export async function changeOrganizationPlan(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const planId = String(formData.get("planId") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE");

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Ese plan no existe." };

  const antes = await db.subscription.findUnique({
    where: { organizationId },
    include: { plan: { select: { name: true } } },
  });

  const estadoValido = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"].includes(status)
    ? (status as "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED")
    : "ACTIVE";

  const trialEndsAt =
    estadoValido === "TRIAL"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 días de prueba
      : null;

  await db.subscription.upsert({
    where: { organizationId },
    update: {
      planId,
      status: estadoValido,
      trialEndsAt,
      canceledAt: estadoValido === "CANCELED" ? new Date() : null,
    },
    create: {
      organizationId,
      planId,
      status: estadoValido,
      trialEndsAt,
    },
  });

  // Los módulos del plan se reflejan en la cuenta (lo manual no se pisa).
  await syncPlanModules(organizationId, plan.modules);

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "Subscription",
    entityId: organizationId,
    organizationId,
    summary: `Cambió el plan de «${organization.name}»${antes ? ` de «${antes.plan.name}»` : ""} a «${plan.name}» (${estadoValido}).`,
    changes: {
      plan: { before: antes?.plan.name ?? null, after: plan.name },
      status: { before: antes?.status ?? null, after: estadoValido },
    },
  });

  revalidatePath(`/admin/organizaciones/${organizationId}`);
  revalidatePath("/admin/planes");
  revalidatePath("/facturas/organizacion");
  return { ok: true };
}

/** Recalcula el consumo real de una cuenta (el contador puede desviarse). */
export async function recomputeOrganizationUsage(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  const usage = await recomputeUsage(organizationId);

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "UsageRecord",
    entityId: organizationId,
    organizationId,
    summary: `Recalculó el uso de «${organization.name}» (${usage.documentsCreated} documentos, ${usage.activeUsers} usuarios).`,
  });

  revalidatePath(`/admin/organizaciones/${organizationId}`);
  return { ok: true };
}

/**
 * Restablece el segundo factor de una persona (soporte: el cliente perdió su
 * teléfono o cambió de app). Es una acción de OWNER de plataforma: deja a esa
 * persona sin 2FA, así que hay que avisarla.
 */
export async function resetUserTwoFactor(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OWNER");

  const userId = String(formData.get("userId") ?? "").trim();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, totpEnabled: true },
  });
  if (!user) return { error: "Ese usuario no existe." };
  if (!user.totpEnabled) return { error: "Esa persona no tiene segundo factor activo." };

  await disableTwoFactor(user.id);

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    summary: `Restableció el segundo factor de ${user.name} (${user.email}).`,
    changes: { totpEnabled: { before: true, after: false } },
  });

  revalidatePath(`/admin/usuarios/${user.id}`);
  return { ok: true };
}

/**
 * Crea una empresa dentro de una organización (alta asistida).
 *
 * Es de OPERATOR. La cuenta se crea desde la consola, pero la empresa con sus
 * datos fiscales la pone el cliente: si la crea el operador, la está
 * escribiendo de memoria y el RUT termina mal.
 *
 * Quien acepta la invitación recibe su membresía en esta empresa.
 */
export async function createCompanyForOrganization(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rut = String(formData.get("rut") ?? "").trim() || null;
  const ivaRate = Number(formData.get("ivaRate") ?? 19);

  if (!organizationId) return { error: "Falta la organización." };
  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }
  if (ivaRate < 0 || ivaRate > 100) {
    return { error: "El IVA debe ser un porcentaje entre 0 y 100." };
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  const existing = await db.company.findFirst({
    where: { organizationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { error: `Ya existe una empresa llamada «${name}» en esa cuenta.` };

  const company = await db.company.create({
    data: {
      organizationId,
      name,
      rut,
      ivaRate: Number.isInteger(ivaRate) ? ivaRate : 19,
      currency: "CLP",
    },
    select: { id: true, name: true },
  });

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "Company",
    entityId: company.id,
    organizationId,
    summary: `Creó la empresa «${company.name}» en «${organization.name}».`,
  });

  revalidatePath(`/admin/organizaciones/${organizationId}`);
  return { ok: true };
}

/**
 * Guarda las excepciones por sección de una membresía, desde la consola.
 *
 * Es la versión del operador de `setMemberSectionAccess`: el staff no tiene
 * empresa activa en la cuenta del cliente, así que va por id de membresía.
 */
export async function setPlatformMemberSectionAccess(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      userId: true,
      sectionAccess: true,
      role: true,
      user: { select: { name: true, email: true } },
      company: { select: { name: true, organizationId: true } },
    },
  });
  if (!membership) return { error: "Ese usuario no es miembro de ninguna empresa." };

  const anterior = (membership.sectionAccess as Record<string, string> | null) ?? {};
  const siguiente: Record<string, string> = { ...anterior };

  for (const section of CONFIGURABLE_SECTIONS) {
    const valor = String(formData.get(`acceso:${section}`) ?? "").trim();
    if (!valor) continue;
    if (!SECTION_ACCESS_VALUES.includes(valor as SectionAccess)) continue;
    if (valor === "default") {
      delete siguiente[section];
    } else {
      siguiente[section] = valor;
    }
  }

  await db.membership.update({
    where: { id: membership.id },
    data: { sectionAccess: Object.keys(siguiente).length ? siguiente : undefined },
  });

  if (JSON.stringify(anterior) !== JSON.stringify(siguiente)) {
    await recordPlatformAudit(ctx, {
      action: "UPDATE",
      entityType: "Membership",
      entityId: membership.id,
      organizationId: membership.company.organizationId,
      summary: `Cambió los permisos por sección de ${membership.user.name} (${membership.user.email}) en «${membership.company.name}».`,
      changes: { sectionAccess: { before: anterior, after: siguiente } },
    });
  }

  revalidatePath(`/admin/usuarios/${membership.userId}`);
  return { ok: true };
}

/**
 * Habilita o deshabilita un módulo para una organización.
 *
 * Es un cambio COMERCIAL, no un ajuste: por eso va con auditoría de plataforma
 * y con el nivel que corresponde (OPERATOR). El núcleo no se toca.
 */
export async function setOrganizationModuleEnabled(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const moduleCode = String(formData.get("moduleCode") ?? "").trim();
  const enabled = String(formData.get("enabled")) === "true";

  if (!organizationId) return { error: "Falta la organización." };

  const modulo = findOrgModule(moduleCode);
  if (!modulo) return { error: "Ese módulo no existe." };
  if (modulo.core) return { error: "El núcleo del producto no se puede deshabilitar." };

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  const before = await db.organizationModule.findUnique({
    where: { organizationId_moduleCode: { organizationId, moduleCode } },
    select: { enabled: true, enabledTo: true },
  });

  await setOrganizationModule(organizationId, moduleCode, enabled);

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "OrganizationModule",
    entityId: organizationId,
    organizationId,
    summary: `${enabled ? "Habilitó" : "Deshabilitó"} el módulo «${modulo.name}» en «${organization.name}».`,
    changes: {
      module: { before: null, after: modulo.code },
      enabled: { before: before?.enabled ?? true, after: enabled },
    },
  });

  revalidatePath(`/admin/organizaciones/${organizationId}`);
  revalidatePath("/admin/modulos");
  return { ok: true, enabled };
}

const inviteLimiter = new RateLimiter({ max: 10, windowMs: 60_000 });

/** Cierra el panel del enlace de invitación. No deja rastro: no cambia nada. */
export async function dismissPendingInvite(): Promise<void> {
  await requirePlatformStaff("SUPPORT");
  await clearPendingInvite();
}

/**
 * Entra a la cuenta de un cliente («impersonar»).
 *
 * Exige OPERATOR:SUPPORT lee, pero entrar a la cuenta de un cliente es una de
 * las cosas más delicadas del panel. Se elige:
 *   - la organización whose,
 *   - el usuario del cliente dentro de ella (por defecto, el dueño de la
 *     organización, que es quien puede hacer de todo en su cuenta),
 *   - el motivo, que queda escrito para el cliente.
 *
 * La sesión es nueva y aparte: la del operador no se toca. Tope duro de 30
 * minutos, banner permanente y prohibidas las acciones destructivas.
 */
export async function startImpersonation(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;

  if (!organizationId) return { error: "Falta la organización." };

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  // El usuario imitado tiene que pertenecer a la organización: nunca se entra a
  // una cuenta con un usuario de otra.
  const membership = await db.orgMember.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
    select: {
      id: true,
      active: true,
      orgRole: true,
      user: { select: { id: true, name: true, email: true, active: true } },
    },
  });
  if (!membership || !membership.active || !membership.user.active) {
    return { error: "Ese usuario no pertenece a la organización." };
  }

  // Si ya hay una impersonación viva, se cierra antes de abrir otra: no puede
  // haber dos ventanas de soporte dentro de la misma cuenta.
  const current = await getImpersonationContext();
  if (current) {
    await deleteImpersonationSession();
    await recordPlatformAudit(ctx, {
      action: "UPDATE",
      entityType: "Impersonation",
      entityId: current.sessionId,
      organizationId: current.organization.id,
      summary: `Cerró la impersonación de «${current.organization.name}» (duración: ${Math.round((Date.now() - current.startedAt.getTime()) / 60000)} min) para abrir otra.`,
    });
  }

  await createImpersonationSession({
    staffUserId: ctx.user.id,
    organizationId,
    targetUserId,
    reason,
  });

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "Impersonation",
    entityId: targetUserId,
    organizationId,
    summary: `Entró a la cuenta de «${organization.name}» como ${membership.user.name} (${membership.user.email})${reason ? ` · motivo: ${reason}` : ""}.`,
    changes: { reason: { before: null, after: reason } },
  });

  // La empresa activa: la primera donde el usuario imitado tiene membresía, para
  // que la sesión no caiga en una empresa donde no puede hacer nada.
  const company = await db.membership.findFirst({
    where: { userId: targetUserId, active: true },
    select: { companyId: true },
    orderBy: { createdAt: "asc" },
  });
  if (company) {
    const cookieStore = await cookies();
    cookieStore.set("facturas_company", company.companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  redirect("/facturas");
}

/** Sale de la impersonación y vuelve a la sesión del operador. */
export async function stopImpersonation(): Promise<void> {
  const ctx = await requirePlatformStaff("SUPPORT");
  const current = await getImpersonationContext();
  if (!current) redirect("/facturas");

  await deleteImpersonationSession();

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "Impersonation",
    entityId: current.sessionId,
    organizationId: current.organization.id,
    summary: `Salió de la cuenta de «${current.organization.name}» (duración: ${Math.round((Date.now() - current.startedAt.getTime()) / 60000)} min).`,
  });

  redirect("/admin");
}

function generateToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function slugify(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "organizacion";
}

async function uniqueSlug(value: string): Promise<string> {
  const base = slugify(value);
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const exists = await db.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Crea una organización desde la consola (alta asistida). El nombre del contacto
 * se guarda como el primer miembro OWNER; la empresa se crea aparte, dentro de la
 * app del cliente, porque sus datos fiscales los pone el cliente.
 */
export async function createOrganizationFromAdmin(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  // Un nombre repetido casi siempre es un error de tipeo del operador: la cuenta
  // ya existe y crear otra deja dos cuentasgemelas que confunden después.
  const existing = await db.organization.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) {
    return { error: `Ya existe una organización llamada «${existing.name}».` };
  }

  const slug = await uniqueSlug(name);
  const organization = await db.organization.create({
    data: { name, slug },
    select: { id: true, name: true },
  });

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "Organization",
    entityId: organization.id,
    organizationId: organization.id,
    summary: `Creó la organización «${name}».`,
    changes: { name: { before: null, after: name }, slug: { before: null, after: slug } },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizaciones");
  return { ok: true, organizationId: organization.id };
}

/**
 * Genera una invitación para una organización desde la consola. Sirve para el
 * alta asistida: el operador crea la cuenta y le manda el enlace al contacto sin
 * entrar a la Configuración del cliente.
 */
export async function createInvitationFromAdmin(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  if (!inviteLimiter.allow(`admin-invite:${ctx.user.id}`)) {
    return { error: "Demasiadas invitaciones seguidas. Espera un momento." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "ADMIN");
  const companyIdRaw = String(formData.get("companyId") ?? "").trim();
  const companyId = companyIdRaw || null;

  if (!organizationId) return { error: "Falta la organización." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un correo válido." };
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) return { error: "Esa organización no existe." };

  // La empresa destino, si la hay, debe ser de esa organización.
  if (companyId) {
    const belongs = await db.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    });
    if (!belongs) return { error: "Esa empresa no pertenece a la organización." };
  }

  const role = (roleValues as readonly string[]).includes(roleRaw)
    ? (roleRaw as (typeof roleValues)[number])
    : "VIEWER";

  // `Invitation` es único por (organización, correo): invitar dos veces al mismo
  // contacto chocaría con esa restricción. Se avisa en vez de reventar.
  const previous = await db.invitation.findFirst({
    where: { organizationId, email, acceptedAt: null },
    select: { id: true, expiresAt: true },
  });
  if (previous && previous.expiresAt > new Date()) {
    return { error: `Ya hay una invitación vigente para ${email}.` };
  }
  if (previous) {
    // La anterior expiró sin usarse: su enlace está muerto, así que se
    // reemplaza por una nueva (si no, la restricción única lo impediría).
    await db.invitation.delete({ where: { id: previous.id } });
  }

  const token = generateToken();
  try {
    await db.invitation.create({
      data: {
        organizationId,
        companyId,
        email,
        role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });
  } catch {
    return { error: `No se pudo crear la invitación para ${email}. Revisa si ya tiene una.` };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const url = `${baseUrl}/invitacion/${token}`;

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "Invitation",
    organizationId,
    summary: `Generó una invitación para ${email} (${role}) en «${organization.name}».`,
  });

  // El enlace se guarda en una cookie corta: la revalidación remonta el
  // componente de cliente y el enlace se perdería en el estado de React.
  await setPendingInvite({
    id: crypto.randomUUID(),
    url,
    email,
    organizationId,
  });

  revalidatePath(`/admin/organizaciones/${organizationId}`);
  return { ok: true, url };
}

const PLATFORM_LEVELS = ["SUPPORT", "OPERATOR", "OWNER"] as const;
type PlatformLevelValue = (typeof PLATFORM_LEVELS)[number];

/**
 * Agrega a un usuario existente al equipo de plataforma. No crea usuarios: usa
 * una cuenta que ya existe (una identidad, un correo). OWNER-only y auditado.
 */
export async function addPlatformStaff(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OWNER");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const levelRaw = String(formData.get("level") ?? "SUPPORT");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un correo válido." };
  }
  const level: PlatformLevelValue = (PLATFORM_LEVELS as readonly string[]).includes(levelRaw)
    ? (levelRaw as PlatformLevelValue)
    : "SUPPORT";

  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) {
    return { error: "No existe un usuario con ese correo. Créalo primero en la app del cliente." };
  }

  const existing = await db.platformStaff.findUnique({
    where: { userId: user.id },
    select: { id: true, active: true, level: true },
  });
  if (existing?.active) {
    return { error: "Ese usuario ya es parte del equipo de plataforma." };
  }

  if (existing) {
    await db.platformStaff.update({
      where: { id: existing.id },
      data: { active: true, level },
    });
  } else {
    await db.platformStaff.create({ data: { userId: user.id, level } });
  }

  await recordPlatformAudit(ctx, {
    action: existing ? "UPDATE" : "CREATE",
    entityType: "PlatformStaff",
    entityId: user.id,
    summary: `${existing ? "Reactivó" : "Agregó"} a ${user.name} (${email}) al equipo de plataforma como ${level}.`,
  });

  revalidatePath("/admin/equipo");
  return { ok: true };
}

/** Cambia el nivel o suspende a un miembro del equipo. OWNER-only y auditado. */
export async function updatePlatformStaff(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OWNER");

  const userId = String(formData.get("userId") ?? "").trim();
  const levelRaw = String(formData.get("level") ?? "").trim();
  const activeRaw = formData.get("active");

  const member = await db.platformStaff.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!member) return { error: "Ese usuario no es parte del equipo." };

  const level: PlatformLevelValue | undefined = (PLATFORM_LEVELS as readonly string[]).includes(levelRaw)
    ? (levelRaw as PlatformLevelValue)
    : undefined;
  const active = activeRaw === null ? undefined : activeRaw === "true";

  // Invariante: nunca dejar la plataforma sin un OWNER activo. Si este es el
  // único y se lo degrada o suspende, se corta.
  const wasOwner = member.active && member.level === "OWNER";
  const willStopBeingActiveOwner = wasOwner && (active === false || (level !== undefined && level !== "OWNER"));
  if (willStopBeingActiveOwner) {
    const otherOwners = await db.platformStaff.count({
      where: { level: "OWNER", active: true, userId: { not: userId } },
    });
    if (otherOwners === 0) {
      return { error: "Debe quedar al menos un dueño activo en el equipo de plataforma." };
    }
  }

  // Nadie se saca a sí mismo del equipo: evita quedarse fuera por un clic.
  if (userId === ctx.user.id && active === false) {
    return { error: "No puedes suspender tu propio acceso." };
  }

  await db.platformStaff.update({
    where: { userId },
    data: {
      ...(level !== undefined ? { level } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  const parts: string[] = [];
  if (level !== undefined && level !== member.level) parts.push(`nivel ${member.level} → ${level}`);
  if (active !== undefined && active !== member.active) parts.push(active ? "reactivado" : "suspendido");

  await recordPlatformAudit(ctx, {
    action: "UPDATE",
    entityType: "PlatformStaff",
    entityId: userId,
    summary: `Actualizó a ${member.user.name}: ${parts.join(", ") || "sin cambios"}.`,
  });

  revalidatePath("/admin/equipo");
  return { ok: true };
}

/**
 * Crea un usuario desde la consola, con contraseña provisional.
 *
 * Es distinto de la invitación: acá la persona existe al instante y entra con
 * la clave que le pasa el operador (y la cambia sola en su perfil). La
 * invitación sirve cuando el cliente arma su propio equipo; esto, para el alta
 * asistida y para cuentas de prueba o de soporte.
 *
 * La contraseña provisional obliga el cambio al primer ingreso
 * (`mustChangePassword`): el operador no queda conociendo la clave definitiva.
 */
export async function createUserFromAdmin(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "").trim() || null;
  const orgRoleRaw = String(formData.get("orgRole") ?? "OWNER");

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un correo válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña provisional debe tener al menos 8 caracteres." };
  }

  const yaExiste = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (yaExiste) {
    return { error: "Ya existe una cuenta con ese correo. Invítala a la organización en vez de crearla." };
  }

  if (organizationId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!org) return { error: "Esa organización no existe." };
  }

  const orgRoles = ["OWNER", "ADMIN", "MEMBER", "BILLING"] as const;
  const orgRole = (orgRoles as readonly string[]).includes(orgRoleRaw)
    ? (orgRoleRaw as (typeof orgRoles)[number])
    : "MEMBER";

  const { hashPassword } = await import("@/lib/password");

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      // El operador conoce esta clave: el usuario la cambia al entrar.
      mustChangePassword: true,
      ...(organizationId
        ? { orgMembers: { create: { organizationId, orgRole } } }
        : {}),
    },
    select: { id: true, name: true, email: true },
  });

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    organizationId,
    summary: `Creó la cuenta de ${user.name} (${user.email})${organizationId ? ` y la sumó a la organización con rol ${orgRole}` : ""}.`,
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Crea un colegio desde la consola y deja al operador como DIRECTOR.
 *
 * Sin esto, habilitar el módulo Colegios no servía de nada: no había forma de
 * crear un colegio, así que `visibleSchools` seguía vacío y la tarjeta del
 * selector nunca aparecía. El colegio queda a nombre del operador hasta que
 * llegue el equipo del establecimiento; después se le cambia el rol a VIEWER o
 * se lo saca.
 */
export async function createSchoolFromAdmin(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const ctx = await requirePlatformStaff("OPERATOR");

  const name = String(formData.get("name") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim() || null;
  const levelRaw = String(formData.get("level") ?? "BASICA");
  const rut = String(formData.get("rut") ?? "").trim() || null;
  const commune = String(formData.get("commune") ?? "").trim() || null;

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre del colegio debe tener entre 2 y 120 caracteres." };
  }

  const niveles = ["PARVULARIA", "PREBASICA", "BASICA", "MEDIA", "TECNICO"] as const;
  const level = (niveles as readonly string[]).includes(levelRaw)
    ? (levelRaw as (typeof niveles)[number])
    : "BASICA";

  if (organizationId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) return { error: "Esa organización no existe." };
  }

  const school = await db.school.create({
    data: {
      name,
      organizationId,
      level,
      rut,
      commune,
      // El operador queda dentro para poder verlo; es temporal.
      memberships: {
        create: { userId: ctx.user.id, role: "DIRECTOR" },
      },
    },
    select: { id: true, name: true },
  });

  // El módulo Colegios tiene que quedar habilitado para la organización, o el
  // colegio recién creado no aparecería en el selector.
  if (organizationId) {
    await setOrganizationModule(organizationId, "colegios", true, "manual");
  }

  await recordPlatformAudit(ctx, {
    action: "CREATE",
    entityType: "School",
    entityId: school.id,
    organizationId,
    summary: `Creó el colegio «${school.name}»${organizationId ? " y habilitó el módulo Colegios para la organización" : ""}.`,
  });

  revalidatePath("/admin/organizaciones");
  revalidatePath("/modulos");
  return { ok: true, organizationId: organizationId ?? undefined };
}
