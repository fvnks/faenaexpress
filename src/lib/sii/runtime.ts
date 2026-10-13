import { promises as fsp } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  NotAuthenticatedError,
  type AuditSink,
  type Clock,
  type CredentialLoginOptions,
  type KeyValueStore,
  type PortalDriver,
  type PortalSession,
  type Runtime,
} from "@albertomarturelo/sii-core";

/**
 * Integración de lectura con el SII vía @albertomarturelo/sii-core.
 *
 * Login desde la propia web (VPS con Coolify/Ubuntu): la Clave Tributaria
 * llega por HTTPS a una Server Action, se usa UNA sola vez con el login
 * headless del core (llena el formulario real del SII y la descarta con el
 * frame, ADR-010) y solo queda el cookie jar en disco. La Clave nunca se
 * guarda, se loguea ni se audita (el audit del core además tira claves
 * secretas por diseño).
 *
 * Lecturas SIN Chromium: el driver enruta restore() a una sesión fetch con
 * el cookie jar, así las sincronizaciones no levantan navegador. Solo el
 * login usa Playwright (cargado lazy desde el subpath /node).
 */

const SII_DIR = process.env.SII_HOME ? process.env.SII_HOME : join(homedir(), ".sii");

const LOGIN_HOST_HINT = "zeusr.sii.cl";

/**
 * Store sobre ~/.sii/<key>.json con el MISMO formato de la CLI (por si ambas
 * conviven). Escritura atómica con permisos restrictivos, como el core.
 */
class CliFileStore implements KeyValueStore {
  constructor(private readonly baseDir: string = SII_DIR) {}

  private pathFor(key: string): string {
    return join(this.baseDir, `${key}.json`);
  }

