// Guardado y recuperación del timbre electrónico (TED).
//
// El PDF417 del SII no se puede inventar: codifica byte por byte el XML firmado
// con el CAF. Por eso guardamos el `<TED>` tal cual vino del SII (o de la
// emisión) y lo reusamos para imprimir la carta. Si no hay TED, el documento se
// imprime como factura comercial, con un código de referencia —nunca como DTE.

import { serialize, type XmlElement } from "typedte-sii";

/** Serializa el TED devuelto por typeDte para guardarlo en la base. */
export function serializarTed(ted: XmlElement): string {
  return serialize(ted);
}

/** Reconstruye un XmlElement a partir de un `<TED>...</TED>` guardado. */
export function parsearTed(xml: string | null | undefined): XmlElement | null {
  if (!xml) return null;
  const coincidencia = /<TED((?:\s[^>]*)?)>([\s\S]*?)<\/TED>/.exec(xml);
  if (!coincidencia) return null;
  const attrs: Record<string, string> = {};
  const atributos = /(\w+)\s*=\s*["']([^"']*)["']/g;
  for (const coincidenciaAttr of coincidencia[1].matchAll(atributos)) {
    attrs[coincidenciaAttr[1]] = coincidenciaAttr[2];
  }
  // El contenido viaja como XML crudo y los atributos se conservan: el PDF417
  // debe codificar exactamente los bytes que el SII firmó (incluye version="1.0").
  return {
    name: "TED",
    ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
    children: [{ raw: coincidencia[2] }],
  } as XmlElement;
}

/** Extrae el TED de un DTE XML completo importado desde el SII. */
export function extraerTedDeXml(xml: string | null | undefined): string | null {
  if (!xml) return null;
  const coincidencia = /<TED(?:\s[^>]*)?>[\s\S]*?<\/TED>/.exec(xml);
  return coincidencia ? coincidencia[0] : null;
}
