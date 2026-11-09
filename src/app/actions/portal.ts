"use server";

// El portal del apoderado: emitir su código de acceso y dejar que entre.
//
// El apoderado no es personal del colegio, así que no usa la sesión de
// empleados: entra con un código que el colegio le entrega en persona. Todo lo
// que hace queda en el registro de accesos.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAccess, requestContext } from "@/lib/access-log";
import { db } from "@/lib/db";
import { RateLimiter } from "@/lib/rate-limit";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import {
  cerrarSesionPortal,
  crearSesionPortal,
  generarCodigoAcceso,
  normalizarCodigo,
} from "@/lib/school-portal";

export type PortalFormState = { error?: string; ok?: boolean; codigo?: string } | undefined;

// Límite de intentos de acceso al portal, por IP. Es el mismo criterio del
// login: en memoria, y a mover a Redis si el producto crece a varias
// instancias.
const limiteIntentos = new RateLimiter({ max: 10, windowMs: 15 * 60_000 });

/**
 * Emite (o rota) el código de acceso de un apoderado.
 *
 * Es la acción del colegio: genera el código, lo muestra para entregarlo y
 * deja constancia de cuándo se emitió.
 */
export async function issueGuardianCode(
  _prev: PortalFormState,
  formData: FormData,
): Promise<PortalFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no puede emitir códigos de acceso." };
  }

  const guardianId = String(formData.get("guardianId") ?? "").trim();
  if (!guardianId) return { error: "Falta el apoderado." };

  const apoderado = await db.guardian.findFirst({
    where: { id: guardianId, schoolId: ctx.school.id },
    select: { id: true, name: true },
  });
  if (!apoderado) return { error: "Ese apoderado no es de este colegio." };

  const codigo = generarCodigoAcceso();
  await db.guardian.update({
    where: { id: guardianId },
    data: { accessCode: codigo, accessCodeCreatedAt: new Date() },
  });

  // Las sesiones abiertas con el código anterior dejan de servir: el código
  // es el mismo secreto, y si cambió es porque hay que cortar el acceso.
  await db.guardianSession.deleteMany({ where: { guardianId } });

  // Se emite desde la ficha del alumno o desde la pantalla de apoderados del
  // colegio: hay que refrescar las dos, porque el código se ve en las dos.
  const studentId = String(formData.get("studentId") ?? "").trim();
  if (studentId) revalidatePath(`/colegios/estudiantes/${studentId}`);
  revalidatePath("/colegios/apoderados");

  return { ok: true, codigo };
}

/** Entra al portal con el código de la familia. */
export async function portalLogin(
  _prev: PortalFormState,
  formData: FormData,
): Promise<PortalFormState> {
  const crudo = String(formData.get("codigo") ?? "").trim();
  if (!crudo) return { error: "Escribe el código que te dio el colegio." };

  // Cuando la familia entró por el enlace de su colegio (`/c/<colegio>`), el
  // código tiene que ser de ESE colegio: si no, el enlace de un colegio serviría
  // para entrar a otro, y la familia vería datos que no son de su comunidad.
  const schoolId = String(formData.get("schoolId") ?? "").trim() || null;

  const { ip, userAgent } = await requestContext();

  // Límite de intentos por IP: el código tiene ocho caracteres, pero probar
  // sin parar es lo primero que haría quien quiere ver los datos de un menor.
  if (!limiteIntentos.allow(ip ?? "desconocida")) {
    return { error: "Demasiados intentos. Espera un momento y vuelve a intentar." };
  }

  const codigo = normalizarCodigo(crudo);
  const apoderado = await db.guardian.findFirst({
    where: schoolId ? { accessCode: codigo, schoolId } : { accessCode: codigo },
    select: { id: true, name: true, email: true },
  });

  if (!apoderado) {
    // OJO: al registro NO se escribe el código que se intentó. Ese código
    // puede ser el válido de otra familia, y el log es de lectura fácil.
    await recordAccess({
      userEmail: "código inválido",
      kind: "portal_failed",
      ip,
      userAgent,
    });
    return { error: "El código no es válido. Si no lo tienes, pídelo en la secretaría." };
  }

  // El acierto no gasta intento: una familia que se equivoca una vez y acierta
  // al segundo tiene que poder entrar.
  limiteIntentos.reset(ip ?? "desconocida");

  await crearSesionPortal(apoderado.id);
  await db.guardian.update({
    where: { id: apoderado.id },
    data: { lastAccessAt: new Date() },
  });
  await recordAccess({
    userEmail: apoderado.email ?? apoderado.name,
    kind: "portal_login",
    ip,
    userAgent,
  });

  // Sin este redirect la familia quedaba en el formulario con la sesión ya
  // creada: el botón volvía a "Entrar" y no pasaba nada.
  redirect("/apoderado");
}

