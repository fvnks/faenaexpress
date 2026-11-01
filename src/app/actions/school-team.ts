"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";

export type TeamFormState = { error?: string; ok?: boolean } | undefined;

const ROLES = ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "STAFF", "VIEWER"] as const;

function esRolValido(valor: string): valor is (typeof ROLES)[number] {
  return (ROLES as readonly string[]).includes(valor);
}

/**
 * Suma a una persona al equipo del colegio.
 *
 * Hay dos casos y no son el mismo:
 *
 * - La persona **no tiene cuenta**: se crea con una contraseña provisional que
 *   tiene que cambiar al entrar (como en la consola de plataforma).
 * - La persona **ya tiene cuenta**: se la suma al colegio sin tocar su
 *   contraseña. Es el caso normal cuando ya trabaja en otra empresa del
 *   mismo grupo, o cuando el colegio es el mismo de siempre.
 *
 * Si el rol es docente, además hay que vincular su ficha: sin ese vínculo el
 * sistema no sabe qué cursos son suyos y el alcance queda abierto.
 */
export async function inviteTeamMember(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const ctx = await requireSchoolContext("equipo");
  if (!schoolCanWrite(ctx, "equipo")) {
    return { error: "Tu rol no permite sumar gente al equipo." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const docenteId = String(formData.get("docenteId") ?? "").trim() || null;

  if (nombre.length < 2) return { error: "Escribe el nombre de la persona." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un correo válido." };
  }
  if (!esRolValido(roleRaw)) return { error: "Elige el rol de la persona." };

  // La ficha de docente tiene que ser de este colegio y estar libre.
  let docente: { id: string; name: string; userId: string | null } | null = null;
  if (docenteId) {
    docente = await db.teacher.findFirst({
      where: { id: docenteId, schoolId: ctx.school.id },
      select: { id: true, name: true, userId: true },
    });
    if (!docente) return { error: "La ficha de docente no es de este colegio." };
    if (docente.userId) {
      return { error: `Esa ficha ya está vinculada a otra persona (${docente.name}).` };
    }
  }

  if (roleRaw === "TEACHER" && !docente) {
    return {
      error:
        "Un docente necesita su ficha para que el sistema sepa qué cursos son suyos. Crea la ficha en Docentes y luego vuelve a sumarlo.",
    };
  }

  const existente = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (existente) {
    const membresia = await db.schoolMembership.findUnique({
      where: { userId_schoolId: { userId: existente.id, schoolId: ctx.school.id } },
      select: { id: true },
    });
    if (membresia) {
      return { error: "Esa persona ya está en el equipo de este colegio." };
    }
  }

  if (!existente && password.length < 8) {
    return { error: "La contraseña provisional debe tener al menos 8 caracteres." };
  }

  // El hash se calcula ANTES de abrir la transacción: bcrypt es lento (12
  // rondas) y no tiene por qué hacerlo con la transacción abierta.
  const passwordHash = !existente ? await hashPassword(password) : null;

  try {
    await db.$transaction(async (tx) => {
      let userId = existente?.id ?? null;

      if (!userId) {
        const creado = await tx.user.create({
          data: {
            name: nombre,
            email,
            passwordHash: passwordHash as string,
            // El colegio conoce la clave: la persona la cambia al entrar.
            mustChangePassword: true,
          },
          select: { id: true },
        });
        userId = creado.id;
      }

      await tx.schoolMembership.create({
        data: { userId, schoolId: ctx.school.id, role: roleRaw },
      });

      if (docente) {
        await tx.teacher.update({
          where: { id: docente.id },
          data: { userId },
        });
      }
    });
  } catch (cause) {
    // Dos secretarias sumando a la misma persona a la vez: el correo es
    // único y la membresía también. No es un error de la app.
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
      return { error: "Esa persona ya está en el equipo de este colegio." };
    }
    throw cause;
  }

  revalidatePath("/colegios/equipo");
  revalidatePath("/colegios/docentes");
  return { ok: true };
}

/** Cambia el rol de una persona del equipo. */
export async function changeTeamRole(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const ctx = await requireSchoolContext("equipo");
  if (!schoolCanWrite(ctx, "equipo")) {
    return { error: "Tu rol no permite cambiar roles." };
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  if (!membershipId) return { error: "Falta la persona." };
  if (!esRolValido(roleRaw)) return { error: "Elige un rol." };

  const membresia = await db.schoolMembership.findFirst({
    where: { id: membershipId, schoolId: ctx.school.id },
    select: { id: true, userId: true, role: true },
  });
  if (!membresia) return { error: "Esa persona no está en el equipo de este colegio." };

  // La dirección no se quita a sí misma: si lo hiciera, el colegio se quedaría
  // sin nadie que administre el equipo.
  if (membresia.userId === ctx.user.id && roleRaw !== "DIRECTOR") {
    return { error: "No puedes cambiar tu propio rol: pídelo a otra persona de la dirección." };
  }

  await db.schoolMembership.update({ where: { id: membresia.id }, data: { role: roleRaw } });

  revalidatePath("/colegios/equipo");
  return { ok: true };
}

/**
 * Saca a una persona del equipo.
 *
 * La membresía queda desactivada, no borrada: la trazabilidad de lo que esa
 * persona registró (notas, asistencia, clases) tiene que seguir apuntando a
 * alguien real.
 */
export async function removeTeamMember(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const ctx = await requireSchoolContext("equipo");
  if (!schoolCanWrite(ctx, "equipo")) {
    return { error: "Tu rol no permite sacar gente del equipo." };
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) return { error: "Falta la persona." };

  const membresia = await db.schoolMembership.findFirst({
    where: { id: membershipId, schoolId: ctx.school.id },
    select: { id: true, userId: true },
  });
  if (!membresia) return { error: "Esa persona no está en el equipo de este colegio." };

  if (membresia.userId === ctx.user.id) {
    return { error: "No puedes sacarte del equipo a ti mismo." };
  }

  await db.$transaction(async (tx) => {
    await tx.schoolMembership.update({ where: { id: membresia.id }, data: { active: false } });
    // La ficha de docente queda suelta: el plan del curso la sigue pidiendo.
    await tx.teacher.updateMany({
      where: { userId: membresia.userId, schoolId: ctx.school.id },
      data: { userId: null },
    });
  });

  revalidatePath("/colegios/equipo");
  revalidatePath("/colegios/docentes");
  return { ok: true };
}

/**
 * Vincula la ficha de un docente con la cuenta de una persona del equipo.
 *
 * Es el caso "ya tenía cuenta y ya estaba en el colegio": la ficha del docente
 * se creó aparte (por ejemplo, cuando se armó el plan del curso) y ahora se le
 * enchufa la persona.
 */
export async function linkTeacherAccount(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const ctx = await requireSchoolContext("equipo");
  if (!schoolCanWrite(ctx, "equipo")) {
    return { error: "Tu rol no permite vincular docentes." };
  }

  const docenteId = String(formData.get("docenteId") ?? "").trim();
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!docenteId || !membershipId) return { error: "Elige el docente y la persona." };

  const docente = await db.teacher.findFirst({
    where: { id: docenteId, schoolId: ctx.school.id },
    select: { id: true, name: true, userId: true },
  });
  if (!docente) return { error: "Ese docente no es de este colegio." };
  if (docente.userId) {
    return { error: `La ficha de ${docente.name} ya está vinculada a una cuenta.` };
  }

  const membresia = await db.schoolMembership.findFirst({
    where: { id: membershipId, schoolId: ctx.school.id, active: true },
    select: { id: true, userId: true, role: true },
  });
  if (!membresia) return { error: "Esa persona no está en el equipo de este colegio." };

  const yaVinculado = await db.teacher.findFirst({
    where: { userId: membresia.userId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (yaVinculado) {
    return { error: "Esa persona ya tiene una ficha de docente en este colegio." };
  }

  await db.teacher.update({ where: { id: docente.id }, data: { userId: membresia.userId } });

  revalidatePath("/colegios/equipo");
  revalidatePath("/colegios/docentes");
  return { ok: true };
}

/** Suelta la ficha de docente de una persona (la cuenta sigue en el equipo). */
export async function unlinkTeacherAccount(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const ctx = await requireSchoolContext("equipo");
  if (!schoolCanWrite(ctx, "equipo")) {
    return { error: "Tu rol no permite desvincular docentes." };
  }

  const docenteId = String(formData.get("docenteId") ?? "").trim();
  if (!docenteId) return { error: "Falta el docente." };

  const docente = await db.teacher.findFirst({
    where: { id: docenteId, schoolId: ctx.school.id },
    select: { id: true, name: true, userId: true },
  });
  if (!docente) return { error: "Ese docente no es de este colegio." };
  if (!docente.userId) return { error: "Esa ficha ya está suelta." };

  await db.teacher.update({ where: { id: docente.id }, data: { userId: null } });

  revalidatePath("/colegios/equipo");
  revalidatePath("/colegios/docentes");
  return { ok: true };
}
