"use client";

import { useEffect, useRef, useState } from "react";
import type { ExcelCoord } from "@/lib/pdf/excel-layout";

/**
 * Miniatura visual del layout A4 (canvas).
 * Muestra campos como rectángulos con etiquetas en sus coordenadas.
 */
interface LayoutPreviewProps {
  /** Mapa campo -> coordenada Excel (desde plantilla._layout) */
  layout: Record<string, ExcelCoord>;
  /** Ancho del canvas en px (se escala internamente) */
  width?: number;
  /** Alto del canvas en px */
  height?: number;
}

const A4_ASPECT = 210 / 297; // ancho/alto

// Mapeo de nombres de campo a etiquetas cortas para la preview
const FIELD_LABELS: Record<string, string> = {
  mostrarEmpresa: "Empresa",
  mostrarRUT: "RUT",
  mostrarDireccion: "Dirección",
  mostrarTelefono: "Teléfono",
  mostrarCorreo: "Correo",
  mostrarReceptor: "Receptor",
  mostrarRUTReceptor: "RUT Recep.",
  mostrarDireccionReceptor: "Dir. Recep.",
  mostrarFechaEmision: "F. Emisión",
  mostrarFechaVencimiento: "F. Venc.",
  mostrarFolio: "Folio",
  mostrarTipoDocumento: "Tipo Doc.",
  mostrarItems: "Ítems",
  mostrarTotales: "Totales",
  mostrarRetencion: "Retención",
  mostrarExento: "Exento",
  mostrarRecargo: "Recargo",
  mostrarFormaPago: "F. Pago",
  mostrarPagado: "Pagado",
  mostrarPendiente: "Pendiente",
  mostrarImporteLetras: "Importe Let.",
  mostrarVendedor: "Vendedor",
  mostrarReferencias: "Referencias",
  mostrarHES: "HES",
  mostrarCdgVendedor: "Cdg Vend.",
  mostrarTipoDespacho: "T. Despacho",
  mostrarIndServicio: "Ind. Serv.",
  mostrarTpoTranVenta: "Tpo Tran.",
  mostrarCdgIntRecep: "Cdg Int.",
  mostrarDirPostal: "Dir. Postal",
  mostrarCmnaPostal: "Comuna Post.",
  mostrarCiudadPostal: "Ciudad Post.",
  mostrarUnidadItem: "Unidad",
  mostrarCodigoItem: "Código Item",
};

function excelToPreviewCoord(
  coord: ExcelCoord,
  canvasWidth: number,
  canvasHeight: number,
  margin = 20
): { x: number; y: number } {
  // Mismos parámetros que excelToPdfPosition pero escalados a canvas
  const scaleX = 4.0;
  const defaultColWidth = 8.43;
  const defaultRowHeight = 15;
  const marginLeft = 40;
  const marginTop = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Escalado a canvas (dejando margen)
  const scale = Math.min(
    (canvasWidth - 2 * margin) / pageWidth,
    (canvasHeight - 2 * margin) / pageHeight
  );
  
  const colWidthPt = defaultColWidth * scaleX;
  const rowHeightPt = defaultRowHeight;
  
  const xPt = marginLeft + (coord.col - 1) * colWidthPt;
  const yPt = marginTop + (coord.row - 1) * rowHeightPt;
  
  return {
    x: margin + xPt * scale,
    y: margin + yPt * scale,
  };
}

export function LayoutPreview({ layout, width = 300, height = 425 }: LayoutPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layoutKeys, setLayoutKeys] = useState<string[]>([]);

  useEffect(() => {
    setLayoutKeys(Object.keys(layout));
  }, [layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Fondo A4
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // Borde A4
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Dibujar cada campo
    for (const campo of layoutKeys) {
      const coord = layout[campo];
      if (!coord) continue;

      const pos = excelToPreviewCoord(coord, width, height);
      const label = FIELD_LABELS[campo] ?? campo;
      const style = (coord as { style?: { bold?: boolean; color?: string } }).style || {};

      // Color del rectángulo según estilo
      const color = style.color ? style.color : "#3b82f6";
      const isBold = style.bold;

      // Rectángulo representando el campo
      ctx.fillStyle = color + "20"; // 12% opacity
      ctx.strokeStyle = color;
      ctx.lineWidth = isBold ? 2 : 1;
      
      const rectWidth = 60;
      const rectHeight = 14;
      
      ctx.fillRect(pos.x, pos.y, rectWidth, rectHeight);
      ctx.strokeRect(pos.x, pos.y, rectWidth, rectHeight);

      // Texto
      ctx.fillStyle = isBold ? "#111827" : "#374151";
      ctx.font = `${isBold ? "bold " : ""}10px system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(label, pos.x + 4, pos.y + 10);
    }
  }, [layout, layoutKeys, width, height]);

  return (
    <div className="border border-border rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">Vista previa A4</span>
        <span className="text-xs text-muted-foreground">
          {layoutKeys.length} campos
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-border rounded"
      />
    </div>
  );
}