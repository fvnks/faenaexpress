/**
 * Renderer de factura basado en layout Excel (Option A).
 * 
 * Lee las coordenadas del layout guardado en la plantilla y renderiza
 * cada campo en su posición absoluta usando react-pdf.
 * 
 * Esta es una implementación inicial que cubre campos simples.
 * Para tablas (ítems) se necesita lógica más compleja.
 */

import { View, Text, Image } from "@react-pdf/renderer";
import { InvoiceData } from "./vendor/easy-invoice-pdf/schema";
import { excelToPdfPosition, type ExcelCoord } from "./excel-layout";

interface LayoutRendererProps {
  invoiceData: InvoiceData;
  /** Mapa campo -> coordenada Excel (desde plantilla._layout) */
  layout: Record<string, ExcelCoord>;
  /** Estilos base */
  styles: Record<string, React.CSSProperties>;
}

/** Mapea nombre de campo del layout a getter de valor en InvoiceData */
const FIELD_GETTERS: Record<string, (data: InvoiceData) => string | number | null> = {
  // Emisor
  mostrarEmpresa: (d) => d.seller?.name ?? null,
  mostrarRUT: (d) => d.seller?.vatNo ?? null,
  mostrarDireccion: (d) => [d.seller?.address, d.seller?.city, d.seller?.commune].filter(Boolean).join(", "),
  mostrarTelefono: (d) => d.seller?.phone ?? null,
  mostrarCorreo: (d) => [d.seller?.email, d.seller?.web].filter(Boolean).join(" "),
  
  // Receptor
  mostrarReceptor: (d) => d.buyer?.name ?? null,
  mostrarRUTReceptor: (d) => d.buyer?.vatNo ?? null,
  mostrarDireccionReceptor: (d) => [d.buyer?.address, d.buyer?.city, d.buyer?.commune].filter(Boolean).join(", "),
  
  // Fechas
  mostrarFechaEmision: (d) => d.dateOfIssue ?? null,
  mostrarFechaVencimiento: (d) => d.paymentDue ?? null,
  
  // Documento
  mostrarFolio: (d) => d.invoiceNumberObject?.value ?? null,
  mostrarTipoDocumento: (d) => d.invoiceType ?? null,
  
  // Pago
  mostrarFormaPago: (d) => d.paymentMethod ?? null,
  
  // Items
  mostrarItems: (d) => d.items?.length ? `${d.items.length} items` : null,
  
  // Totales (usar erp* fields)
  mostrarTotales: (d) => d.total ? `${d.total} ${d.currency}` : null,
  mostrarRetencion: (d) => d.erpRetentionAmount ? `${d.erpRetentionAmount} ${d.currency}` : null,
  mostrarExento: (d) => d.erpExemptAmount ? `${d.erpExemptAmount} ${d.currency}` : null,
  mostrarRecargo: (d) => d.erpSurchargeAmount ? `${d.erpSurchargeAmount} ${d.currency}` : null,
  mostrarImporteLetras: (d) => d.erpPaidAmount ? `${d.erpPaidAmount} ${d.currency}` : null, // placeholder
  
  // Vendedor / Referencias
  mostrarVendedor: (d) => d.erpVendedor ?? null,
  mostrarReferencias: (d) => {
    const refs: string[] = [];
    if (d.erpOrdenCompra) refs.push(`OC: ${d.erpOrdenCompra}`);
    if (d.erpGuiaDespacho) refs.push(`Guía: ${d.erpGuiaDespacho}`);
    return refs.join(" | ") || null;
  },
  mostrarHES: (d) => d.erpHesNumber ?? null,
  
  // Nuevos campos DTE - usar unknown + type guard
  mostrarCdgVendedor: (d) => (d as InvoiceData & { erpCdgVendedor?: string }).erpCdgVendedor ?? null,
  mostrarTipoDespacho: (d) => (d as InvoiceData & { erpTipoDespacho?: string }).erpTipoDespacho ?? null,
  mostrarIndServicio: (d) => (d as InvoiceData & { erpIndServicio?: string }).erpIndServicio ?? null,
  mostrarTpoTranVenta: (d) => (d as InvoiceData & { erpTpoTranVenta?: string }).erpTpoTranVenta ?? null,
  mostrarCdgIntRecep: (d) => (d as InvoiceData & { erpCdgIntRecep?: string }).erpCdgIntRecep ?? null,
  mostrarDirPostal: (d) => (d as InvoiceData & { erpDirPostal?: string }).erpDirPostal ?? null,
  mostrarCmnaPostal: (d) => (d as InvoiceData & { erpCmnaPostal?: string }).erpCmnaPostal ?? null,
  mostrarCiudadPostal: (d) => (d as InvoiceData & { erpCiudadPostal?: string }).erpCiudadPostal ?? null,
};

