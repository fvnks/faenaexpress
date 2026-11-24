/**
 * Detecta filas que parecen el mismo documento (mismo tercero + folio + monto).
 * El folio no identifica un documento por sí solo: dos proveedores pueden
 * tener el folio 1182. Por eso se exige también el tercero y el monto.
 *
 * Devuelve el número de "hermanos" que tiene cada id (0 = único).
 */
export function duplicateCounts<T extends { id: string; key: string }>(rows: T[]): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.key || row.key === "||") continue;
    const list = groups.get(row.key) ?? [];
    list.push(row.id);
    groups.set(row.key, list);
  }
  const counts = new Map<string, number>();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) counts.set(id, ids.length - 1);
  }
  return counts;
}

/** Normaliza un RUT para usarlo como parte de la clave de duplicado. */
export function rutKey(rut: string | null | undefined): string {
  return (rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Normaliza un folio (sin ceros a la izquierda ni puntos). */
export function folioKey(folio: string | number | null | undefined): string {
  return String(folio ?? "").replace(/[^\d]/g, "").replace(/^0+/, "");
}

/** Compone la clave de duplicado de un documento. */
export function docKey(rut: string | null | undefined, folio: string | number | null | undefined, total: number): string {
  return `${rutKey(rut)}|${folioKey(folio)}|${total}`;
}
