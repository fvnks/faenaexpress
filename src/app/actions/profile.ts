"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { IMPERSONATION_FORBIDDEN, impersonationBlock } from "@/lib/impersonation";
import { hashPassword, verifyPassword } from "@/lib/password";

export type ChangePasswordState = { error?: string; ok?: boolean } | undefined;

/**
 * Cambia la contraseña del usuario autenticado.
 * Si el cambio es obligatorio (contraseña provisional de la invitación), no se pide
 * la contraseña actual: la sesión acabó de crearse con el enlace.
 */
export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();

  // Cambiar una contraseña es de las acciones que la impersonación prohíbe:
  // tocar las credenciales del cliente exige su sesión, no la de soporte.
  const bloqueado = await impersonationBlock(IMPERSONATION_FORBIDDEN.changePassword);
  if (bloqueado) return { error: bloqueado };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (next.length < 8) {
    return { error: "La contraseña nueva debe tener al menos 8 caracteres." };
  }
  if (next !== repeat) {
    return { error: "Las contraseñas nuevas no coinciden." };
  }

  if (!user.mustChangePassword) {
    if (current.length < 1) {
      return { error: "Ingresa tu contraseña actual." };
    }
    const ok = await verifyPassword(current, user.passwordHash);
    if (!ok) {
      return { error: "La contraseña actual no es correcta." };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });

  await setFlash("success", "Contraseña actualizada", "Tu contraseña quedó cambiada.");
  revalidatePath("/perfil");
  return { ok: true };
}
