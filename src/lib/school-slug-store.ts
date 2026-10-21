// El identificador de URL de un colegio, resuelto contra la base.
//
// La parte pura (convertir un nombre en un identificador) está en
// `src/lib/school-slug.ts`; acá se resuelve que sea único y se busca el colegio
// que corresponde a una URL.

import { db } from "@/lib/db";
import { slugDesdeNombre } from "@/lib/school-slug";

/**
 * Un identificador libre para un colegio nuevo.
 *
 * Si «colegio-ejemplo-spa» ya está tomado, prueba con «-2», «-3»… El slug se
 * fija al crear el colegio y no se vuelve a mover: el enlace que ya se repartió
 * a las familias tiene que seguir funcionando aunque cambie el nombre.
 */
export async function slugUnicoParaColegio(nombre: string): Promise<string> {
  const base = slugDesdeNombre(nombre);
  const tomados = await db.school.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const usados = new Set(tomados.map((s) => s.slug));

  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** El colegio de una URL de familia, o null si el enlace no existe. */
export async function colegioPorSlug(slug: string) {
  return db.school.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, commune: true, level: true },
  });
}

/**
 * El slug de un colegio, generándolo si todavía no tiene.
 *
 * Los colegios creados antes de que existiera el slug quedaron con uno por
 * migración, pero si alguno se creó por otra vía y quedó sin él, se resuelve
 * acá la primera vez que hace falta.
 */
export async function slugDeColegio(schoolId: string): Promise<string | null> {
  const colegio = await db.school.findUnique({
    where: { id: schoolId },
    select: { name: true, slug: true },
  });
  if (!colegio) return null;
  if (colegio.slug) return colegio.slug;

  const slug = await slugUnicoParaColegio(colegio.name);
  await db.school.update({ where: { id: schoolId }, data: { slug } });
  return slug;
}
