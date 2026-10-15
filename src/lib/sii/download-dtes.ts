import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { chromium, type Browser, type Page } from "playwright";

/**
 * Descarga los XML DTE de documentos RECIBIDOS (compras) desde el portal
 * del SII usando Playwright con la sesión existente.
 *
 * El SII no expone un API pública para esto: hay que navegar el portal.
 * La estrategia es entrar a "Respaldo de DTE" (descarga masiva del período)
 * y capturar los XML que el portal sirve.
 */

const SII_DIR = process.env.SII_HOME ? process.env.SII_HOME : join(homedir(), ".sii");

type StoredSession = { cookies?: unknown; rut?: string; savedAt?: string };

/** Extrae el array de cookies del storageState (formato Playwright o nuestro). */
function extractCookies(session: StoredSession): { name: string; value: string; domain: string; path?: string }[] {
  const raw = session.cookies;
  if (!raw) return [];
  // Formato Playwright storageState: { cookies: [...], origins: [...] }
  if (typeof raw === "object" && raw !== null && "cookies" in raw) {
    const state = raw as { cookies?: unknown };
    return Array.isArray(state.cookies) ? state.cookies : [];
  }
  // Formato directo: array de cookies
  if (Array.isArray(raw)) return raw;
  return [];
}

export type DownloadedDte = {
  folio: string;
  tipoDTE: number;
  rutEmisor: string;
  xml: string;
};

export type DownloadResult = {
  dtes: DownloadedDte[];
  error?: string;
};

/** URLs candidatas del portal SII donde están los DTE recibidos. */
const PORTAL_URLS = [
  "https://www4.sii.cl/rfi/",
  "https://www4.sii.cl/sfe/",
  "https://www.sii.cl/servicios_online/3523-factura_electronica_adquirientes-3699.html",
  "https://www.sii.cl/factura_electronica/factura_mercado/consulta_dte_recibidos.html",
];

async function readSession(companyId: string): Promise<StoredSession | null> {
  try {
    const raw = await fsp.readFile(join(SII_DIR, companyId, "session.json"), "utf8");
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

/**
 * Abre Chromium headless con las cookies de la sesión del SII y navega.
 * Retorna la página para que el llamador interactúe con ella.
 */
async function openSiiSession(companyId: string): Promise<{ browser: Browser; page: Page } | null> {
  const session = await readSession(companyId);
  if (!session) return null;

  const cookies = extractCookies(session);
  if (cookies.length === 0) return null;

  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  const context = await browser.newContext();

  // Convertir cookies al formato que espera Playwright addCookies.
  const playwrightCookies = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain.startsWith(".") ? cookie.domain : `.${cookie.domain}`,
    path: cookie.path || "/",
  }));
  await context.addCookies(playwrightCookies);

  const page = await context.newPage();
  return { browser, page };
}

/**
 * Explora el portal del SII para descubrir dónde están los DTE recibidos.
 * Retorna un informe de lo que encuentra en cada URL.
 */
export async function exploreSiiPortal(companyId: string): Promise<{
  findings: { url: string; status: number; title: string; links: string[] }[];
  error?: string;
}> {
  const session = await openSiiSession(companyId);
  if (!session) {
    return { findings: [], error: "Sin sesión del SII. Inicia sesión primero." };
  }

  const { browser, page } = session;
  const findings: { url: string; status: number; title: string; links: string[] }[] = [];

  try {
    for (const url of PORTAL_URLS) {
      try {
        const response = await page.goto(url, { timeout: 15000, waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        const title = await page.title();
        // Capturar todos los links que contengan DTE, factura, XML, recibido, descarga
        const links = await page.evaluate(() => {
          const anchors = [...document.querySelectorAll("a[href]")];
          return anchors
            .map((a) => ({ href: a.getAttribute("href") ?? "", text: a.textContent?.trim() ?? "" }))
            .filter((l) =>
              /dte|factura|xml|recibido|descarga|respaldo|consulta/i.test(l.text + l.href),
            )
            .slice(0, 15)
            .map((l) => `${l.text} → ${l.href}`);
        });
        findings.push({ url, status, title, links });
      } catch (err) {
        findings.push({
          url,
          status: 0,
          title: "Error de navegación",
          links: [err instanceof Error ? err.message : String(err)],
        });
      }
    }
  } finally {
    await browser.close();
  }

  return { findings };
}

/**
 * Descarga los XML DTE recibidos del SII para un período.
 * Navega al portal, encuentra los documentos y captura el XML de cada uno.
 */
export async function downloadReceivedDtes(
  companyId: string,
  periodo: string, // AAAA-MM
): Promise<DownloadResult> {
  const session = await openSiiSession(companyId);
  if (!session) {
    return { dtes: [], error: "Sin sesión del SII. Inicia sesión primero." };
  }

  const { browser, page } = session;
  const dtes: DownloadedDte[] = [];

  try {
    // Estrategia 1: Ir al portal RFI (Sistema de Registro de Facturas)
    await page.goto("https://www4.sii.cl/rfi/", { timeout: 30000, waitUntil: "networkidle" });

    // Tomar screenshot para depuración
    await page.screenshot({ path: join(SII_DIR, companyId, "portal-debug.png") });

    // Buscar links de DTE recibidos
    const pageContent = await page.content();

    // Si hay un redirect a login, la sesión expiró
    if (page.url().includes("zeusr.sii.cl")) {
      return { dtes: [], error: "La sesión del SII expiró. Vuelve a iniciarla en Importar." };
    }

    // TODO: Navegar a la sección de DTE recibidos y descargar los XML.
    // Esto depende de la estructura del portal del SII, que descubriremos
    // con la exploración (exploreSiiPortal).

    return { dtes, error: "Exploración pendiente: usa exploreSiiPortal para descubrir la estructura del portal." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { dtes: [], error: `No se pudo navegar al portal del SII: ${message}` };
  } finally {
    await browser.close();
  }
}
