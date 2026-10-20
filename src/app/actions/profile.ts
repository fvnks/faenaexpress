"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { IMPERSONATION_FORBIDDEN, impersonationBlock } from "@/lib/impersonation";
import { postLoginDestination } from "@/lib/modules";
import { hashPassword, verifyPassword } from "@/lib/password";
import { RateLimiter } from "@/lib/rate-limit";
import {
  confirmTwoFactorSetup,
  regenerateRecoveryCodes as regenerateRecoveryCodesFor,
  startTwoFactorSetup,
  verifyTwoFactor,
} from "@/lib/two-factor";

export type ChangePasswordState = { error?: string; ok?: boolean } | undefined;

export type TwoFactorState =
  | {
      error?: string;
      ok?: boolean;
      /** El secreto y el enlace para la app de autenticación (primer paso). */
      secret?: string;
      uri?: string;
      /** Códigos de recuperación, que se muestran una sola vez. */
      recoveryCodes?: string[];
    }
  | undefined;

// 5 códigos ERRÓNEOS por cada 15 minutos. El código son 6 dígitos: con la
// ventana de tolerancia (±30 s) cada intento cubre 3 códigos válidos, así que
// sin tope se podría agotar el espacio en horas. Los aciertos no gastan
// intentos.
const twoFactorLimiter = new RateLimiter({ max: 5, windowMs: 15 * 60_000 });

/**
 * Paso 1 del alta: genera el secreto y lo deja cifrado. El 2FA todavía NO
 * queda activo hasta que se verifique un código.
 */
export async function startTwoFactor(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  // El botón manda qué paso es: evita que un POST a ciegas active el alta.
  if (String(formData.get("paso") ?? "") !== "generar") {
    return { error: "Solicitud incompleta." };
  }

  // OJO: no se usa `requireUser` porque esa función manda a esta misma
  // pantalla cuando la sesión está pendiente (sería un bucle).
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { secret, uri } = await startTwoFactorSetup(user.id);
  return { ok: true, secret, uri };
}

/** Paso 2: verifica el código y activa el 2FA. Devuelve los códigos de recuperación. */
export async function confirmTwoFactor(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "").trim();
  const resultado = await confirmTwoFactorSetup(user.id, code);
  if (!resultado.ok) return { error: resultado.error ?? "El código no es correcto." };
  return { ok: true, recoveryCodes: resultado.recoveryCodes };
}

/** Confirma el 2FA en una sesión que estaba pendiente (login normal). */
export async function verifyTwoFactorCode(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  // OJO: no se usa `requireUser` porque esa función manda a esta misma pantalla
  // cuando la sesión está pendiente (sería un bucle).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "").trim();
  const resultado = await verifyTwoFactor(user.id, code);

  if (!resultado.ok) {
    // Solo los códigos ERRÓNEOS gastan intentos: si el acierto gastara uno, un
    // usuario que se equivoca cinco veces quedaría bloqueado aunque después
    // acierte.
    if (!twoFactorLimiter.allow(`2fa:${user.id}`)) {
      await db.session.deleteMany({ where: { userId: user.id, totpPending: true } });
      return { error: "Demasiados códigos incorrectos. Vuelve a iniciar sesión." };
    }
    return { error: resultado.error ?? "El código no es correcto." };
  }

  // Acertó: el contador vuelve a cero.
  twoFactorLimiter.reset(`2fa:${user.id}`);

  // La sesión pendiente pasa a ser normal.
  await db.session.updateMany({
    where: { userId: user.id, totpPending: true },
    data: { totpPending: false },
  });

  const destino = await postLoginDestination(user.id);
  redirect(destino);
}

/** Genera códigos de recuperación nuevos. */
export async function regenerateRecoveryCodes(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  if (String(formData.get("accion") ?? "") !== "recuperacion") {
    return { error: "Solicitud incompleta." };
  }
  const user = await requireUser();
  const codes = await regenerateRecoveryCodesFor(user.id);
  return { ok: true, recoveryCodes: codes };
}

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
