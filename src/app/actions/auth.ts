"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { enabledModules, MODULE_COOKIE, postLoginDestination } from "@/lib/modules";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Revisa el correo y la contraseña." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos." };
  }

  // "Recuérdame": sesión persistente de 90 días con renovación automática.
  // Sin marcar, la sesión vive mientras el navegador esté abierto.
  const remember = formData.get("remember") === "on" || formData.get("remember") === "true";
  await createSession(user.id, remember);

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