import type { DocumentType } from "@/generated/prisma/client";
import { promises as fsp } from "node:fs";
import { join } from "node:path";

import { formatDate } from "@/lib/money";
import { documentTypeLabel } from "@/lib/labels";

/**
 * Genera el HTML de una factura chilena siguiendo el template visual del SII.
 * Optimizado para Playwright/Chromium.
 */

const pdf417Path = join(process.cwd(), "node_modules", "pdf417-generator", "lib", "pdf417.js");

let pdf417Code: string | null = null;
async function loadPdf417(): Promise<string> {
  if (pdf417Code === null) {
    try {
      pdf417Code = await fsp.readFile(pdf417Path, "utf8");
    } catch {
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
    commune?: string | null;
    email: string | null;
    phone: string | null;
    giro?: string | null;
  };
  tercero: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
    commune?: string | null;
    giro?: string | null;
  };
  documento: {
    documentType: string;
    documentNumber: string | null;
    date: Date;
    dueDate: Date | null;
    status: string;
    paymentDate: Date | null;
    notes: string | null;
    formaPago?: string | null;
  };
  montos: {
    netAmount: number;
    ivaAmount: number;
    totalAmount: number;
    retentionAmount?: number;
    exento?: number;
  };
  items?: { codigo?: string; nombre: string; cantidad: string; precio: number; monto: number }[] | null;
  extras?: {
    description?: string | null;
    salesperson?: string | null;
    purchaseOrder?: string | null;
    dispatchGuide?: string | null;
    hesNumber?: string | null;
  };
};

// Mapeo de DocumentType a los códigos de tipo de documento del SII (TED)
const DOC_TYPE_TO_TD: Record<string, string> = {
  INVOICE: "33",       // Factura electrónica
  RECEIPT: "39",       // Boleta electrónica
  CREDIT_NOTE: "61",   // Nota de crédito
  DEBIT_NOTE: "56",    // Nota de débito
  GUIDE: "52",         // Guía de despacho
  OTHER: "33",         // Por defecto: facturas
};

