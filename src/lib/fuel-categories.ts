import { db } from "@/lib/db";
import { esCombustiblePorNombre } from "@/lib/fuel";

/**
 * Una categoría exige desglose de combustible si está marcada como tal o si su
 * nombre lo delata (categorías antiguas sin el flag). Se valida dentro de la
 * empresa para no cruzar datos de otra cuenta.
 */
export async function esCategoriaCombustible(
  companyId: string,
  categoryId: string | null | undefined,
): Promise<boolean> {
  if (!categoryId) return false;
  const categoria = await db.category.findFirst({
    where: { id: categoryId, companyId },
    select: { esCombustible: true, name: true },
  });
  if (!categoria) return false;
  return categoria.esCombustible || esCombustiblePorNombre(categoria.name);
}
