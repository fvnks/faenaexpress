/**
 * Cliente para enviar DTEs al SII (Servicio de Impuestos Internos, Chile).
 *
 * Se comunica con el servicio de recepción de documentos electrónicos del SII:
 *   - Pruebas:   https://maullin.sii.cl/cgi_dte/UPL/DTEUpload
 *   - Producción: https://palena.sii.cl/cgi_dte/UPL/DTEUpload
 *
 * El envío se hace por POST con multipart/form-data enviando el XML firmado.
 * La respuesta es un SOAP XML con el TrackID y el estado de recepción.
 *
 * También permite consultar el estado de un DTE por su TrackID.
 */

import { parseDteXml } from "@/lib/dte";

export type SiiEnvironment = "pruebas" | "produccion";

export const SII_ENDPOINTS: Record<SiiEnvironment, string> = {
  pruebas: "https://maullin.sii.cl/cgi_dte/UPL/DTEUpload",
  produccion: "https://palena.sii.cl/cgi_dte/UPL/DTEUpload",
};

export const SII_STATUS_ENDPOINTS: Record<SiiEnvironment, string> = {
  pruebas: "https://maullin.sii.cl/cgi_dte/UPL/DTEDownload",
  produccion: "https://palena.sii.cl/cgi_dte/UPL/DTEDownload",
};

/**
 * Resultado del envío de un DTE al SII.
 */
export type SiiEnvioResultado = {
  /** TrackID asignado por el SII para seguimiento. */
  trackId: string;
  /** Estado de recepción: "RECIBIDO", "EN_PROCESO", "RECHAZADO", etc. */
  estado: string;
  /** Mensaje descriptivo del SII. */
  mensaje: string;
  /** El XML completo de la respuesta SOAP (para auditoría). */
  respuestaXml: string;
  /** Si el SII aceptó el documento para procesar. */
  aceptado: boolean;
};

/**
 * Resultado de consulta de estado de un DTE.
 */
export type SiiEstadoConsulta = {
  trackId: string;
  estado: string;
  detalle: string;
};

/**
 * Envía un DTE firmado al SII y devuelve el TrackID y estado.
 *
 * @param xmlFirmado - El XML DTE ya firmado (con TimbreElectronico).
 * @param environment - "pruebas" o "produccion".
 * @param rutEmisor - RUT del emisor (para construir el encabezado del envío).
 */
export async function enviarDteSii(
  xmlFirmado: string,
  environment: SiiEnvironment = "pruebas",
  rutEmisor?: string | null,
): Promise<SiiEnvioResultado> {
  const endpoint = SII_ENDPOINTS[environment];

  // Construir el cuerpo multipart/form-data. El SII espera un archivo
  // llamado "archivo" con el XML del DTE.
  const boundary = `----SIIFormBoundary${Date.now()}`;
  const xmlBuffer = Buffer.from(xmlFirmado, "utf8");

  const parts: Buffer[] = [];

  // Parte del archivo XML
  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="archivo"; filename="dte.xml"\r\n` +
        `Content-Type: application/xml\r\n\r\n`,
    ),
  );
  parts.push(xmlBuffer);
  parts.push(Buffer.from("\r\n"));

  // Parte del RUT del emisor (algunos entornos lo requieren)
  if (rutEmisor) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="rut_emisor"\r\n\r\n` +
          `${rutEmisor}\r\n`,
      ),
    );
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.byteLength),
      Accept: "application/soap+xml, text/xml, */*",
      "User-Agent": "YellowERP-POS/1.0",
    },
    body,
  });

  const respuestaTexto = await response.text();

  if (!response.ok) {
    throw new Error(
      `El SII respondió ${response.status}: ${respuestaTexto.slice(0, 500)}`,
    );
  }

  return parsearRespuestaSii(respuestaTexto);
}

/**
 * Parsea la respuesta SOAP del SII tras enviar un DTE.
 */
function parsearRespuestaSii(respuestaXml: string): SiiEnvioResultado {
  // Buscar el TrackID en la respuesta
  const trackIdMatch = respuestaXml.match(/<TRACKID[^>]*>([^<]+)<\/TRACKID>/i);
  const trackId = trackIdMatch?.[1] ?? "";

  // Buscar el estado
  const estadoMatch = respuestaXml.match(/<ESTADO[^>]*>([^<]+)<\/ESTADO>/i);
  const estado = estadoMatch?.[1] ?? "DESCONOCIDO";

  // Buscar mensaje/glosa
  const mensajeMatch =
    respuestaXml.match(/<GLOSA[^>]*>([^<]+)<\/GLOSA>/i) ??
    respuestaXml.match(/<MENSAJE[^>]*>([^<]+)<\/MENSAJE>/i);
  const mensaje = mensajeMatch?.[1] ?? "";

  const aceptado =
    /RECIBIDO|ACEPTADO|EN_PROCESO/i.test(estado) ||
    /RECIBIDO|ACEPTADO|EN_PROCESO/i.test(mensaje);

  return {
    trackId,
    estado,
    mensaje,
    respuestaXml,
    aceptado,
  };
}

/**
 * Consulta el estado de un DTE previamente enviado al SII por su TrackID.
 *
 * El SII devuelve un XML con el estado actual del documento.
 */
export async function consultarEstadoDteSii(
  trackId: string,
  environment: SiiEnvironment = "pruebas",
): Promise<SiiEstadoConsulta> {
  const endpoint = `${SII_STATUS_ENDPOINTS[environment]}?trackid=${encodeURIComponent(trackId)}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/soap+xml, text/xml, */*",
      "User-Agent": "YellowERP-POS/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `El SII respondió ${response.status} al consultar TrackID ${trackId}.`,
    );
  }

  const respuestaTexto = await response.text();

  const estadoMatch = respuestaTexto.match(/<ESTADO[^>]*>([^<]+)<\/ESTADO>/i);
  const estado = estadoMatch?.[1] ?? "DESCONOCIDO";

  const detalleMatch =
    respuestaTexto.match(/<GLOSA[^>]*>([^<]+)<\/GLOSA>/i) ??
    respuestaTexto.match(/<DETALLE[^>]*>([^<]+)<\/DETALLE>/i);
  const detalle = detalleMatch?.[1] ?? "";

  return {
    trackId,
    estado,
    detalle,
  };
}

/**
 * Determina el entorno del SII según la variable de entorno SII_ENVIRONMENT.
 * Valores válidos: "pruebas" o "produccion". Por defecto usa "pruebas".
 */
export function detectarSiiEnvironment(): SiiEnvironment {
  const env = process.env.SII_ENVIRONMENT;
  if (env === "produccion" || env === "production") return "produccion";
  return "pruebas";
}
