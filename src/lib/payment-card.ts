// Helper sin dependencias: se usa tanto en el cliente (para reflejar la fecha
// en el formulario) como en la Server Action (para imponer la regla).
// Importar `db` aquí rompería el bundle del cliente.

/**
 * Tarjeta de crédito o débito. En esos casos la fecha de pago del documento es
 * la misma de emisión: la tarjeta se carga el día de la compra, aunque se pague
 * después al emisor. Acepta variantes de acentos y mayúsculas del catálogo.
 */
export function esPagoConTarjeta(metodo: string | null | undefined): boolean {
  if (!metodo) return false;
  const normalizado = metodo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return /^tarjeta de (credito|debito)\b/.test(normalizado);
}
