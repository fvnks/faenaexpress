import { promises as fsp } from "node:fs";
import { join } from "node:path";

import { formatCLP, formatDate } from "@/lib/money";
import { documentTypeLabel } from "@/lib/labels";

/**
 * Genera el HTML de una factura estilo chilena para renderizar a PDF con
 * Playwright/Chromium. Incluye el timbre PDF417 generado en el propio
 * navegador headless (la librería usa Canvas, disponible en Chromium).
 */

const pdf417Path = join(process.cwd(), "node_modules", "pdf417-generator", "lib", "pdf417.js");

let pdf417Code: string | null = null;
async function loadPdf417(): Promise<string> {
  if (pdf417Code === null) {
    try {
      pdf417Code = await fsp.readFile(pdf417Path, "utf8");
    } catch {
      // Si no se puede leer (Docker multi-stage, etc.), el PDF se genera sin timbre.
      pdf417Code = "";
    }
  }
  return pdf417Code;
}

export type FacturaPdfData = {
  tipo: "compra" | "venta";
  empresa: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  };
  tercero: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
  };
  documento: {
    documentType: string;
    documentNumber: string | null;
    date: Date;
    dueDate: Date | null;
    status: string;
    paymentDate: Date | null;
    notes: string | null;
  };
  montos: {
    netAmount: number;
    ivaAmount: number;
    totalAmount: number;
    retentionAmount?: number;
  };
  items?: { nombre: string; cantidad: string; precio: number; monto: number }[] | null;
  extras?: {
    description?: string | null;
    salesperson?: string | null;
    purchaseOrder?: string | null;
    dispatchGuide?: string | null;
    hesNumber?: string | null;
  };
};

function statusLabel(status: string): string {
  return status === "PAID" ? "PAGADA" : "PENDIENTE";
}

