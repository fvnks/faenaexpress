"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";

import { COMPANY_COOKIE, getCurrentUser, getActiveMembership, isAdmin, isOrgManager, isOrgOwner, requireContext, requireOrgManager, requireUser, visibleCompanies } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { IMPERSONATION_FORBIDDEN, impersonationBlock } from "@/lib/impersonation";
import {
  CONFIGURABLE_SECTIONS,
  SECTION_ACCESS_VALUES,
  type SectionAccess,
} from "@/lib/permissions";
import { checkPlanLimit } from "@/lib/plans";
import { FORMAS_DE_PAGO_BASE } from "@/lib/payment-methods";
import { companySchema, memberSchema, newUserSchema, orgRoleValues, roleValues } from "@/lib/validation";

export type CompanyFormState = { error?: string; ok?: boolean } | undefined;
export type MemberFormState = { error?: string; ok?: boolean } | undefined;

async function setActiveCompany(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// Cambia la empresa activa (solo entre las empresas visibles del usuario).
export async function switchCompany(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("companyId") ?? "");
  const rawRedirect = String(formData.get("redirectTo") ?? "");
  const redirectTo = rawRedirect === "configuracion" ? "/facturas/configuracion" : "/facturas";

  // La cookie se valida contra las companies visibles (no todas las memberships),
  // así un cookie manipulada no permite saltar a una empresa a la que el usuario
  // no tiene permiso de organización.
  const visible = await visibleCompanies(user);
  const membership = user.memberships.find((item) => item.companyId === companyId);
  const isVisible = visible.some((c) => c.id === companyId);
  if (!membership || !isVisible) redirect("/facturas");

  await setActiveCompany(companyId);
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

function companyData(input: ReturnType<typeof companySchema.parse>) {
  return {
    name: input.name,
    rut: input.rut ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    ivaRate: input.ivaRate,
    retentionRate: input.retentionRate,
    afpRate: input.afpRate,
    healthRate: input.healthRate,
    unemploymentRate: input.unemploymentRate,
    anualBonusRate: input.anualBonusRate,
  };
}

// Crea una empresa nueva; quien la crea queda como ADMIN en ella.
// Es una capacidad de la ORGANIZACIÓN (OWNER/ADMIN), no del rol de la empresa
// activa: una empresa nueva no pertenece a ninguna todavía. El OWNER la crea y
// decide a quién le da acceso después.
export async function createCompany(
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  // Empresa nueva = capacidad de la organización (OWNER/ADMIN): no pertenece a
  // ninguna empresa todavía, así que no se decide con el rol de la empresa activa.
  const org = await requireOrgManager();

  // El corte por plan va en la acción, no en el botón.
  const bloqueado = await checkPlanLimit(org.organization.id, "companies");
  if (bloqueado) return { error: bloqueado };

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    address: formData.get("address"),
    city: formData.get("city"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    ivaRate: formData.get("ivaRate"),
    retentionRate: formData.get("retentionRate"),
    afpRate: formData.get("afpRate"),
    healthRate: formData.get("healthRate"),
    unemploymentRate: formData.get("unemploymentRate"),
    anualBonusRate: formData.get("anualBonusRate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la empresa." };
  }

  const company = await db.company.create({
    data: {
      ...companyData(parsed.data),
      // La empresa nace dentro de la organización del usuario, y el creador queda
      // como ADMIN en ella.
      organizationId: org.organization.id,
    },
  });
  await db.membership.create({
    data: { userId: org.user.id, companyId: company.id, role: "ADMIN" },
  });
  // La empresa nace con las formas de pago base en su catálogo: puede editarlas
  // después (agregar la tarjeta de un banco, un vale...), pero nunca queda sin
  // las estándar.
  await db.paymentMethodCatalog.createMany({
    data: FORMAS_DE_PAGO_BASE.map((name) => ({ companyId: company.id, name })),
    skipDuplicates: true,
  });

  await recordAudit(
    { company, user: org.user },
    { action: "CREATE", entityType: "Company", entityId: company.id, summary: `Creó la empresa «${company.name}».` },
  );

  await setActiveCompany(company.id);
  await setFlash("success", "Empresa creada", company.name);
  revalidatePath("/", "layout");
  // Queda dentro de la organización y pasa a ser la empresa activa: se entra
  // directo a configurarla.
  redirect("/facturas/configuracion");
}

export async function updateCompany(
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede editar la empresa." };

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    address: formData.get("address"),
    city: formData.get("city"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    ivaRate: formData.get("ivaRate"),
    retentionRate: formData.get("retentionRate"),
    afpRate: formData.get("afpRate"),
    healthRate: formData.get("healthRate"),
    unemploymentRate: formData.get("unemploymentRate"),
    anualBonusRate: formData.get("anualBonusRate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la empresa." };
  }

  await db.company.update({ where: { id: ctx.company.id }, data: companyData(parsed.data) });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Company",
    entityId: ctx.company.id,
    summary: `Actualizó los datos de la empresa «${parsed.data.name}».`,
  });

  revalidatePath("/facturas/configuracion");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Agrega a la empresa ACTIVA un usuario que ya existe en el sistema.