export async function renderFacturaHtml(data: FacturaPdfData): Promise<string> {
  const lib = await loadPdf417();
  const tipoDoc = documentTypeLabel(data.documento.documentType as DocumentType);
  const rutEmisor = data.empresa.rut ?? "";
  const folio = data.documento.documentNumber ?? "";
  const tdCode = DOC_TYPE_TO_TD[data.documento.documentType] ?? "33";

  // TED visual simplificado para el timbre
  const tedData = [
    `RE:${rutEmisor}`,
    `TD:${tdCode}`,
    `F:${folio}`,
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
      console.error(e);
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
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 9px;
    color: #333;
    padding: 30px;
    line-height: 1.2;
    background: white;
  }

  /* Header */
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .emisor-info { flex: 1; }
  .emisor-name { font-size: 14px; font-weight: bold; color: #555; margin-bottom: 4px; }
  .emisor-giro { font-size: 9px; font-weight: bold; color: #666; margin-bottom: 4px; }
  .emisor-detail { font-size: 9px; color: #666; }

  .recuadro-dte {
    border: 3px solid #ff0000;
    width: 280px;
    padding: 15px;
    text-align: center;
    color: #ff0000;
    font-weight: bold;
  }
  .recuadro-dte .rut { font-size: 14px; margin-bottom: 8px; }
  .recuadro-dte .tipo { font-size: 14px; text-transform: uppercase; margin-bottom: 8px; }
  .recuadro-dte .folio { font-size: 14px; }

  .unidad-sii { text-align: right; color: #ff0000; font-weight: bold; font-size: 9px; margin-top: 5px; margin-right: 50px; }

  /* Client Box */
  .client-box {
    border: 2px solid #000;
    padding: 10px;
    margin-bottom: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }
  .client-box div { display: flex; gap: 5px; }
  .client-box label { font-weight: bold; min-width: 60px; }

  /* References Table */
  .references-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    border: 1px solid #000;
  }
  .references-table th {
    background: #f2f2f2;
    border: 1px solid #000;
    padding: 3px 5px;
    text-align: center;
    font-size: 8px;
  }
  .references-table td {
    border: 1px solid #000;
    padding: 3px 5px;
    text-align: center;
    font-size: 8px;
  }

  /* Items Table */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #000;
    min-height: 400px;
  }
  .items-table thead th {
    background: #f2f2f2;
    border: 1px solid #000;
    padding: 5px;
    font-size: 8px;
  }
  .items-table tbody td {
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    padding: 5px;
    vertical-align: top;
  }
  .items-table .monto-col { text-align: right; }
  .items-table .center-col { text-align: center; }

  /* Footer */
  .footer-container {
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    border: 2px solid #000;
    padding: 10px;
  }

  .timbre-box { width: 350px; text-align: center; }
  #barcode { width: 100%; height: auto; margin-bottom: 5px; }
  .timbre-text { font-size: 7px; color: #666; }

  .totals-box { width: 250px; }
  .totals-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #eee; }
  .totals-row.main { font-weight: bold; font-size: 10px; border-bottom: 2px solid #000; padding: 5px 0; }
  .totals-label { font-weight: bold; }

  .signature-box { flex: 1; padding: 10px; font-size: 8px; }
  .signature-field { border-bottom: 1px solid #000; margin-bottom: 10px; display: flex; justify-content: space-between; }

  @page { size: A4; margin: 0; }
</style>
</head>
<body>
  <div class="header">
    <div class="emisor-info">
      <div class="emisor-name">${data.empresa.name}</div>
      <div class="emisor-giro">${data.empresa.giro ?? ""}</div>
      <div class="emisor-detail">${data.empresa.address ?? ""}</div>
      <div class="emisor-detail">${data.empresa.commune ?? ""}</div>
      <div class="emisor-detail">${data.empresa.city ?? ""}</div>
    </div>
    <div>
      <div class="recuadro-dte">
        <div class="rut">R.U.T.: ${rutEmisor}</div>
        <div class="tipo">${tipoDoc}</div>
        <div class="folio">Folio N° ${folio}</div>
      </div>
      <div class="unidad-sii">UNIDAD S.I.I.</div>
    </div>
  </div>

  <div class="client-box">
    <div><label>Fecha:</label> <span>${formatDate(data.documento.date)}</span></div>
    <div style="justify-content: flex-end;"><label>Fecha vencimiento:</label> <span>${data.documento.dueDate ? formatDate(data.documento.dueDate) : "—"}</span></div>
    <div><label>Señor(es):</label> <span>${data.tercero.name}</span></div>
    <div></div>
    <div><label>Giro:</label> <span>${data.tercero.giro ?? ""}</span></div>
    <div></div>
    <div><label>Comuna:</label> <span>${data.tercero.commune ?? ""}</span></div>
    <div><label>Ciudad:</label> <span>${data.tercero.city ?? ""}</span></div>
    <div><label>R.U.T.:</label> <span>${data.tercero.rut ?? "—"}</span></div>
    <div><label>Dirección:</label> <span>${data.tercero.address ?? ""}</span></div>
    <div><label>Forma de pago:</label> <span>${data.documento.formaPago ?? "Contado"}</span></div>
  </div>

  ${(data.extras?.purchaseOrder || data.extras?.dispatchGuide) ? `
  <table class="references-table">
    <thead>
      <tr>
        <th>Tipo documento</th>
        <th>Folio</th>
        <th>Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${data.extras.purchaseOrder ? `
      <tr>
        <td>Orden de compra</td>
        <td>${data.extras.purchaseOrder}</td>
        <td>${formatDate(data.documento.date)}</td>
      </tr>` : ""}
      ${data.extras.dispatchGuide ? `
      <tr>
        <td>Guía de despacho electrónica</td>
        <td>${data.extras.dispatchGuide}</td>
        <td>${formatDate(data.documento.date)}</td>
      </tr>` : ""}
    </tbody>
  </table>` : ""}

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:15%;">CÓDIGO</th>
        <th>DESCRIPCIÓN</th>
        <th style="width:10%;">CANT.</th>
        <th style="width:12%;">P.UNITARIO</th>
        <th style="width:8%;">RECARGO</th>
        <th style="width:8%;">DESCUENTO</th>
        <th style="width:12%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${data.items ? data.items.map((item) => `
      <tr>
        <td class="center-col">${item.codigo ?? ""}</td>
        <td>${item.nombre}</td>
        <td class="center-col">${item.cantidad}</td>
        <td class="monto-col">${item.precio.toLocaleString("es-CL")}</td>
        <td class="monto-col"></td>
        <td class="monto-col"></td>
        <td class="monto-col">${item.monto.toLocaleString("es-CL")}</td>
      </tr>`).join("") : ""}
      <!-- Espaciador para forzar altura mínima -->
      <tr><td colspan="7" style="height: 300px; border:none;"></td></tr>
    </tbody>
  </table>

  <div class="footer-container">
    <div class="timbre-box">
      <canvas id="barcode"></canvas>
      <div class="timbre-text">
        Timbre electrónico SII<br/>
        Resolución 0 del 2026 - Verifique su documento en: www.sii.cl
      </div>
    </div>

    <div class="signature-box">
       <div class="signature-field"><span>NOMBRE:</span> <span>R.U.T.:</span></div>
       <div class="signature-field"><span>FECHA:</span> <span>RECINTO:</span></div>
       <div class="signature-field" style="margin-top:20px;"><span>FIRMA:</span></div>
       <div style="font-size:7px; color:#666; margin-top:5px;">
         "El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del artículo 4° y la letra c) del artículo 5° de la ley 19.983, acredita que la entrega de mercadería(s) o servicio(s) prestado(s) ha(n) sido recibido(s)"
       </div>
    </div>

    <div class="totals-box">
      <div class="totals-row">
        <span class="totals-label">Neto</span>
        <span>${data.montos.netAmount.toLocaleString("es-CL")}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">Exento</span>
        <span>${(data.montos.exento ?? 0).toLocaleString("es-CL")}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">IVA (19%)</span>
        <span>${data.montos.ivaAmount.toLocaleString("es-CL")}</span>
      </div>
      <div class="totals-row main">
        <span class="totals-label">Total</span>
        <span>${data.montos.totalAmount.toLocaleString("es-CL")}</span>
      </div>
    </div>
  </div>

  ${timbreScript}
</body>
</html>`;
}
