/**
 * Worker de sincronización bancaria para la conciliación.
 *
 * Corre como proceso hijo aislado de la app: recibe banco y credenciales por
 * variables de entorno (nunca por argv, que es visible en la lista de
 * procesos) y escribe el resultado JSON en el archivo que llega como
 * argumento. La clave del banco jamás se guarda ni se loguea.
 *
 * Uso:
 *   OB_BANK=santander OB_RUT=12.345.678-9 OB_PASS=... node scripts/bank-sync-worker.mjs C:\temp\out.json
 *   node scripts/bank-sync-worker.mjs --find-chrome   (diagnóstico: imprime la ruta de Chrome)
 *
 * El resultado siempre se escribe (éxito o error) para que el padre no tenga
 * que adivinar: { success, bank, movements | accounts, error?, debug? }.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { getBank } from "open-banking-chile";

/**
 * Ruta a Chrome/Chromium. El paquete open-banking-chile solo busca rutas de
 * Linux, macOS y WSL, así que en Windows nativo y en la imagen Docker (que
 * trae el Chromium de Playwright) hay que resolverla acá.
 *
 * Prioridad: OB_CHROME_PATH explícito > Chrome instalado > cache de Playwright
 * (servidor) > Edge. Si no hay nada, devuelve undefined y el paquete intenta
 * su propia búsqueda antes de fallar.
 */
function resolveChromePath() {
  const env = process.env;
  const pf = env.ProgramFiles ?? "C:\\Program Files";
  const pfx86 = env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const localAppData = env.LocalAppData ?? "";
  const home = env.USERPROFILE ?? homedir();

  const candidates = [
    env.OB_CHROME_PATH,
    join(pf, "Google/Chrome/Application/chrome.exe"),
    join(pfx86, "Google/Chrome/Application/chrome.exe"),
    join(localAppData, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  // Chromium que descarga Playwright: en el contenedor vive en ~/.cache y en
  // Windows en %LOCALAPPDATA%. Se toma el build más nuevo.
  const caches = [
    env.PLAYWRIGHT_BROWSERS_PATH,
    join(home, ".cache/ms-playwright"),
    join(home, "Library/Caches/ms-playwright"),
    join(localAppData, "ms-playwright"),
    "/ms-playwright",
  ].filter(Boolean);

  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    let builds = [];
    try {
      builds = readdirSync(cache)
        .filter((name) => /^chromium-\d/.test(name))
        .sort()
        .reverse();
    } catch {
      continue;
    }
    for (const build of builds) {
      const binaries = [
        join(cache, build, "chrome-linux/chrome"),
        join(cache, build, "chrome-win/chrome.exe"),
        join(cache, build, "chrome-mac/Chromium.app/Contents/MacOS/Chromium"),
      ];
      for (const binary of binaries) {
        if (existsSync(binary)) return binary;
      }
    }
  }

  // Edge es Chromium: último recurso si no hay Chrome ni Playwright.
  for (const candidate of [
    join(pfx86, "Microsoft/Edge/Application/msedge.exe"),
    join(pf, "Microsoft/Edge/Application/msedge.exe"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

if (process.argv.includes("--find-chrome")) {
  const found = resolveChromePath();
  if (found) {
    console.log(found);
    process.exit(0);
  }
  console.error("No se encontró Chrome/Chromium.");
  process.exit(1);
}

const outPath = process.argv[2];

function finish(result) {
  if (!outPath) {
    console.error(JSON.stringify(result));
    process.exit(2);
  }
  writeFileSync(outPath, JSON.stringify(result), "utf8");
  process.exit(result.success ? 0 : 1);
}

const bankId = process.env.OB_BANK ?? "";
const rut = process.env.OB_RUT ?? "";
const password = process.env.OB_PASS ?? "";

if (!bankId || !rut || !password) {
  finish({ success: false, bank: bankId, error: "Faltan credenciales del banco." });
}

const bank = getBank(bankId);
if (!bank) {
  finish({ success: false, bank: bankId, error: `Banco no soportado: ${bankId}` });
}

const chromePath = resolveChromePath();

try {
  const result = await bank.scrape({
    rut,
    password,
    chromePath,
    onProgress: (step) => console.log(`[progreso] ${step}`),
  });
  finish(result);
} catch (error) {
  finish({
    success: false,
    bank: bankId,
    error: error instanceof Error ? error.message : String(error),
  });
}