// Es explícito por empresa: para dar acceso a otra empresa hay que cambiarse a
// ella y volver a agregarlo. El alcance «todas mis empresas» se quitó a propósito
// (Fase A): repartía accesos en bloque sin que el administrador viera en qué
// empresas quedaba el usuario.
export async function addMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar usuarios." };

  // El corte por plan va en la acción, no en el botón.
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "users");
  if (bloqueado) return { error: bloqueado };

  const parsed = memberSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "No existe un usuario con ese correo. Créalo en «Usuario nuevo»." };
  }

  const inventoryAccessRaw = String(formData.get("inventoryAccess") ?? "NONE");
  const inventoryAccess = inventoryAccessRaw === "EDIT" ? "EDIT" : inventoryAccessRaw === "VIEW" ? "VIEW" : "NONE";

  await db.membership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: ctx.company.id } },
    create: { userId: user.id, companyId: ctx.company.id, role: parsed.data.role, inventoryAccess, active: true },
    update: { role: parsed.data.role, inventoryAccess, active: true },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Membership",
    entityId: user.id,
    summary: `Agregó a ${user.name} (${user.email}) como ${parsed.data.role} en ${ctx.company.name}.`,
  });

  revalidatePath("/facturas/configuracion");
  return { ok: true };
}

/**
 * Guarda las excepciones por sección de una membresía.
 *
 * El rol dice qué tipo de persona es; esto dice qué puede tocar EN CONCRETO.
 * Existe para los contratos que no son "todo o nada": «esta persona entra a
 * RRHH, pero no a Inventario».
 *
 * Solo el ADMIN de la empresa puede cambiarlos, y queda auditado.
 */
export async function setMemberSectionAccess(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) {
    return { error: "Solo un administrador puede cambiar los permisos por sección." };
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const membership = await db.membership.findFirst({
    where: { id: membershipId, companyId: ctx.company.id },
    select: { id: true, userId: true, sectionAccess: true, user: { select: { name: true } } },
  });
  if (!membership) return { error: "Ese usuario no es miembro de esta empresa." };

  // Solo se guardan las excepciones: lo que no se toca lo decide el rol.
  const anterior = (membership.sectionAccess as Record<string, string> | null) ?? {};
  const siguiente: Record<string, string> = { ...anterior };

  for (const section of CONFIGURABLE_SECTIONS) {
    const valor = String(formData.get(`acceso:${section}`) ?? "").trim();
    if (!valor) continue;
    if (!SECTION_ACCESS_VALUES.includes(valor as SectionAccess)) continue;
    // "default" = dejar que lo decida el rol → se quita la excepción.
    if (valor === "default") {
      delete siguiente[section];
    } else {
      siguiente[section] = valor;
    }
  }

  const antes = anterior;
  await db.membership.update({
    where: { id: membership.id },
    data: { sectionAccess: Object.keys(siguiente).length ? siguiente : undefined },
  });

  if (JSON.stringify(antes) !== JSON.stringify(siguiente)) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Membership",
      entityId: membership.id,
      summary: `Cambió los permisos por sección de ${membership.user.name} en ${ctx.company.name}.`,
      changes: { sectionAccess: { before: antes, after: siguiente } },
    });
  }

  revalidatePath("/facturas/configuracion");
  return { ok: true };
}