  async read<T>(key: string): Promise<T | null> {
    try {
      const raw = await fsp.readFile(this.pathFor(key), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    await fsp.mkdir(this.baseDir, { recursive: true });
    const target = this.pathFor(key);
    const tmp = `${target}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(value, null, 2));
    await fsp.rename(tmp, target);
  }

  async delete(key: string): Promise<void> {
    try {
      await fsp.unlink(this.pathFor(key));
    } catch {
      // ya no existía
    }
  }
}

type PlaywrightCookie = {
  name: string;
  value: string;
  domain: string;
  path?: string;
};

type StorageState = { cookies?: PlaywrightCookie[] };

/** Respuesta de texto del SII (par estructural de PublicResponse del core). */
type TextResponse = { status: number; body: string };
/** Solicitud pública sin sesión (par estructural de PublicRequest del core). */
type PublicReq = { method?: "GET" | "POST"; headers?: Record<string, string>; form?: Record<string, string> };

/** Sesión fetch con el cookie jar persistido: las lecturas no necesitan navegador. */
class FetchPortalSession implements PortalSession {
  private readonly cookies: PlaywrightCookie[];

  constructor(state: unknown) {
    this.cookies = (state as StorageState)?.cookies ?? [];
  }

  private cookieHeader(url: string): string {
    const host = new URL(url).hostname;
    const matches = this.cookies.filter((cookie) => {
      const domain = cookie.domain.replace(/^\./, "");
      return host === domain || host.endsWith(`.${domain}`);
    });
    return matches.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }

  private static assertAlive(response: Response): void {
    if (response.redirected && new URL(response.url).hostname.includes(LOGIN_HOST_HINT)) {
      throw new NotAuthenticatedError("La sesión del SII expiró: vuelve a iniciarla en Importar.");
    }
  }

  async goto(): Promise<string> {
    throw new Error("No soportado: la app solo consulta las APIs JSON del SII.");
  }

  async evaluate(): Promise<never> {
    throw new Error("No soportado: la app solo consulta las APIs JSON del SII.");
  }

  async requestJson(url: string, options: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: unknown } = {}): Promise<unknown> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const cookie = this.cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    if (options.body !== undefined) headers["Content-Type"] = headers["Content-Type"] ?? "application/json";

    const response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      redirect: "follow",
    });
    FetchPortalSession.assertAlive(response);

    const text = await response.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // La librería detecta la sesión vencida como respuesta no-JSON.
      if (text.includes(LOGIN_HOST_HINT) || text.toLowerCase().includes("<html")) {
        throw new NotAuthenticatedError("La sesión del SII expiró: vuelve a iniciarla en Importar.");
      }
      throw new Error("El SII respondió un cuerpo no-JSON inesperado.");
    }
  }

  async requestForm(url: string, options: { method?: "GET" | "POST"; headers?: Record<string, string>; form?: Record<string, string> } = {}): Promise<TextResponse> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const cookie = this.cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    const body = options.form ? new URLSearchParams(options.form).toString() : undefined;
    if (body !== undefined) headers["Content-Type"] = "application/x-www-form-urlencoded";

    const response = await fetch(url, { method: options.method ?? "POST", headers, body, redirect: "follow" });
    FetchPortalSession.assertAlive(response);
    return { status: response.status, body: await response.text() };
  }

  async requestText(url: string, options: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string } = {}): Promise<TextResponse> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const cookie = this.cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body,
      redirect: "follow",
    });
    FetchPortalSession.assertAlive(response);
    return { status: response.status, body: await response.text() };
  }

  async requestBinary(url: string, options: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; contentType: string | null; bytes: Uint8Array }> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const cookie = this.cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(url, { method: options.method ?? "GET", headers, body: options.body, redirect: "follow" });
    FetchPortalSession.assertAlive(response);
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  }

  async cookie(url: string, name: string): Promise<string | null> {
    const host = new URL(url).hostname;
    const found = this.cookies.find((cookie) => {
      const domain = cookie.domain.replace(/^\./, "");
      return cookie.name === name && (host === domain || host.endsWith(`.${domain}`));
    });
    return found?.value ?? null;
  }

  async storageState(): Promise<unknown> {
    return { cookies: this.cookies };
  }

  async close(): Promise<void> {
    // fetch no mantiene recursos abiertos.
  }
}

/**
 * Driver híbrido: lecturas por fetch (restore), login por Playwright headless
 * (el del core, que llena el formulario real del SII y descarta la Clave).
 * Playwright se carga lazy: solo se necesita durante el login.
 */
class AppPortalDriver implements PortalDriver {
  async credentialLogin(options: CredentialLoginOptions): Promise<PortalSession> {
    const { PlaywrightPortalDriver } = await import("@albertomarturelo/sii-core/node");
    return new PlaywrightPortalDriver().credentialLogin(options);
  }

  async restore(storageState: unknown): Promise<PortalSession> {
    return new FetchPortalSession(storageState);
  }

  async interactiveLogin(): Promise<never> {
    throw new NotAuthenticatedError(
      "Usa el formulario de inicio de sesión del SII en la página Importar.",
    );
  }

  async requestPublic(url: string, options: PublicReq = {}): Promise<TextResponse> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const body = options.form ? new URLSearchParams(options.form).toString() : undefined;
    if (body !== undefined) headers["Content-Type"] = "application/x-www-form-urlencoded";
    const response = await fetch(url, { method: options.method ?? "GET", headers, body });
    return { status: response.status, body: await response.text() };
  }
}

const appClock: Clock = {
  now: () => new Date(),
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const appAudit: AuditSink = {
  record(entry) {
    // Traza mínima; el detalle queda en nuestra auditoría propia.
    console.log(`[sii] ${entry.action} ${entry.result}${entry.rut ? ` rut=${entry.rut}` : ""}`);
  },
};

/**
 * Runtime de la app: lecturas por fetch, login por Playwright, sesión en ~/.sii.
 * Cada empresa tiene su PROPIA sesión del SII en ~/.sii/<companyId>/ para
 * que las credenciales (RUT + Clave Tributaria) estén separadas por empresa.
 */
export function createAppRuntime(companyId?: string): Runtime {
  const baseDir = companyId
    ? join(SII_DIR, companyId)
    : SII_DIR;
  return {
    clock: appClock,
    audit: appAudit,
    store: new CliFileStore(baseDir),
    portal: new AppPortalDriver(),
  };
}

export { CliFileStore, SII_DIR };
