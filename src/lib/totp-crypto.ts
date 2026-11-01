// TOTP (RFC 6238) para el segundo factor: parte que necesita `node:crypto`.
// Se importa solo desde servidor (las acciones y libs de backend). Nunca va al
// bundle del cliente, que no puede cargar módulos de Node.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const DIGITS = 6;
const PERIOD_SECONDS = 30;
// Ventana de tolerancia: se acepta el código anterior y el siguiente (±30 s),
// para no fallar por un reloj desfasado.
const WINDOW = 1;

/** Genera un secreto nuevo, en base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** El código que corresponde a un instante dado. */
export function totpCode(secret: string, timestampMs: number = Date.now()): string {
  const counter = Math.floor(timestampMs / 1000 / PERIOD_SECONDS);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Verifica un código, con tolerancia de ±1 paso. */
export function verifyTotp(secret: string, code: string, timestampMs: number = Date.now()): boolean {
  const limpio = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpio)) return false;

  const counter = Math.floor(timestampMs / 1000 / PERIOD_SECONDS);
  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter + drift));
    const digest = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const esperado = String(binary % 10 ** DIGITS).padStart(DIGITS, "0");

    // Comparación en tiempo constante: no filtrar por comparación de strings.
    const a = Buffer.from(esperado);
    const b = Buffer.from(limpio);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** El enlace que la app de autenticación lee (se puede escanear como QR). */
export function totpUri(params: {
  secret: string;
  account: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${params.issuer}:${params.account}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("El secreto no es válido.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
