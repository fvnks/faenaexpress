/**
 * Ruta interna segura para volver después de una acción masiva. Conserva los
 * filtros y el orden de la lista actual en vez de devolver a la ruta pelada.
 * Solo acepta rutas del módulo, para que un valor manipulado no pueda
 * convertirse en una redirección externa.
 */
export function safeReturnTo(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (path !== "/facturas" && !path.startsWith("/facturas/")) return fallback;
  if (path.includes("//") || path.includes("\\") || /[\r\n]/.test(path)) return fallback;
  return path;
}