// Crea un usuario nuevo y lo asocia a la empresa activa.
export async function createMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar usuarios." };

  // El corte por plan va en la acción, no en el botón.
  const bloqueado = await checkPlanLimit(ctx.user.orgMembership?.organizationId ?? null, "users");
  if (bloqueado) return { error: bloqueado };

  const parsed = newUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese correo. Agrégalo como miembro existente." };
  }

  const inventoryAccessRaw = String(formData.get("inventoryAccess") ?? "NONE");
  const inventoryAccess = inventoryAccessRaw === "EDIT" ? "EDIT" : inventoryAccessRaw === "VIEW" ? "VIEW" : "NONE";

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hash(parsed.data.password, 12),
      // El usuario nuevo nace como miembro de la organización de la empresa
      // activa (si existe), con rol MEMBER: no administra la cuenta por defecto.
      ...(ctx.company.organizationId
        ? {
            orgMembers: {
              create: { organizationId: ctx.company.organizationId, orgRole: "MEMBER" },
            },
          }
        : {}),
      memberships: {
        create: { companyId: ctx.company.id, role: parsed.data.role, inventoryAccess },
      },
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "User",
    entityId: created.id,
    summary: `Creó al usuario ${parsed.data.name} (${parsed.data.email}) como ${parsed.data.role} en ${ctx.company.name}.`,
  });

  revalidatePath("/facturas/configuracion");
  return { ok: true };
}

