import { cookies } from "next/headers";

const FLASH_COOKIE = "facturas_flash";
const FLASH_TTL_S = 60;

export type FlashType = "success" | "error";

export type Flash = {
  id: string;
  type: FlashType;
  title: string;
  description?: string;
};

/**
 * Mensaje "flash" para toasts tras Server Actions que redirigen: la acción lo
 * guarda en una cookie y el layout lo muestra una sola vez vía sonner.
 */
export async function setFlash(type: FlashType, title: string, description?: string): Promise<void> {
  const flash: Flash = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    description,
  };
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify(flash), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: FLASH_TTL_S,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getFlash(): Promise<Flash | null> {
  const store = await cookies();
  const raw = store.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Flash;
    if (!parsed?.id || (parsed.type !== "success" && parsed.type !== "error")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const FLASH_COOKIE_NAME = FLASH_COOKIE;