/** Sale del portal. */
export async function portalLogout(): Promise<void> {
  await cerrarSesionPortal();
  // Sin esto la pantalla quedaba mostrando los datos de la familia con la
  // sesión ya cerrada, hasta que se recargara a mano.
  redirect("/apoderado");
}

/**
 * Verifica si un código de acceso al portal sigue vigente.
 *
 * Es una acción pública: cualquier apoderado puede escribir su código para
 * saber si sigue activo. No requiere sesión de colegio ni de empleado, porque
 * el apoderado no tiene sesión de empleado: solo tiene el código que el
 * colegio le entregó.
 */
export async function verificarCodigoAcceso(
  _prev: { error?: string; ok?: boolean; codigo?: string; valido?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; codigo?: string; valido?: boolean }> {
  const crudo = String(formData.get("codigo") ?? "").trim();
  if (!crudo) {
    return { error: "Escribe el código que te dio el colegio." };
  }

  const codigo = crudo.toUpperCase();

  const apoderado = await db.guardian.findFirst({
    where: { accessCode: codigo },
    select: {
      id: true,
      name: true,
      accessCode: true,
      accessCodeCreatedAt: true,
      lastAccessAt: true,
      schoolId: true,
    },
  });

  if (!apoderado) {
    return { error: "El código no es válido. Si no lo tienes, pídelo en la secretaría." };
  }

  return {
    ok: true,
    valido: true,
    codigo: apoderado.accessCode,
  };
}

/**
 * Historial de accesos al portal de una familia.
 *
 * Es una Server Action porque la pantalla de apoderados es un Client
 * Component: importar `db` desde ahí arrastraría `pg` y los módulos de Node
 * (`fs`, `net`, `tls`, `dns`) al bundle del navegador y el build falla.
 *
 * Valida que el apoderado sea del colegio abierto y que el rol pueda editar
 * apoderados: el panel solo se muestra a quien puede, pero las acciones son
 * alcanzables por POST directo.
 */
export async function listGuardianPortalAccessAction(
  guardianId: string,
  limit = 20,
): Promise<{ id: string; createdAt: string; ip: string | null }[]> {
  const ctx = await requireSchoolContext("apoderados");
  if (!schoolCanWrite(ctx, "apoderados")) return [];

  const apoderado = await db.guardian.findFirst({
    where: { id: guardianId, schoolId: ctx.school.id },
    select: { email: true, name: true },
  });
  if (!apoderado) return [];

  // El registro guarda como `userEmail` el correo del apoderado o, si no
  // tiene, su nombre. Se busca por ambos y se filtra por accesos al portal.
  const condiciones: { userEmail: { contains: string } }[] = [];
  if (apoderado.email) condiciones.push({ userEmail: { contains: apoderado.email } });
  if (apoderado.name.trim()) condiciones.push({ userEmail: { contains: apoderado.name.trim() } });
  if (condiciones.length === 0) return [];

  const filas = await db.accessLog.findMany({
    where: { kind: "portal_login", OR: condiciones },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Math.max(1, limit)),
    select: { id: true, ip: true, createdAt: true },
  });

  return filas.map((fila) => ({
    id: fila.id,
    createdAt: fila.createdAt.toISOString(),
    ip: fila.ip,
  }));
}
