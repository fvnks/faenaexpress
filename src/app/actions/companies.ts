"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COMPANY_COOKIE, getCurrentUser, getActiveMembership, isAdmin, requireContext, requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { companySchema, memberSchema, newUserSchema, roleValues } from "@/lib/validation";

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

// Cambia la empresa activa (solo entre las empresas del usuario).
export async function switchCompany(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("companyId") ?? "");
  const rawRedirect = String(formData.get("redirectTo") ?? "");
  const redirectTo = rawRedirect === "configuracion" ? "/dashboard/configuracion" : "/dashboard";

  const membership = user.memberships.find((item) => item.companyId === companyId);
  if (!membership) redirect("/dashboard");

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
  };
}

// Crea una empresa nueva; quien la crea queda como ADMIN en ella.
export async function createCompany(
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const user = await requireUser();

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    address: formData.get("address"),
    city: formData.get("city"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    ivaRate: formData.get("ivaRate"),
    retentionRate: formData.get("retentionRate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la empresa." };
  }

  const company = await db.company.create({ data: companyData(parsed.data) });
  await db.membership.create({
    data: { userId: user.id, companyId: company.id, role: "ADMIN" },
  });

  await recordAudit(
    { company, user },
    { action: "CREATE", entityType: "Company", entityId: company.id, summary: `Creó la empresa «${company.name}».` },
  );

  await setActiveCompany(company.id);
  await setFlash("success", "Empresa creada", company.name);
  revalidatePath("/", "layout");
  redirect("/dashboard/configuracion");
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

  revalidatePath("/dashboard/configuracion");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Agrega a una empresa un usuario que ya existe en el sistema.
// Con scope "todas" lo hace miembro de todas las empresas donde el
// administrador actual tiene rol ADMIN.
export async function addMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar usuarios." };

  const parsed = memberSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const scope = String(formData.get("scope") ?? "esta") === "todas" ? "todas" : "esta";

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "No existe un usuario con ese correo. Créalo en «Usuario nuevo»." };
  }

  const empresas =
    scope === "todas"
      ? ctx.user.memberships.filter((membership) => membership.role === "ADMIN")
      : ctx.user.memberships.filter((membership) => membership.companyId === ctx.company.id);

  const inventoryAccessRaw = String(formData.get("inventoryAccess") ?? "NONE");
  const inventoryAccess = inventoryAccessRaw === "EDIT" ? "EDIT" : inventoryAccessRaw === "VIEW" ? "VIEW" : "NONE";

  let creadas = 0;
  for (const membership of empresas) {
    const esActiva = membership.companyId === ctx.company.id;
    await db.membership.upsert({
      where: { userId_companyId: { userId: user.id, companyId: membership.companyId } },
      // En la empresa activa el rol elegido manda; en las otras solo se
      // garantiza el acceso sin pisar roles que ya tuviera.
      create: { userId: user.id, companyId: membership.companyId, role: parsed.data.role, inventoryAccess, active: true },
      update: esActiva ? { role: parsed.data.role, inventoryAccess, active: true } : { active: true },
    });
    creadas += 1;
  }

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Membership",
    entityId: user.id,
    summary: `Agregó a ${user.name} (${user.email}) como ${parsed.data.role} en ${creadas} ${creadas === 1 ? "empresa" : "empresas"}.`,
  });

  revalidatePath("/dashboard/configuracion");
  return { ok: true };
}