// Actualiza los umbrales de las alertas automáticas de la empresa activa.
export async function updateAlertSettings(formData: FormData): Promise<void> {
  const ctx = await requireContext("configuracion");
  if (!isAdmin(ctx)) redirect("/facturas/configuracion");

  const dueSoonDays = Number(formData.get("alertDueSoonDays") ?? "5");
  const porCobrarRaw = String(formData.get("alertPorCobrarLimit") ?? "").trim();
  const porPagarRaw = String(formData.get("alertPorPagarLimit") ?? "").trim();
  const reembRaw = String(formData.get("alertReembolsosLimit") ?? "").trim();

  await db.company.update({
    where: { id: ctx.company.id },
    data: {
      alertDueSoonDays: Number.isFinite(dueSoonDays) ? Math.max(1, Math.round(dueSoonDays)) : 5,
      alertPorCobrarLimit: porCobrarRaw === "" ? null : Number(porCobrarRaw),
      alertPorPagarLimit: porPagarRaw === "" ? null : Number(porPagarRaw),
      alertReembolsosLimit: reembRaw === "" ? null : Number(reembRaw),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Company",
    entityId: ctx.company.id,
    summary: "Actualizó los umbrales de alertas automáticas.",
  });

  revalidatePath("/facturas/configuracion");
  redirect("/facturas/configuracion");
}
export async function updateMemberRole(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar usuarios." };

  const membershipId = String(formData.get("membershipId") ?? "");
  const role = roleValues.find((value) => value === formData.get("role"));
  if (!membershipId || !role) return { error: "Revisa los datos." };

  const membership = await db.membership.findFirst({
    where: { id: membershipId, companyId: ctx.company.id },
    include: { user: { select: { name: true } } },
  });  if (!membership) return { error: "El usuario no pertenece a esta empresa." };

  if (membership.role === "ADMIN" && role !== "ADMIN") {
    const admins = await db.membership.count({
      where: { companyId: ctx.company.id, role: "ADMIN", active: true },
    });
    if (admins <= 1) return { error: "Debe quedar al menos un administrador." };
  }

  const inventoryAccessRaw = String(formData.get("inventoryAccess") ?? "NONE");
  const inventoryAccess = inventoryAccessRaw === "EDIT" ? "EDIT" : inventoryAccessRaw === "VIEW" ? "VIEW" : "NONE";

  // Al cambiar el rol, las excepciones por sección se van: estaban afinadas
  // para el rol viejo y dejarlas haría que un ascendido quedara con menos
  // permisos de los que su rol nuevo le da, sin que nadie lo pidiera.
  const sectionAccess = (membership.sectionAccess as Record<string, string> | null) ?? null;
  const limpiando = Object.keys(sectionAccess ?? {}).length > 0;

  await db.membership.update({
    where: { id: membershipId },
    data: {
      role,
      inventoryAccess,
      // Para vaciar un campo JSON hay que usar DbNull: `undefined` significa
      // «no lo toques».
      ...(limpiando ? { sectionAccess: Prisma.DbNull } : {}),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Membership",
    entityId: membershipId,
    summary: `Cambió el rol de ${membership.user.name} de ${membership.role} a ${role}.`,
    changes: {
      role: { before: membership.role, after: role },
      ...(limpiando
        ? { sectionAccess: { before: sectionAccess, after: null } }
        : {}),
    },
  });

  revalidatePath("/facturas/configuracion");
  return { ok: true };
}

// Elimina una empresa y todos sus datos (borrado en cascada).
// Exige ser ADMIN de esa empresa Y administrar la organización: borrar una
// empresa entera es una decisión de la cuenta, no de un administrador suelto.
// Nunca la empresa activa.
export async function deleteCompany(formData: FormData): Promise<void> {
  const user = await requireUser();

  // Borrar una empresa es de las acciones que la impersonación prohíbe: es
  // destructiva e irreversible, y el cliente tiene que hacerlo con su sesión.
  const bloqueado = await impersonationBlock(IMPERSONATION_FORBIDDEN.deleteCompany);
  if (bloqueado) {
    await setFlash("error", "No se pudo eliminar la empresa", bloqueado);
    redirect("/facturas/organizacion");
  }

  const companyId = String(formData.get("companyId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();

  // Debe administrar la organización y ser ADMIN de la empresa que quiere borrar.
  if (!isOrgManager(user)) {
    await setFlash("error", "No se pudo eliminar la empresa", "Solo el dueño o un administrador de la organización puede hacerlo.");
    redirect("/facturas/organizacion");
  }

  const membership = user.memberships.find(
    (item) => item.companyId === companyId && item.role === "ADMIN",
  );
  if (!membership) {
    await setFlash("error", "No se pudo eliminar la empresa", "Solo un administrador de esa empresa puede hacerlo.");
    redirect("/facturas/organizacion");
  }

  // No se puede borrar la empresa activa.
  if (membership.companyId === (await getActiveMembership())?.company.id) {
    await setFlash("error", "No se pudo eliminar la empresa", "Cambia a otra empresa antes de eliminarla.");
    redirect("/facturas/organizacion");
  }

  const company = membership.company;

  // El nombre escrito debe coincidir exactamente con el de la empresa.
  if (confirmName !== company.name) {
    await setFlash("error", "No se pudo eliminar la empresa", "El nombre escrito no coincide con la empresa.");
    redirect("/facturas/organizacion");
  }

  await db.company.delete({ where: { id: companyId } });

  await setFlash("success", "Empresa eliminada", company.name);
  revalidatePath("/", "layout");
  redirect("/facturas/organizacion");
}

// Cambia el rol de un miembro dentro de la ORGANIZACIÓN (Nivel 1).
// Solo el OWNER reparte roles de organización; la invariante es que siempre quede
// al menos un OWNER activo. Se audita en la empresa activa.
export async function setOrgRole(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const org = await requireOrgManager();
  if (!isOrgOwner(org.user)) {
    return { error: "Solo el dueño de la organización puede cambiar los roles de organización." };
  }

  const userId = String(formData.get("userId") ?? "");
  const orgRole = orgRoleValues.find((value) => value === formData.get("orgRole"));
  if (!userId || !orgRole) return { error: "Revisa los datos." };

  const member = await db.orgMember.findFirst({
    where: { userId, organizationId: org.organization.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member) return { error: "El usuario no pertenece a esta organización." };

  // No quedarse sin dueño: si este OWNER baja de rol, debe quedar otro activo.
  if (member.orgRole === "OWNER" && orgRole !== "OWNER") {
    const owners = await db.orgMember.count({
      where: { organizationId: org.organization.id, orgRole: "OWNER", active: true },
    });
    if (owners <= 1) {
      return { error: "Debe quedar al menos un dueño activo en la organización." };
    }
  }

  await db.orgMember.update({ where: { id: member.id }, data: { orgRole } });

  const ctx = await requireContext().catch(() => null);
  if (ctx) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "OrgMember",
      entityId: member.id,
      summary: `Cambió el rol de organización de ${member.user.name} (${member.user.email}) de ${member.orgRole} a ${orgRole}.`,
      changes: { orgRole: { before: member.orgRole, after: orgRole } },
    });
  }

  revalidatePath("/facturas/organizacion");
  return { ok: true };
}

// Edita el nombre de la ORGANIZACIÓN (el «holding» de la cuenta). Solo lo hace
// quien administra la organización, y solo cuando hay más de una empresa: con una
// sola empresa la cuenta se llama como la empresa y no hay nada que nombrar.
export async function updateOrganization(
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const org = await requireOrgManager();

  const companyCount = await db.company.count({
    where: { organizationId: org.organization.id },
  });
  if (companyCount <= 1) {
    return { error: "Con una sola empresa, la cuenta se llama como la empresa." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }
  if (name === org.organization.name) return { ok: true };

  await db.organization.update({
    where: { id: org.organization.id },
    data: { name },
  });

  const ctx = await requireContext().catch(() => null);
  if (ctx) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Organization",
      entityId: org.organization.id,
      summary: `Cambió el nombre de la organización de «${org.organization.name}» a «${name}».`,
      changes: { name: { before: org.organization.name, after: name } },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// Alterna el permiso `canSwitchCompanies` de un miembro de la organización.
// Solo el OWNER lo otorga: ver todas las empresas del grupo es un permiso de
// dueño, no del administrador de una empresa suelta.
export async function _toggleCanSwitchCompaniesRaw(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const org = await requireOrgManager();
  if (!isOrgOwner(org.user)) {
    return { error: "Solo el dueño de la organización puede otorgar el permiso de revisión multiempresa." };
  }

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Falta el userId del usuario." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "El usuario no existe." };

  const member = await db.orgMember.findFirst({
    where: { userId, organizationId: org.organization.id },
  });
  if (!member) {
    return { error: `El usuario ${target.email} no pertenece a esta organización.` };
  }

  const nextValue = !member.canSwitchCompanies;

  // El último dueño activo no puede perder su propio permiso de revisión: sin él
  // no podría volver a administrar las empresas de la organización.
  if (!nextValue && member.orgRole === "OWNER") {
    const owners = await db.orgMember.count({
      where: { organizationId: org.organization.id, orgRole: "OWNER", active: true, canSwitchCompanies: true },
    });
    if (owners <= 1 && member.canSwitchCompanies) {
      return { error: "El último dueño activo debe conservar el permiso de revisar las empresas." };
    }
  }

  await db.orgMember.update({
    where: { id: member.id },
    data: { canSwitchCompanies: nextValue },
  });

  const ctx = await requireContext().catch(() => null);
  if (ctx) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "OrgMember",
      entityId: member.id,
      summary: `${nextValue ? "Habilitó" : "Deshabilitó"} el permiso de revisión multiempresa a ${target.name} (${target.email}).`,
      changes: { canSwitchCompanies: { before: member.canSwitchCompanies, after: nextValue } },
    });
  }

  revalidatePath("/facturas/organizacion");
  return { ok: true };
}

// Wrapper de firma simple para usar en `<form action={...}>`.
export async function toggleCanSwitchCompanies(formData: FormData): Promise<void> {
  await _toggleCanSwitchCompaniesRaw(undefined, formData);
}

// Desactiva (o reactiva) la pertenencia de un usuario a la ORGANIZACIÓN, sin borrar
// la cuenta. Desactivar corta su acceso a las empresas del grupo sin perder la
// trazabilidad de auditoría. Solo el OWNER lo hace, y no puede dejarse la
// organización sin dueño activo.
export async function setOrgMemberActive(formData: FormData): Promise<void> {
  const org = await requireOrgManager();
  if (!isOrgOwner(org.user)) redirect("/facturas/organizacion");

  const userId = String(formData.get("userId") ?? "");
  const nextActive = String(formData.get("active") ?? "") === "true";

  const member = await db.orgMember.findFirst({
    where: { userId, organizationId: org.organization.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member) redirect("/facturas/organizacion");

  if (!nextActive && member.orgRole === "OWNER") {
    const owners = await db.orgMember.count({
      where: { organizationId: org.organization.id, orgRole: "OWNER", active: true },
    });
    if (owners <= 1) {
      await setFlash("error", "No se pudo desactivar", "Debe quedar al menos un dueño activo en la organización.");
      redirect("/facturas/organizacion");
    }
  }

  await db.orgMember.update({ where: { id: member.id }, data: { active: nextActive } });

  // Al desactivar (o reactivar) la pertenencia a la organización se ajustan las
  // membresías de sus empresas: sin esto, el usuario seguiría viendo las empresas
  // del grupo (las memberships son de la empresa, no de la organización) y la
  // desactivación no cortaría nada.
  const orgCompanies = await db.company.findMany({
    where: { organizationId: org.organization.id },
    select: { id: true },
  });
  if (orgCompanies.length > 0) {
    await db.membership.updateMany({
      where: { userId: member.userId, companyId: { in: orgCompanies.map((c) => c.id) } },
      data: { active: nextActive },
    });
  }

  const ctx = await requireContext().catch(() => null);
  if (ctx) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "OrgMember",
      entityId: member.id,
      summary: `${nextActive ? "Reactivó" : "Desactivó"} a ${member.user.name} (${member.user.email}) en la organización.`,
      changes: { active: { before: member.active, after: nextActive } },
    });
  }

  revalidatePath("/facturas/organizacion");
  redirect("/facturas/organizacion");
}

// Desactiva (o reactiva) el acceso de un usuario a UNA empresa, sin borrar la
// cuenta: el usuario conserva su historial y su auditoría. Se prefiere esto a
// borrar, que rompe la trazabilidad.
export async function setMembershipActive(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) redirect("/facturas/configuracion");

  const membershipId = String(formData.get("membershipId") ?? "");
  const nextActive = String(formData.get("active") ?? "") === "true";

  const membership = await db.membership.findFirst({
    where: { id: membershipId, companyId: ctx.company.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!membership) redirect("/facturas/configuracion");

  // No desactivar al último administrador activo de la empresa.
  if (!nextActive && membership.role === "ADMIN") {
    const admins = await db.membership.count({
      where: { companyId: ctx.company.id, role: "ADMIN", active: true },
    });
    if (admins <= 1) {
      await setFlash("error", "No se pudo desactivar", "Debe quedar al menos un administrador activo en la empresa.");
      redirect("/facturas/configuracion");
    }
  }

  await db.membership.update({ where: { id: membership.id }, data: { active: nextActive } });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Membership",
    entityId: membership.id,
    summary: `${nextActive ? "Reactivó" : "Desactivó"} el acceso de ${membership.user.name} (${membership.user.email}) a ${ctx.company.name}.`,
    changes: { active: { before: membership.active, after: nextActive } },
  });

  revalidatePath("/facturas/configuracion");
  redirect("/facturas/configuracion");
}
