// RUT chileno: normalización y validación con el algoritmo del módulo 11.
export function normalizeRut(value: string): string {
  return value.replace(/[.\-\s]/g, "").toUpperCase();
}

export function formatRut(value: string): string {
  const clean = normalizeRut(value);
  if (!/^\d+[0-9K]$/.test(clean)) return value.trim();

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

// Acepta 6 a 8 dígitos de cuerpo más el dígito verificador (0-9 o K).
export function isValidRut(value: string): boolean {
  const clean = normalizeRut(value);
  if (!/^\d{6,8}[0-9K]$/.test(clean)) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expected === dv;
}

/**
 * Variantes con puntos de un RUT escrito sin ellos. La base guarda el RUT
 * formateado («77.762.940-9»), así que buscar «77762940» con un `contains`
 * literal no encuentra nada; estas variantes sí.
 *
 * Solo genera coincidencias cuando el texto viene sin puntos ni guion, para no
 * agregar ruido a una búsqueda que el literal ya resuelve.
 */
export function rutSearchPatterns(query: string): string[] {
  if (/[.\-]/.test(query)) return [];

  const clean = query.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 4 || !/^\d/.test(clean)) return [];

  const patterns = new Set<string>();
  const withDots = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Todo el texto como cuerpo, sin dígito verificador: «77762940» → «77.762.940».
  if (/^\d+$/.test(clean)) patterns.add(withDots(clean));

  // El último carácter como dígito verificador: «777629409» → «77.762.940-9».
  const body = clean.slice(0, -1);
  if (body.length >= 3 && /^\d+$/.test(body)) {
    patterns.add(`${withDots(body)}-${clean.slice(-1)}`);
  }

  return [...patterns];
}
