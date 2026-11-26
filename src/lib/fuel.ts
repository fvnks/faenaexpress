// Reglas de combustible que se usan tanto en el cliente (para abrir el modal)
// como en la Server Action (para exigir los datos). Sin imports de servidor.

export const TIPOS_COMBUSTIBLE = [
  { value: "GASOLINA_93", label: "Gasolina automotriz 93" },
  { value: "GASOLINA_97", label: "Gasolina automotriz 97" },
  { value: "DIESEL", label: "Petróleo diésel" },
  { value: "GLP", label: "Gas licuado de petróleo (GLP)" },
  { value: "GNC", label: "Gas natural comprimido (GNC)" },
  { value: "OTRO", label: "Otro" },
] as const;

export function etiquetaTipoCombustible(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return TIPOS_COMBUSTIBLE.find((item) => item.value === tipo)?.label ?? tipo;
}

/** El crédito de la Ley 19.764 aplica al diésel de transporte de carga. */
export function tipoRecuperable(tipo: string | null | undefined): boolean {
  return tipo === "DIESEL";
}

/**
 * Respaldo para categorías creadas antes del flag `esCombustible` o que no
 * fueron marcadas por el administrador. No reemplaza al flag: lo complementa.
 */
export function esCombustiblePorNombre(nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  const texto = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /\b(combustible|bencina|gasolina|diesel|glp|gnc|petroleo)\b/.test(texto);
}
