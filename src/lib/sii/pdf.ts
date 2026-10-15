import { chromium } from "playwright";

import type { FacturaPdfData } from "./pdf-template";
import { renderFacturaHtml } from "./pdf-template";

/**
 * Genera un PDF de factura renderizando una plantilla HTML en Chromium
 * headless (Playwright). Funciona idéntico en Windows y Linux porque
 * Chromium es el mismo motor en ambos.
 */
export async function generateFacturaPdf(data: FacturaPdfData): Promise<Uint8Array> {
  const html = await renderFacturaHtml(data);

  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    // Dar tiempo al PDF417 para renderizar en el canvas.
    await page.waitForTimeout(200);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