export async function renderFacturaHtml(data: FacturaPdfData): Promise<string> {
  const lib = await loadPdf417();
  const es = data.tipo === "compra";
  const tipoDoc = documentTypeLabel(data.documento.documentType as "INVOICE" | "RECEIPT" | "CREDIT_NOTE" | "DEBIT_NOTE" | "OTHER");

  // TED visual: los campos clave del timbre (sin firma CAF — representación visual)
  const tedData = [
    `RE:${data.empresa.rut ?? ""}`,
    `TD:${data.documento.documentType === "INVOICE" ? "33" : "OTHER"}`,
    `F:${data.documento.documentNumber ?? ""}`,
    `FE:${data.documento.date.toISOString().slice(0, 10)}`,
    `RR:${data.tercero.rut ?? ""}`,
    `MNT:${data.montos.totalAmount}`,
  ].join("|");

  const timbreScript = lib
    ? `<script>${lib}</script>
  <script>
    try {
      const canvas = document.getElementById('barcode');
      PDF417.draw(${JSON.stringify(tedData)}, canvas, 3, 3, 2, '#000');
    } catch(e) {
      canvas.style.display = 'none';
    }
  </script>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    padding: 30px 40px;
    line-height: 1.5;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .empresa { max-width: 55%; }
  .empresa h1 { font-size: 18px; color: #1B5FA8; margin-bottom: 4px; }
  .empresa p { color: #555; font-size: 10px; }
  .doc-box { text-align: right; }
  .doc-box .tipo { font-size: 16px; font-weight: bold; color: #1B5FA8; text-transform: uppercase; }
  .doc-box .folio { font-size: 14px; margin-top: 4px; }
  .doc-box .fecha { font-size: 10px; color: #555; margin-top: 2px; }
  .doc-box .estado {
    display: inline-block; margin-top: 6px; padding: 3px 10px;
    border-radius: 4px; font-size: 10px; font-weight: bold;
    ${data.documento.status === "PAID"
      ? "background: #e8f5e9; color: #2e7d32;"
      : "background: #fff3e0; color: #e65100;"}
  }

  .section { margin-bottom: 16px; }
  .section-title {
    font-size: 10px; font-weight: bold; text-transform: uppercase;
    color: #1B5FA8; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px;
    letter-spacing: 1px;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-item label { font-size: 9px; color: #888; text-transform: uppercase; display: block; }
  .info-item span { font-size: 11px; font-weight: 500; }

  table.detalle { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.detalle th {
    background: #1B5FA8; color: white; padding: 8px 12px;
    font-size: 10px; text-transform: uppercase; text-align: left;
  }
  table.detalle td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }

  .totales { margin-top: 16px; margin-left: auto; width: 280px; }
  .totales .row { display: flex; justify-content: space-between; padding: 6px 12px; }
  .totales .row:last-child {
    background: #1B5FA8; color: white; font-weight: bold;
    border-radius: 4px; padding: 10px 12px; margin-top: 4px;
  }
  .totales .label { color: #666; font-size: 10px; text-transform: uppercase; }
  .totales .value { font-weight: 600; font-size: 12px; }

  .timbre { margin-top: 24px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; display: flex; gap: 16px; align-items: center; }
  .timbre-info { flex: 1; }
  .timbre-info p { font-size: 8px; color: #888; margin: 1px 0; }
  .timbre-info .titulo { font-size: 9px; font-weight: bold; color: #1B5FA8; margin-bottom: 4px; }
  canvas { border: 1px solid #ccc; }

  .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }

  @page { size: A4; margin: 0; }
</style>
</head>
<body>
  <div class="header">
    <div class="empresa">
      <h1>${data.empresa.name}</h1>
      <p>RUT: ${data.empresa.rut ?? "—"}</p>
      ${data.empresa.address ? `<p>${data.empresa.address}</p>` : ""}
      ${data.empresa.city ? `<p>${data.empresa.city}</p>` : ""}
      ${data.empresa.email ? `<p>${data.empresa.email}</p>` : ""}
      ${data.empresa.phone ? `<p>Tel: ${data.empresa.phone}</p>` : ""}
    </div>
    <div class="doc-box">
      <div class="tipo">${tipoDoc}</div>
      <div class="folio">N° ${data.documento.documentNumber ?? "—"}</div>
      <div class="fecha">Fecha: ${formatDate(data.documento.date)}</div>
      ${data.documento.dueDate ? `<div class="fecha">Vencimiento: ${formatDate(data.documento.dueDate)}</div>` : ""}
      <span class="estado">${statusLabel(data.documento.status)}</span>
      ${data.documento.paymentDate ? `<div class="fecha" style="color:#2e7d32;">Pagada: ${formatDate(data.documento.paymentDate)}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${es ? "Proveedor" : "Cliente"}</div>
    <div class="info-grid">
      <div class="info-item">
        <label>Razón Social</label>
        <span>${data.tercero.name}</span>
      </div>
      <div class="info-item">
        <label>RUT</label>
        <span>${data.tercero.rut ?? "—"}</span>
      </div>
      ${data.tercero.address ? `
      <div class="info-item">
        <label>Dirección</label>
        <span>${data.tercero.address}</span>
      </div>` : ""}
      ${data.tercero.city ? `
      <div class="info-item">
        <label>Ciudad</label>
        <span>${data.tercero.city}</span>
      </div>` : ""}
    </div>
  </div>

  ${data.extras?.description ? `
  <div class="section">
    <div class="section-title">Descripción</div>
    <p>${data.extras.description}</p>
  </div>` : ""}

  ${data.items && data.items.length > 0 ? `
  <div class="section">
    <div class="section-title">Detalle de Productos / Servicios</div>
    <table class="detalle">
      <thead>
        <tr>
          <th style="width:5%;">#</th>
          <th>Producto / Servicio</th>
          <th style="text-align:right; width:10%;">Cant.</th>
          <th style="text-align:right; width:15%;">Precio Unit.</th>
          <th style="text-align:right; width:15%;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.nombre}</td>
          <td style="text-align:right;">${item.cantidad}</td>
          <td style="text-align:right;">${formatCLP(item.precio)}</td>
          <td style="text-align:right;">${formatCLP(item.monto)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Resumen de Montos</div>
    <table class="detalle">
      <thead>
        <tr>
          <th>Concepto</th>
          <th style="text-align:right;">Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Monto Neto</td>
          <td style="text-align:right;">${formatCLP(data.montos.netAmount)}</td>
        </tr>
        <tr>
          <td>IVA (19%)</td>
          <td style="text-align:right;">${formatCLP(data.montos.ivaAmount)}</td>
        </tr>
        ${data.montos.retentionAmount && data.montos.retentionAmount > 0 ? `
        <tr>
          <td>Retención</td>
          <td style="text-align:right;">${formatCLP(data.montos.retentionAmount)}</td>
        </tr>` : ""}
      </tbody>
    </table>
    <div class="totales">
      <div class="row">
        <span class="label">Total</span>
        <span class="value">${formatCLP(data.montos.totalAmount)}</span>
      </div>
    </div>
  </div>

  ${data.extras?.salesperson || data.extras?.purchaseOrder || data.extras?.dispatchGuide || data.extras?.hesNumber ? `
  <div class="section">
    <div class="section-title">Referencias</div>
    <div class="info-grid">
      ${data.extras.salesperson ? `
      <div class="info-item"><label>Vendedor</label><span>${data.extras.salesperson}</span></div>` : ""}
      ${data.extras.purchaseOrder ? `
      <div class="info-item"><label>Orden de Compra / EDP</label><span>${data.extras.purchaseOrder}</span></div>` : ""}
      ${data.extras.dispatchGuide ? `
      <div class="info-item"><label>Guía de Despacho</label><span>${data.extras.dispatchGuide}</span></div>` : ""}
      ${data.extras.hesNumber ? `
      <div class="info-item"><label>N° HES</label><span>${data.extras.hesNumber}</span></div>` : ""}
    </div>
  </div>` : ""}

  ${data.documento.notes ? `
  <div class="section">
    <div class="section-title">Observaciones</div>
    <p>${data.documento.notes}</p>
  </div>` : ""}

  <div class="timbre">
    <canvas id="barcode"></canvas>
    <div class="timbre-info">
      <div class="titulo">Timbre Electrónico</div>
      <p>RE: ${data.empresa.rut ?? ""}</p>
      <p>TD: ${data.documento.documentType === "INVOICE" ? "33" : "OTHER"}</p>
      <p>F: ${data.documento.documentNumber ?? ""}</p>
      <p>FE: ${data.documento.date.toISOString().slice(0, 10)}</p>
      <p>RR: ${data.tercero.rut ?? ""}</p>
      <p>MNT: ${formatCLP(data.montos.totalAmount)}</p>
    </div>
  </div>

  <div class="footer">
    Documento generado desde Facturas — Representación visual de ${tipoDoc.toLowerCase()} N° ${data.documento.documentNumber ?? "—"}
  </div>

  ${timbreScript}
</body>
</html>`;
}
