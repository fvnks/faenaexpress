// Segundo factor (2FA) para los que manejan la cuenta.
//
// Quién lo necesita: el dueño de una organización y el personal de la
// plataforma. Son las dos personas que pueden tocar todas las empresas de
// alguien, así que una contraseña sola no alcanza.
//
// El flujo tiene dos estados:
//   - La sesión queda «pendiente» (`Session.totpPending`): la contraseña está
//     bien pero falta el segundo factor. Con esa sesión NO se puede usar la
//     app: `requireUser` manda a la pantalla del 2FA.
//   - Confirmado: se limpia la marca y la persona entra.
//
// Para que nadie quede encerrado: hay códigos de recuperación de un solo uso y
// el equipo de plataforma puede restablecer el 2FA de una persona desde la
// consola.

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";

const RECOVERY_CODES = 8;

/** ¿Esta persona debe tener 2FA? Dueño de organización o personal de plataforma. */
export async function requiresTwoFactor(userId: string): Promise<boolean> {
  const [staff, owner] = await Promise.all([
    db.platformStaff.findFirst({ where: { userId, active: true }, select: { id: true } }),
    db.orgMember.findFirst({
      where: { userId, active: true, orgRole: "OWNER" },
      select: { id: true },
    }),
  ]);
  return Boolean(staff || owner);
}

/** ¿Ya tiene 2FA activo? */
export async function hasTwoFactor(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  return user?.totpEnabled === true;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

/**
 * Prepara el alta del 2FA: genera un secreto, lo deja cifrado y devuelve el
 * enlace y el secreto para que la persona lo meta en su app. No queda activo
 * hasta que verifique un código.
 */
export async function startTwoFactorSetup(userId: string): Promise<{
  secret: string;
  uri: string;
}> {
  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: userId },
    data: { totpSecretEnc: encryptSecret(secret) },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return {
    secret,
    uri: `otpauth://totp/${encodeURIComponent(`Yellow ERP:${user?.email ?? ""}`)}?secret=${secret}&issuer=Yellow%20ERP&algorithm=SHA1&digits=6&period=30`,
  };
}

/** Confirma el alta: verifica el código y activa el 2FA. Devuelve los códigos de recuperación. */
export async function confirmTwoFactorSetup(
  userId: string,
  code: string,
): Promise<{ ok: boolean; error?: string; recoveryCodes?: string[] }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpSecretEnc: true },
  });
  if (!user?.totpSecretEnc) {
    return { ok: false, error: "Primero genera tu código de seguridad." };
  }

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecretEnc);
  } catch {
    return { ok: false, error: "No se pudo leer tu secreto. Genera uno nuevo." };
  }

  if (!verifyTotp(secret, code)) {
    return { ok: false, error: "El código no es correcto. Revisa la hora de tu teléfono." };
  }

  // Códigos de recuperación: se muestran una vez y quedan con su hash.
  const recoveryCodes = Array.from({ length: RECOVERY_CODES }, () => {
    const bytes = randomBytes(5);
    return bytes.toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-");
  });

  await db.$transaction([
    db.recoveryCode.deleteMany({ where: { userId } }),
    db.recoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ userId, codeHash: hashCode(code) })),
    }),
    db.user.update({
      where: { id: userId },
      data: { totpEnabled: true, totpEnabledAt: new Date() },
    }),
    // La sesión pendiente se convierte en sesión normal.
    db.session.updateMany({ where: { userId, totpPending: true }, data: { totpPending: false } }),
  ]);

  return { ok: true, recoveryCodes };
}

/** Verifica el segundo factor: el código de la app o uno de recuperación. */
export async function verifyTwoFactor(
  userId: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpSecretEnc: true, totpEnabled: true },
  });
  if (!user?.totpEnabled || !user.totpSecretEnc) {
    return { ok: false, error: "El segundo factor no está activo en esta cuenta." };
  }

  try {
    const secret = decryptSecret(user.totpSecretEnc);
    if (verifyTotp(secret, code)) return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo leer tu secreto. Pide que te lo restablezcan." };
  }

  // ¿Es un código de recuperación?
  const candidate = await db.recoveryCode.findFirst({
    where: { userId, codeHash: hashCode(code), usedAt: null },
  });
  if (candidate) {
    await db.recoveryCode.update({ where: { id: candidate.id }, data: { usedAt: new Date() } });
    return { ok: true };
  }

  return { ok: false, error: "El código no es correcto." };
}

/** Desactiva el 2FA de una persona (soporte: el cliente perdió su teléfono). */
export async function disableTwoFactor(userId: string): Promise<void> {
  await db.$transaction([
    db.recoveryCode.deleteMany({ where: { userId } }),
    db.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecretEnc: null, totpEnabledAt: null },
    }),
  ]);
}

/** Genera códigos de recuperación nuevos (el cliente los puede reimprimir). */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const recoveryCodes = Array.from({ length: RECOVERY_CODES }, () => {
    const bytes = randomBytes(5);
    return bytes.toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-");
  });
  await db.$transaction([
    db.recoveryCode.deleteMany({ where: { userId } }),
    db.recoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ userId, codeHash: hashCode(code) })),
    }),
  ]);
  return recoveryCodes;
}
