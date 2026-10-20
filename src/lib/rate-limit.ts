// Limitador de tasa en memoria, simple y sin dependencias.
// Ideal para la carga real del SaaS (miles de operaciones/día). Si se escala a N
// instancias, reemplazar por Redis o similar.
//
// Uso:
//   const limiter = new RateLimiter({ max: 5, windowMs: 60_000 });
//   const key = `${ip}:${action}`;
//   if (!limiter.allow(key)) return { error: "Demasiados intentos. Espera un momento." };
//   await operacion();

export class RateLimiter {
  private entries = new Map<string, { count: number; resetAt: number }>();

  constructor(private opts: { max: number; windowMs: number }) {}

  /** Devuelve true si la operación es permitida; false si excede el límite. */
  allow(key: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || now > entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + this.opts.windowMs });
      return true;
    }
    if (entry.count >= this.opts.max) return false;
    entry.count += 1;
    return true;
  }

  /**
   * Olvida el contador de una clave. Se usa cuando el acierto no debe gastar un
   * intento: si no, un usuario que se equivoca cinco veces queda bloqueado
   * aunque después acierte.
   */
  reset(key: string): void {
    this.entries.delete(key);
  }

  // Solo para tests internos.
  _resetAll(): void {
    this.entries.clear();
  }
}
