// TOTP (RFC 6238) para el segundo factor. Parte pura (sin `node:crypto`),
// usable también desde el cliente. La parte criptográfica vive en
// `totp-crypto.ts` (solo servidor).
//
// Lo que hace: una app de autenticación (Google Authenticator, 1Password, etc.)
// muestra un código de 6 dígitos que cambia cada 30 segundos; el servidor lo
// verifica.
//
// El secreto NUNCA va en claro: se cifra con la llave de secretos de la app
// (la misma que protege el SII y Defontana).
//
// Esta parte es pura (sin `node:crypto`) y la puede usar la UI del cliente.
// Todo lo que necesita criptografía vive en `totp-crypto.ts` (solo servidor).

/** El secreto en bloques de 4, que es como lo copian a mano. */
export function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