// Crea un usuario nuevo y lo asocia a la empresa activa.
export async function createMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) return { error: "Solo un administrador puede gestionar usuarios." };

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

  const scope = String(formData.get("scope") ?? "esta") === "todas" ? "todas" : "esta";

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hash(parsed.data.password, 12),
      memberships: {
        create: { companyId: ctx.company.id, role: parsed.data.role },
      },
    },
  });

  const inventoryAccessRaw = String(formData.get("inventoryAccess") ?? "NONE");
  const inventoryAccess = inventoryAccessRaw === "EDIT" ? "EDIT" : inventoryAccessRaw === "VIEW" ? "VIEW" : "NONE";

  if (scope === "todas") {
    const otras = ctx.user.memberships.filter(
      (membership) => membership.role === "ADMIN" && membership.companyId !== ctx.company.id,
    );
    for (const membership of otras) {
      await db.membership.create({
        data: { userId: created.id, companyId: membership.companyId, role: parsed.data.role, inventoryAccess },
      });
    }
  }

  const alcance = scope === "todas" ? " en todas sus empresas" : "";
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "User",
    summary: `Creó al usuario ${parsed.data.name} (${parsed.data.email}) como ${parsed.data.role}${alcance}.`,
  });

  revalidatePath("/dashboard/configuracion");
  return { ok: true };
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
  });
  if (!membership) return { error: "El usuario no pertenece a esta empresa." };

  if (membership.role === "ADMIN" && role !== "ADMIN") {
    const admins = await db.membership.count({
      where: { companyId: ctx.company.id, role: "ADMIN", active: true },
    });
    if (admins <= 1) return { error: "Debe quedar al menos un administrador." };
  }

  const inventoryAccessRaw = String(formData.get("inventoryAccess") ?? "NONE");
  const inventoryAccess = inventoryAccessRaw === "EDIT" ? "EDIT" : inventoryAccessRaw === "VIEW" ? "VIEW" : "NONE";

  await db.membership.update({ where: { id: membershipId }, data: { role, inventoryAccess } });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Membership",
    entityId: membershipId,
    summary: `Cambió el rol de ${membership.user.name} de ${membership.role} a ${role}.`,
    changes: { role: { before: membership.role, after: role } },
  });

  revalidatePath("/dashboard/configuracion");
  return { ok: true };
}

export async function removeMember(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) redirect("/dashboard/configuracion");

  const membershipId = String(formData.get("membershipId") ?? "");
  const membership = await db.membership.findFirst({
    where: { id: membershipId, companyId: ctx.company.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!membership || membership.userId === ctx.user.id) {
    redirect("/dashboard/configuracion");
  }

  if (membership.role === "ADMIN") {
    const admins = await db.membership.count({
      where: { companyId: ctx.company.id, role: "ADMIN", active: true },
    });
    if (admins <= 1) redirect("/dashboard/configuracion");
  }

  await db.membership.delete({ where: { id: membershipId } });

  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "Membership",
    entityId: membershipId,
    summary: `Quitó a ${membership.user.name} (${membership.user.email}) de la empresa.`,
  });

  revalidatePath("/dashboard/configuracion");
  redirect("/dashboard/configuracion");
}

// Elimina una empresa y todos sus datos (borrado en cascada).
// Solo un ADMIN de esa empresa puede hacerlo, y nunca la empresa activa.
export async function deleteCompany(formData: FormData): Promise<void> {
  const user = await requireUser();

  const companyId = String(formData.get("companyId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();

  // Verifica que el usuario sea ADMIN de la empresa que quiere borrar.
  const membership = user.memberships.find(
    (item) => item.companyId === companyId && item.role === "ADMIN",
  );
  if (!membership) {
    await setFlash("error", "No se pudo eliminar la empresa", "Solo un administrador de esa empresa puede hacerlo.");
    redirect("/dashboard/configuracion");
  }

  // No se puede borrar la empresa activa.
  if (membership.companyId === (await getActiveMembership())?.company.id) {
    await setFlash("error", "No se pudo eliminar la empresa", "Cambia a otra empresa antes de eliminarla.");
    redirect("/dashboard/configuracion");
  }

  const company = membership.company;

  // El nombre escrito debe coincidir exactamente con el de la empresa.
  if (confirmName !== company.name) {
    await setFlash("error", "No se pudo eliminar la empresa", "El nombre escrito no coincide con la empresa.");
    redirect("/dashboard/configuracion");
  }

  await db.company.delete({ where: { id: companyId } });

  await setFlash("success", "Empresa eliminada", company.name);
  revalidatePath("/", "layout");
  redirect("/dashboard/configuracion");
}
