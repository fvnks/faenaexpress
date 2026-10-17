import JSZip from "jszip";

import { decodeDteXml } from "@/lib/dte";

/**
 * Lee lo que el usuario subió para importar DTE: uno o varios XML sueltos, o el
 * ZIP completo del "Respaldo de DTE" que entrega el SII.
 *
 * Devuelve cada XML como texto (respetando su codificación), que es lo que
 * espera `parseDteXml`.
 */

export type UploadedXml = { name: string; xml: string };

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_XML_ENTRIES = 800;
const MAX_XML_BYTES = 8 * 1024 * 1024;

const isZip = (name: string) => /\.zip$/i.test(name);
const isXml = (name: string) => /\.xml$/i.test(name);

export async function readUploadedXml(
  files: File[],
): Promise<{ xmls: UploadedXml[]; error?: string }> {
  const xmls: UploadedXml[] = [];
  let total = 0;

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { xmls: [], error: `${file.name} supera el máximo de 25 MB.` };
    }
    total += file.size;
    if (total > MAX_UPLOAD_BYTES) {
      return {
        xmls: [],
        error: "Lo subido supera los 25 MB en total. Sube el respaldo por meses.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (isZip(file.name)) {
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(buffer);
      } catch {
        return { xmls: [], error: `${file.name} no es un ZIP válido.` };
      }

      const entries = Object.values(zip.files).filter((entry) => !entry.dir && isXml(entry.name));
      if (entries.length === 0) {
        return { xmls: [], error: `${file.name} no trae archivos .xml adentro.` };
      }

      for (const entry of entries) {
        if (xmls.length >= MAX_XML_ENTRIES) break;
        const content = await entry.async("nodebuffer");
        if (content.byteLength > MAX_XML_BYTES) continue;
        xmls.push({ name: entry.name, xml: decodeDteXml(content) });
      }
      continue;
    }

    if (!isXml(file.name)) {
      return { xmls: [], error: `No se acepta ${file.name}: sube archivos .xml o un .zip.` };
    }
    if (buffer.byteLength > MAX_XML_BYTES) {
      return { xmls: [], error: `${file.name} supera el máximo de 8 MB.` };
    }
    xmls.push({ name: file.name, xml: decodeDteXml(buffer) });
  }

  if (xmls.length === 0) {
    return { xmls: [], error: "No se encontraron XML DTE en lo que subiste." };
  }
  return { xmls };
}
