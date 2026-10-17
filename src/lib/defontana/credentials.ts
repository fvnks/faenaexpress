import { db } from "@/lib/db";
import {
  DefontanaError,
  loginDefontana,
  type DefontanaSession,
} from "@/lib/defontana/client";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

/**
 * Credenciales de Defontana guardadas por empresa.
 *
 * Se guardan el correo y la clave (cifrada) más el token de sesión que devuelve
 * el ERP: como dura un año, se reutiliza y solo se vuelve a iniciar sesión si
 * venció o si el ERP lo rechaza.
 */

// Un día de margen antes de renovar, para no quedar con el token justo al borde.
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

export type StoredDefontanaCredentials = { email: string; clave: string };

export async function getStoredDefontanaCredentials(
  companyId: string,
): Promise<StoredDefontanaCredentials | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { defontanaEmail: true, defontanaClaveEnc: true },
  });
  if (!company?.defontanaEmail || !company.defontanaClaveEnc) return null;
  return { email: company.defontanaEmail, clave: decryptSecret(company.defontanaClaveEnc) };
}

export async function hasStoredDefontanaCredentials(companyId: string): Promise<boolean> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { defontanaEmail: true, defontanaClaveEnc: true },
  });
  return Boolean(company?.defontanaEmail && company.defontanaClaveEnc);
}

/** Guarda credenciales ya validadas junto con la sesión que abrieron. */
export async function saveDefontanaCredentials(
  companyId: string,
  datos: StoredDefontanaCredentials & { session: DefontanaSession },
): Promise<void> {
  await db.company.update({
    where: { id: companyId },
    data: {
      defontanaEmail: datos.email,
      defontanaClaveEnc: encryptSecret(datos.clave),
      defontanaTokenEnc: encryptSecret(datos.session.token),
      defontanaTokenExp: datos.session.expiresAt,
    },
  });
}

export async function clearDefontanaCredentials(companyId: string): Promise<void> {
  await db.company.update({
    where: { id: companyId },
    data: {
      defontanaEmail: null,
      defontanaClaveEnc: null,
      defontanaTokenEnc: null,
      defontanaTokenExp: null,
    },
  });
}

/** Sesión vigente: la cacheada si sirve, o una nueva con las credenciales guardadas. */
export async function getDefontanaSession(
  companyId: string,
  options: { force?: boolean } = {},
): Promise<DefontanaSession | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      defontanaEmail: true,
      defontanaClaveEnc: true,
      defontanaTokenEnc: true,
      defontanaTokenExp: true,
    },
  });
  if (!company?.defontanaEmail || !company.defontanaClaveEnc) return null;

  const vigente =
    company.defontanaTokenEnc &&
    company.defontanaTokenExp &&
    company.defontanaTokenExp.getTime() - RENEW_BEFORE_MS > Date.now();

  if (!options.force && vigente) {
    return { token: decryptSecret(company.defontanaTokenEnc!), expiresAt: company.defontanaTokenExp! };
  }

  const session = await loginDefontana(company.defontanaEmail, decryptSecret(company.defontanaClaveEnc));
  await db.company.update({
    where: { id: companyId },
    data: {
      defontanaTokenEnc: encryptSecret(session.token),
      defontanaTokenExp: session.expiresAt,
    },
  });
  return session;
}

/**
 * Corre `fn` con una sesión vigente y, si el ERP la rechaza (token revocado o
 * cambiado de clave por fuera), inicia sesión de nuevo y reintenta una vez.
 */
export async function withDefontanaSession<T>(
  companyId: string,
  fn: (session: DefontanaSession) => Promise<T>,
): Promise<T> {
  const session = await getDefontanaSession(companyId);
  if (!session) {
    throw new DefontanaError(
      "La empresa no tiene credenciales de Defontana guardadas.",
      { authFailed: true },
    );
  }

  try {
    return await fn(session);
  } catch (error) {
    if (!(error instanceof DefontanaError) || !error.authFailed) throw error;
    const renovada = await getDefontanaSession(companyId, { force: true });
    if (!renovada) throw error;
    return await fn(renovada);
  }
}
