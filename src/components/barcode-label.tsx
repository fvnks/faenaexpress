"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * Componente que renderiza una etiqueta individual con código de barras
 * Code 128 para un producto del POS.
 */
interface BarcodeLabelProps {
  sku: string;
  name: string;
  price?: number | null;
  width?: number;
  height?: number;
}

export function BarcodeLabel({
  sku,
  name,
  price,
  width = 250,
  height = 120,
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    // Limpiar SVG previo
    while (svgRef.current.firstChild) {
      svgRef.current.removeChild(svgRef.current.firstChild);
    }
    JsBarcode(svgRef.current, sku, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 14,
      textMargin: 5,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [sku]);

  const priceText = price !== null && price !== undefined ? `$${price.toLocaleString("es-CL", { maximumFractionDigits: 0 })}` : "Sin precio";

  return (
    <div
      className="border border-border rounded p-3 bg-white"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        boxSizing: "border-box",
        pageBreakInside: "avoid",
      }}
    >
      <div className="flex items-center justify-center mb-2">
        <svg ref={svgRef} />
      </div>
      <div className="text-center text-xs">
        <div className="font-mono text-sm font-bold truncate">{sku}</div>
        <div className="text-xs text-muted-foreground truncate">{name}</div>
        <div className="text-xs font-semibold text-foreground">{priceText}</div>
      </div>
    </div>
  );
}
