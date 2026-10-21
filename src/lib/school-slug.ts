// El identificador legible de un colegio en la URL (`/c/colegio-ejemplo-spa`).
//
// Es lo que el colegio reparte a las familias: va en el enlace y en el QR de la
// reunión de apoderados, y tiene que poder dictarse por teléfono. Por eso se
// guarda en el colegio y no se deriva del nombre cada vez: si el colegio se
// cambia el nombre, el enlace que ya repartió tiene que seguir funcionando.
//
// Sin base de datos: lo usan la acción que crea un colegio y la pantalla de la
// familia.

/** Saca los acentos del español, que es lo único que un nombre de colegio usa. */
function sinAcentos(texto: string): string {
  return texto
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/ç/g, "c");
}

/**
 * Convierte un nombre de colegio en un identificador de URL.
 *
 * "Colegio Ejemplo SpA" → "colegio-ejemplo-spa". Si el nombre no deja nada
 * utilizable (puros símbolos), devuelve "colegio": la acción que lo guarda le
 * pone el sufijo numérico que haga falta para que sea único.
 */
export function slugDesdeNombre(nombre: string): string {
  const slug = sinAcentos(nombre.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "colegio";
}

/** Forma canónica para comparar dos identificadores escritos a mano. */
export function normalizarSlug(valor: string): string {
  return slugDesdeNombre(valor);
}
