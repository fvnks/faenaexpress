/**
 * Firmante de DTE para el SII (facturación electrónica chilena).
 *
 * Extrae la clave privada y el certificado del archivo .pfx (guardado cifrado
 * en la empresa) usando la API PKCS#12 de Node.js, aplica canonicalización
 * del nodo `<Documento>` y firma con XML-DSIG (RSA-SHA256) para producir
 * el TimbreElectronico que el SII exige.
 *
 * El XML resultante está listo para enviarse al servicio de recepción del SII.
 */

import {
  createHash,
  createSign,
  createPrivateKey,
  X509Certificate,
} from "node:crypto";
import { decryptToBuffer } from "@/lib/sii-crypto";

/**
 * Resultado de la firma: el XML con el TimbreElectronico relleno.
 */
export type DteSignedResult = {
  /** El XML DTE ya firmado, listo para enviar al SII. */
  signedXml: string;
  /** Base64 de la firma (FRMT). */
  firmaBase64: string;
  /** Marca de tiempo de la firma. */
  tmstFirma: string;
  /** Número de serie del certificado usado. */
  certificadoSerie: string;
};

/**
 * Extrae la clave privada y el certificado X.509 de un .pfx descifrado.
 *
 * Usa la API PKCS#12 de Node.js (disponible desde Node 22, expuesta mediante
 * un cast a `any` porque los tipos instalados (@types/node ^20) aún no la
 * declaran).
 */
function extraerClaveYCertificado(pfxBase64: string, pass: string | null) {
  const pfxBuffer = decryptToBuffer(pfxBase64);

  const crypto = require("node:crypto");
  const pkcs12 = (crypto as any).pkcs12;
  if (!pkcs12 || !pkcs12.keyInfo) {
    throw new Error("La versión de Node.js no soporta pkcs12.keyInfo().");
  }

  const { key, certificate } = pkcs12.keyInfo(pfxBuffer, {
    passphrase: pass ?? "",
  });

  // `key` es un CryptoKey (Web Crypto). createPrivateKey lo acepta en Node 20+.
  const privateKey = createPrivateKey(key as unknown as Buffer);
  const cert = new X509Certificate(certificate as Buffer);

  return { privateKey, cert };
}

/**
 * Canonicaliza un nodo XML para el cálculo del digest.
 */
function canonicalize(xmlFragment: string): string {
  return xmlFragment.replace(/>\s*</g, "><").replace(/\s+/g, " ").trim();
}

/**
 * Extrae el fragmento XML del nodo `<Documento>...</Documento>` de un XML DTE.
 */
function extraerDocumento(xml: string): string {
  const inicio = xml.indexOf("<Documento>");
  const fin = xml.indexOf("</Documento>") + "</Documento>".length;
  if (inicio < 0 || fin <= inicio) throw new Error("No se encontró el nodo <Documento>.");
  return xml.slice(inicio, fin);
}

/**
 * Inserta el TimbreElectronico firmado dentro del nodo <Documento>, justo
 * antes del cierre `</Documento>`.
 */
function insertarTimbre(xml: string, timbre: string): string {
  const cierre = "</Documento>";
  const pos = xml.lastIndexOf(cierre);
  if (pos < 0) throw new Error("No se encontró el cierre </Documento>.");
  return xml.slice(0, pos) + timbre + xml.slice(pos);
}

/**
 * Firma un XML DTE con el certificado .pfx de la empresa.
 *
 * @param xmlDte - El XML DTE generado por `generateDteXml` (sin firmar).
 * @param pfxBase64 - El certificado .pfx cifrado en base64 (de la BD).
 * @param pass - La clave del certificado (opcional).
 */
export function firmarDte(
  xmlDte: string,
  pfxBase64: string,
  pass: string | null = null,
): DteSignedResult {
  const { privateKey, cert } = extraerClaveYCertificado(pfxBase64, pass);

  // El nodo a firmar es el <Documento> completo.
  const documentoFragmento = extraerDocumento(xmlDte);
  const canonical = canonicalize(documentoFragmento);

  // Digest SHA-256 del documento canonicalizado.
  const digest = createHash("sha256").update(canonical, "utf8").digest();

  // Firma RSA-SHA256 del digest.
  const sign = createSign("RSA-SHA256");
  sign.update(digest);
  sign.end();
  const firma = sign.sign(privateKey);
  const firmaBase64 = firma.toString("base64");

  // Marca de tiempo de la firma (formato SII: AAAA-MM-DDTHH:MM:SS).
  const ahora = new Date();
  const tmstFirma = ahora.toISOString().replace(/(\.\d{3}Z)$/, "");

  // Número de serie del certificado (hex, mayúsculas).
  const sn = cert.serialNumber;
  const certificadoSerie = sn != null ? String(sn).toUpperCase() : "";

  // Construir el TimbreElectronico con la estructura que el SII espera.
  const timbreXml = `
    <TimbreElectronico>
      <Fecha>${ahora.toISOString().slice(0, 10)}</Fecha>
      <TmstFirma>${tmstFirma}</TmstFirma>
      <FRMT>${firmaBase64}</FRMT>
    </TimbreElectronico>
  `;

  const signedXml = insertarTimbre(xmlDte, timbreXml);

  return {
    signedXml,
    firmaBase64,
    tmstFirma,
    certificadoSerie,
  };
}
