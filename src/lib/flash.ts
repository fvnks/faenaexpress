export const FLASH_COOKIE_NAME = "facturas_flash";
const FLASH_TTL_S = 60;

export type FlashType = "success" | "error";

export type Flash = {
  id: string;
  type: FlashType;
  title: string;
  description?: string;
};

/**
 * Mensaje "flash" para toasts tras Server Actions que redirigen.
 * Se guarda en memoria y se consume en el siguiente render del layout.
 *
 * Limitación: en producción con múltiples instancias de servidor, cada
 * instancia mantiene su propia memoria. Para una solución distribuida,
 * reemplazar por una cookie HTTP real.
 */
let _flash: Flash | null = null;

export async function setFlash(type: FlashType, title: string, description?: string): Promise<void> {
  _flash = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    description,
  };
}

export async function getFlash(): Promise<Flash | null> {
  const result = _flash;
  _flash = null;
  return result;
}
