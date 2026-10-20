"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAccess } from "@/lib/access-log";
import { db } from "@/lib/db";
import { enabledModules, MODULE_COOKIE, postLoginDestination } from "@/lib/modules";
import { verifyPassword } from "@/lib/password";
import { RateLimiter } from "@/lib/rate-limit";
import { createSession, deleteSession } from "@/lib/session";
import { requiresTwoFactor } from "@/lib/two-factor";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string; needsCode?: boolean } | undefined;

// Límite de intentos de login. El primero frena a quien prueba contraseñas
// desde una IP; el segundo frena a quien prueba contra una cuenta desde
// varias IPs (credential stuffing).
const limitPorIp = new RateLimiter({ max: 20, windowMs: 15 * 60_000 });
const limitPorCuenta = new RateLimiter({ max: 10, windowMs: 15 * 60_000 });

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Revisa el correo y la contraseña." };
  }

  const email = parsed.data.email.toLowerCase();
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "desconocida";

  if (!limitPorIp.allow(`login-ip:${ip}`)) {
    return { error: "Demasiados intentos desde este equipo. Espera unos minutos." };
  }
  if (!limitPorCuenta.allow(`login-cuenta:${email}`)) {
    return { error: "Demasiados intentos con esta cuenta. Espera unos minutos." };
  }

  const user = await db.user.findUnique({
    where: { email },
    include: {
      orgMembers: {
        where: { active: true },
        select: { organizationId: true },
        take: 1,
      },
    },
  });
  if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    // Se registra el intento fallido: es la señal de alguien probando
    // contraseñas. Sin organización (puede no existir) y sin usuario.
    await recordAccess({
      userEmail: email,
      kind: "failed",
      ip,
      userAgent: headerList.get("user-agent")?.slice(0, 300) ?? null,
    });
    return { error: "Correo o contraseña incorrectos." };
  }

  // "Recuérdame": sesión persistente de 90 días con renovación automática.
  // Sin marcar, la sesión vive mientras el navegador esté abierto.
  const remember = formData.get("remember") === "on" || formData.get("remember") === "true";

  // Dueño de organización y personal de plataforma necesitan segundo factor. La
  // sesión nace «pendiente»: con ella no se puede usar la app, solo confirmar
  // el 2FA (ver `requireUser`).
  if (await requiresTwoFactor(user.id)) {
    await createSession(user.id, remember, { totpPending: true });
    await recordAccess({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.orgMembers?.[0]?.organizationId ?? null,
      kind: "login",
      ip,
      userAgent: headerList.get("user-agent")?.slice(0, 300) ?? null,
    });
    redirect("/perfil/2fa");
  }

  await createSession(user.id, remember);

  // El acceso queda anotado en la cuenta: el dueño puede ver quién entró.
  await recordAccess({
    userId: user.id,
    userEmail: user.email,
    organizationId: user.orgMembers?.[0]?.organizationId ?? null,
    kind: "login",
    ip,
    userAgent: headerList.get("user-agent")?.slice(0, 300) ?? null,
  });

  // Un módulo → directo. Varios → selector. La decisión es del servidor.
  const destination = await postLoginDestination(user.id);

  // Si entra directo a un módulo, queda marcado como "último usado" para la
  // sugerencia del selector.
  const modules = await enabledModules(user.id);
  if (modules.length === 1) {
    const cookieStore = await cookies();
    cookieStore.set(MODULE_COOKIE, modules[0].code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect(destination);
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}