/** Estilos por defecto para campos renderizados en layout */
const DEFAULT_FIELD_STYLE = {
  fontSize: 8,
  fontFamily: "Helvetica",
  color: "#000000",
};

export function LayoutBasedInvoiceRenderer({ invoiceData, layout, styles }: LayoutRendererProps) {
  const children: React.ReactNode[] = [];

  for (const [campo, coord] of Object.entries(layout)) {
    const getter = FIELD_GETTERS[campo];
    if (!getter) continue;
    
    const value = getter(invoiceData);
    if (value === null || value === undefined || value === "") continue;
    
    // Convertir coordenadas Excel a posición PDF
    const pos = excelToPdfPosition(coord);
    
    // Determinar si es label+value o solo value
    const isLabelField = ["mostrarEmpresa", "mostrarReceptor", "mostrarFolio", "mostrarTipoDocumento"].includes(campo);
    const label = isLabelField ? `${campo.replace("mostrar", "").replace(/([A-Z])/g, " $1").trim()}: ` : "";
    
    // Estilo base + estilo de la celda Excel + estilos externos
    const cellStyle = (coord as { style?: { bold?: boolean; color?: string; fontSize?: number; align?: "left" | "center" | "right" } }).style || {};
    const externalStyle = styles?.[campo] || {};
    
    const fieldStyle = {
      position: "absolute" as const,
      left: pos.x,
      top: pos.y,
      fontSize: cellStyle.fontSize ?? externalStyle.fontSize ?? 8,
      fontFamily: externalStyle.fontFamily ?? "Helvetica",
      fontWeight: cellStyle.bold ? "bold" : (externalStyle.fontWeight ?? "normal"),
      color: cellStyle.color ?? externalStyle.color ?? "#000000",
      textAlign: (cellStyle.align ?? externalStyle.textAlign ?? "left") as "left" | "center" | "right",
    };

    children.push(
      <View
        key={campo}
        style={fieldStyle}
      >
        <Text>{label}{String(value)}</Text>
      </View>
    );
  }

  // También renderizar logo si está en layout
  if (layout.mostrarEmpresa && invoiceData.erpEmpresaLogo) {
    const coord = layout.mostrarEmpresa;
    if (coord) {
      const pos = excelToPdfPosition(coord);
      children.push(
        <View
          key="logo"
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            width: 100,
            height: 40,
          }}
        >
          <Image src={invoiceData.erpEmpresaLogo} style={{ width: "100%", height: "100%" }} />
        </View>
      );
    }
  }

  return <View style={{ position: "relative", width: "100%", height: "100%" }}>{children}</View>;
}

/**
 * Helper para generar layout por defecto basado en el diseño actual.
 * Útil para "bootstrap" - el usuario descarga, ve el layout por defecto,
 * lo ajusta en Excel y sube.
 */
export function generarLayoutPorDefecto(): Record<string, ExcelCoord> {
  return {
    // Encabezado emisor (izquierda arriba)
    mostrarEmpresa: { row: 4, col: 2 },      // B4
    mostrarDireccion: { row: 5, col: 2 },    // B5
    mostrarTelefono: { row: 6, col: 2 },     // B6
    mostrarCorreo: { row: 7, col: 2 },       // B7
    
    // Datos documento (derecha arriba)
    mostrarRUT: { row: 4, col: 15 },         // O4
    mostrarTipoDocumento: { row: 5, col: 15 }, // O5
    mostrarFolio: { row: 6, col: 15 },       // O6
    mostrarFechaEmision: { row: 7, col: 15 },  // O7
    
    // Receptor (izquierda medio)
    mostrarReceptor: { row: 10, col: 2 },    // B10
    mostrarRUTReceptor: { row: 11, col: 2 }, // B11
    mostrarDireccionReceptor: { row: 12, col: 2 }, // B12
    mostrarFechaVencimiento: { row: 13, col: 2 },  // B13
    mostrarFormaPago: { row: 14, col: 2 },   // B14
    
    // Referencias / Vendedor / HES
    mostrarVendedor: { row: 15, col: 2 },    // B15
    mostrarReferencias: { row: 16, col: 2 }, // B16
    mostrarHES: { row: 17, col: 2 },         // B17
    
    // Tabla items - inicio
    // (los items se renderizan con lógica aparte, no por layout simple)
    // mostrarItems: { row: 20, col: 1 },
    
    // Totales (derecha abajo)
    mostrarTotales: { row: 45, col: 15 },    // O45
    mostrarRetencion: { row: 46, col: 15 },  // O46
    mostrarExento: { row: 47, col: 15 },     // O47
    mostrarRecargo: { row: 48, col: 15 },    // O48
    mostrarImporteLetras: { row: 49, col: 2 }, // B49
  };
}