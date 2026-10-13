"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
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

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}