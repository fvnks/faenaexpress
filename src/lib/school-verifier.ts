// El verificador de identidad del MINEDUC: validar el código de un docente.
//
// En el libro de clases en papel el docente firma de puño y letra. En el
// digital, esa firma es un código dinámico de 6 dígitos que sale de un
// autenticador (Authy, Google o Microsoft Authenticator) vinculado en
// tramites.mineduc.cl con Clave Única. El código caduca a los 30 segundos.
//
// El MINEDUC publica cómo validarlo (www.ede.mineduc.cl, sección
// «Validación Transaccional»):
//
//   GET https://apiede.mineduc.cl/otp/verify-otp
//       ?rut=<RUN>&otp=<6 dígitos>&DateWithTimeZone=<ISO con offset>
//
// La respuesta es el envoltorio de un API Gateway, con el JSON serializado dos
// veces:
//
//   {"statusCode": 200, "body": "[{\"RUT\":\"13262998-6\",\"O\":0,\"OTPVERIFY\":false}]"}
//
// `OTPVERIFY` no tiene un tipo estable y hay que tratarlo con cuidado:
//
//   - booleano `true`   el código corresponde al RUN en esa hora
//   - booleano `false`  el RUN existe en el verificador pero el código no es
//   - "RUT_NO_EXISTE"   el RUN no está registrado como firmante
//
// Verificado en vivo el 22-10-2026 con los ejemplos del propio instructivo.
// El caso de éxito no se pudo probar porque necesita un código real: se aceptan
// `true` y su equivalente textual, y TODO lo demás se rechaza. Un código que el
// MINEDUC no confirma no puede ser firma.
//
// Ojo con la zona horaria: el servidor calcula qué código esperaba en la hora
// que le mandamos, y una diferencia de zona horaria es el problema más común
// documentado en el FAQ. Se manda siempre la hora de `America/Santiago` con su
// desfase real (Chile cambia de horario en septiembre y en abril).

import { isValidRut, normalizeRut } from "@/lib/rut";

const ENDPOINT = "https://apiede.mineduc.cl/otp/verify-otp";
const ZONA_HORARIA = "America/Santiago";
const TIMEOUT_MS = 10_000;

/** Por qué el MINEDUC no aceptó el código. */
export type MotivoRechazo =
  | "RUT_INVALIDO" // el RUN no tiene forma de RUN chileno
  | "CODIGO_INVALIDO" // no son 6 dígitos
  | "RUT_NO_REGISTRADO" // ese RUN no tiene verificador de identidad
  | "CODIGO_NO_CORRESPONDE" // el RUN existe, el código no es el que tocaba
  | "SIN_CONEXION" // no se pudo hablar con el MINEDUC
  | "RESPUESTA_INESPERADA"; // el MINEDUC respondió algo que no entendimos

export type ResultadoVerificacion =
  | { ok: true; rut: string; codigo: string; verificadoEn: Date }
  | { ok: false; motivo: MotivoRechazo; mensaje: string };

/** Mensaje para la persona que firma. */
const MENSAJES: Record<MotivoRechazo, string> = {
  RUT_INVALIDO: "El RUN no es válido. Revisa los dígitos y el dígito verificador.",
  CODIGO_INVALIDO: "El código del verificador debe tener 6 dígitos.",
  RUT_NO_REGISTRADO:
    "El MINEDUC no reconoce ese RUN como firmante. El docente debe obtener su verificador de identidad en tramites.mineduc.cl.",
  CODIGO_NO_CORRESPONDE: "El código no coincide. El autenticador genera uno nuevo cada 30 segundos: usa el de ahora.",
  SIN_CONEXION: "No se pudo contactar al MINEDUC. Intenta de nuevo en unos segundos.",
  RESPUESTA_INESPERADA: "El MINEDUC respondió algo inesperado. No se firmó nada: intenta de nuevo.",
};

/**
 * La hora que se le manda al MINEDUC: ISO con el desfase real de Chile.
 *
 * No basta con `toISOString()` (que va en UTC): el servidor valida el código
 * contra la hora que le dicen, y un desfase de una hora hace que un código
 * correcto se rechace.
 */
export function momentoChile(date: Date = new Date()): string {
  const hora = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const p = Object.fromEntries(hora.map((parte) => [parte.type, parte.value]));

  const etiqueta = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_HORARIA, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((parte) => parte.type === "timeZoneName")?.value;
  const desfase = !etiqueta || etiqueta === "GMT" ? "+00:00" : etiqueta.replace("GMT", "");

  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${desfase}`;
}

/**
 * Le pregunta al MINEDUC si ese código le corresponde a ese RUN a esta hora.
 *
 * Falla cerrado: solo `ok: true` sirve para firmar. No lanza: cualquier problema
 * de red o de formato vuelve como un motivo, para que la acción pueda decirle a
 * la persona exactamente qué pasó sin inventar una firma.
 */
export async function verificarCodigoVerificador(
  rutIngresado: string,
  codigoIngresado: string,
  cuando: Date = new Date(),
): Promise<ResultadoVerificacion> {
  const rut = normalizeRut(rutIngresado);
  if (!isValidRut(rut)) return rechazo("RUT_INVALIDO");

  const codigo = codigoIngresado.replace(/\D/g, "");
  if (codigo.length !== 6) return rechazo("CODIGO_INVALIDO");

  const url = `${ENDPOINT}?rut=${encodeURIComponent(rut)}&otp=${encodeURIComponent(codigo)}&DateWithTimeZone=${encodeURIComponent(
    momentoChile(cuando),
  )}`;

  let texto: string;
  try {
    const respuesta = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // El verificador no usa cookies ni sesión: solo el RUN y el código.
      cache: "no-store",
    });
    if (!respuesta.ok) return rechazo("SIN_CONEXION");
    texto = await respuesta.text();
  } catch {
    return rechazo("SIN_CONEXION");
  }

  let otpVerify: unknown;
  try {
    const envoltorio = JSON.parse(texto) as { statusCode?: unknown; body?: unknown };
    if (envoltorio?.statusCode !== 200 || typeof envoltorio.body !== "string") {
      return rechazo("RESPUESTA_INESPERADA");
    }
    const filas = JSON.parse(envoltorio.body) as unknown;
    const fila = Array.isArray(filas) ? filas[0] : null;
    if (!fila || typeof fila !== "object") return rechazo("RESPUESTA_INESPERADA");
    otpVerify = (fila as { OTPVERIFY?: unknown }).OTPVERIFY;
  } catch {
    return rechazo("RESPUESTA_INESPERADA");
  }

  if (otpVerify === true || otpVerify === "VERDADERO" || otpVerify === "TRUE") {
    return { ok: true, rut, codigo, verificadoEn: cuando };
  }
  if (otpVerify === "RUT_NO_EXISTE") return rechazo("RUT_NO_REGISTRADO");
  return rechazo("CODIGO_NO_CORRESPONDE");
}

function rechazo(motivo: MotivoRechazo): ResultadoVerificacion {
  return { ok: false, motivo, mensaje: MENSAJES[motivo] };
}
