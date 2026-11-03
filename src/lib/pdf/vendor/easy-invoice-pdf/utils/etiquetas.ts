/**
 * MODIFICACIÓN (vendorizado).
 *
 * En el original estas etiquetas eran funciones por idioma y se llamaban siempre con un
 * objeto `{ customTaxLabel }`. Como el ERP imprime en un solo idioma, las dos funciones
 * que quedan tienen la misma firma (la que ignora el argumento), y TypeScript ya no
 * acepta la llamada con argumento. Este helper llama a la etiqueta como sea que venga:
 * si usa el impuesto (para escribir "Importe IVA"), se lo pasa; si no, la llama igual.
 */

/** La etiqueta de una columna que puede depender del nombre del impuesto. */
export function etiquetaConImpuesto(
  fn: unknown,
  customTaxLabel: string,
): string {
  if (typeof fn !== "function") {
    return typeof fn === "string" ? fn : "";
  }

  const etiqueta = fn as (args: { customTaxLabel: string }) => string;

  try {
    return etiqueta({ customTaxLabel });
  } catch {
    // Una etiqueta que no acepta el argumento (o que lo rechaza) no debe tumbar el PDF.
    return "";
  }
}
