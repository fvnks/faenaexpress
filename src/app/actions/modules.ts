"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { enabledModules, MODULE_COOKIE } from "@/lib/modules";

/**
 * Cambia de módulo: guarda el último usado (cookie) y redirige al módulo
 * elegido. Se valida contra `enabledModules` para que un `code` manipulado
 * no pueda redirigir a un módulo deshabilitado.
 */
export async function switchModule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "");
  const modules = await enabledModules(user.id);
  const target = modules.find((m) => m.code === code);
  if (!target) redirect("/modulos");

  const cookieStore = await cookies();
  cookieStore.set(MODULE_COOKIE, target.code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(target.href);
}
