import { View, Text, Image } from "@react-pdf/renderer";
import { InvoiceData } from "./vendor/easy-invoice-pdf/schema";
import { excelToPdfPosition, type ExcelCoord } from "./excel-layout";

interface LayoutRendererProps {
  invoiceData: InvoiceData;
  layout: Record<string, ExcelCoord>;
}

const FIELD_GETTERS: Record<string, (data: InvoiceData) => string | number | null> = {
  mostrarEmpresa: (d) => d.seller?.name ?? null,
  mostrarRUT: (d) => d.seller?.vatNo ?? null,
  mostrarDireccion: (d) => [d.seller?.address, d.seller?.city, d.seller?.commune].filter(Boolean).join(", "),
  mostrarTelefono: (d) => d.seller?.phone ?? null,
  mostrarCorreo: (d) => [d.seller?.email, d.seller?.web].filter(Boolean).join(" "),
  mostrarReceptor: (d) => d.buyer?.name ?? null,
  mostrarRUTReceptor: (d) => d.buyer?.vatNo ?? null,
  mostrarDireccionReceptor: (d) => [d.buyer?.address, d.buyer?.city, d.buyer?.commune].filter(Boolean).join(", "),
  mostrarFechaEmision: (d) => d.dateOfIssue ?? null,
  mostrarFechaVencimiento: (d) => d.paymentDue ?? null,
  mostrarFolio: (d) => d.invoiceNumberObject?.value ?? null,
  mostrarTipoDocumento: (d) => d.invoiceType ?? null,
  mostrarFormaPago: (d) => d.paymentMethod ?? null,
  mostrarItems: (d) => d.items?.length ? `${d.items.length} items` : null,
  mostrarTotales: (d) => d.total ? `${d.total} ${d.currency}` : null,
  mostrarRetencion: (d) => d.erpRetentionAmount ? `${d.erpRetentionAmount} ${d.currency}` : null,
  mostrarExento: (d) => d.erpExemptAmount ? `${d.erpExemptAmount} ${d.currency}` : null,
  mostrarRecargo: (d) => d.erpSurchargeAmount ? `${d.erpSurchargeAmount} ${d.currency}` : null,
  mostrarVendedor: (d) => d.erpVendedor ?? null,
  mostrarReferencias: (d) => {
    const refs: string[] = [];
    if (d.erpOrdenCompra) refs.push(`OC: ${d.erpOrdenCompra}`);
    if (d.erpGuiaDespacho) refs.push(`Guía: ${d.erpGuiaDespacho}`);
    return refs.join(" | ") || null;
  },
  mostrarHES: (d) => d.erpHesNumber ?? null,
  mostrarPagado: (d) => d.erpPaidAmount ? `${d.erpPaidAmount} ${d.currency}` : null,
  mostrarPendiente: (d) => {
    const total = d.total ?? 0;
    const retencion = d.erpRetentionAmount ?? 0;
    const pagado = d.erpPaidAmount ?? 0;
    const pendiente = Math.max(total - retencion - pagado, 0);
    return pendiente > 0 ? `${pendiente} ${d.currency}` : null;
  },
  mostrarImporteLetras: (d) => {
    const total = d.total ?? 0;
    const retencion = d.erpRetentionAmount ?? 0;
    const pagado = d.erpPaidAmount ?? 0;
    const pendiente = Math.max(total - retencion - pagado, 0);
    return pendiente > 0 ? `${pendiente} ${d.currency} (en letras)` : null;
  },
  mostrarCdgVendedor: (d) => (d as InvoiceData & { erpCdgVendedor?: string }).erpCdgVendedor ?? null,
  mostrarTipoDespacho: (d) => (d as InvoiceData & { erpTipoDespacho?: string }).erpTipoDespacho ?? null,
  mostrarIndServicio: (d) => (d as InvoiceData & { erpIndServicio?: string }).erpIndServicio ?? null,
  mostrarTpoTranVenta: (d) => (d as InvoiceData & { erpTpoTranVenta?: string }).erpTpoTranVenta ?? null,
  mostrarCdgIntRecep: (d) => (d as InvoiceData & { erpCdgIntRecep?: string }).erpCdgIntRecep ?? null,
  mostrarDirPostal: (d) => (d as InvoiceData & { erpDirPostal?: string }).erpDirPostal ?? null,
  mostrarCmnaPostal: (d) => (d as InvoiceData & { erpCmnaPostal?: string }).erpCmnaPostal ?? null,
  mostrarCiudadPostal: (d) => (d as InvoiceData & { erpCiudadPostal?: string }).erpCiudadPostal ?? null,
  mostrarCondicionPago: (d) => (d as InvoiceData & { erpCondicionPago?: string }).erpCondicionPago ?? null,
  mostrarMonedaIngreso: (d) => (d as InvoiceData & { erpMonedaIngreso?: string }).erpMonedaIngreso ?? null,
  mostrarOrdenCompraFolio: (d) => (d as InvoiceData & { erpOrdenCompraFolio?: string }).erpOrdenCompraFolio ?? null,
  mostrarOrdenCompraFecha: (d) => (d as InvoiceData & { erpOrdenCompraFecha?: string }).erpOrdenCompraFecha ?? null,
  mostrarGuiaDespachoFolio: (d) => (d as InvoiceData & { erpGuiaDespachoFolio?: string }).erpGuiaDespachoFolio ?? null,
  mostrarGuiaDespachoFecha: (d) => (d as InvoiceData & { erpGuiaDespachoFecha?: string }).erpGuiaDespachoFecha ?? null,
  mostrarFechaDocumento: (d) => (d as InvoiceData & { erpFechaDocumento?: string }).erpFechaDocumento ?? null,
  mostrarCiudadDocumento: (d) => (d as InvoiceData & { erpCiudad?: string }).erpCiudad ?? null,
  mostrarTasaIngreso: (d) => (d as InvoiceData & { erpTasaIngreso?: number }).erpTasaIngreso != null ? `${(d as InvoiceData & { erpTasaIngreso?: number }).erpTasaIngreso}%` : null,
  mostrarIvaAmount: (d) => (d as InvoiceData & { erpIvaAmount?: number }).erpIvaAmount != null ? `${(d as InvoiceData & { erpIvaAmount?: number }).erpIvaAmount} ${d.currency}` : null,
};

/** Valor de una celda de la tabla de ítems. */
type ItemValue = string | number | null | undefined;

/** Fila de la tabla de ítems indexada por el nombre de la columna. */
type ItemRecord = { [key: string]: ItemValue };

interface ItemsTableColumn {
  key: string;
  label: string;
  width: number;
  align: "left" | "center" | "right";
  format?: (value: ItemValue) => string;
}

const ITEMS_TABLE_COLUMNS: ItemsTableColumn[] = [
  { key: "name", label: "Descripción", width: 180, align: "left" },
  { key: "quantity", label: "Cant.", width: 50, align: "center", format: (v) => Number(v).toLocaleString("es-CL", { maximumFractionDigits: 4 }) },
  { key: "unit", label: "Unid.", width: 40, align: "center" },
  { key: "unitPrice", label: "P. Unit.", width: 70, align: "right", format: (v) => Number(v).toLocaleString("es-CL") },
  { key: "amount", label: "Importe", width: 80, align: "right", format: (v) => Number(v).toLocaleString("es-CL") },
];

function renderItemsTable(
  items: InvoiceData["items"],
  startPos: { x: number; y: number },
  layout: Record<string, ExcelCoord>,
): React.ReactNode[] {
  const children: React.ReactNode[] = [];

  const activeColumns = ITEMS_TABLE_COLUMNS.filter(c => c.key !== "unit" || layout.mostrarUnidadItem);
  
  let colX = 0;
  const colPositions: number[] = [];
  ITEMS_TABLE_COLUMNS.forEach((col) => {
    if (col.key === "unit" && !layout.mostrarUnidadItem) return;
    colPositions.push(colX);
    colX += col.width;
  });

  ITEMS_TABLE_COLUMNS.forEach((col) => {
    if (col.key === "unit" && !layout.mostrarUnidadItem) return;
    const idx = activeColumns.findIndex(c => c.key === col.key);
    children.push(
      <View
        key={`header-${col.key}`}
        style={{
          position: "absolute",
          left: colPositions[idx],
          top: 0,
          width: col.width,
          height: 20,
          backgroundColor: "#f3f4f6",
          borderBottomWidth: 1,
          borderBottomColor: "#d1d5db",
          display: "flex",
          alignItems: "center",
          justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start",
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: 7, fontWeight: "bold", fontFamily: "Helvetica", color: "#000000" }}>{col.label}</Text>
      </View>
    );
  });

  let currentY = 20;
  (items ?? []).forEach((item, rowIndex) => {
    if (currentY > 700) return;
    ITEMS_TABLE_COLUMNS.forEach((col) => {
      if (col.key === "unit" && !layout.mostrarUnidadItem) return;
      const idx = activeColumns.findIndex(c => c.key === col.key);
      let value: ItemValue = (item as unknown as ItemRecord)[col.key];
      if (col.format && value != null) {
        value = col.format(value);
      } else if (value == null) {
        value = "";
      }
      children.push(
        <View
          key={`row-${rowIndex}-${col.key}`}
          style={{
            position: "absolute",
            left: colPositions[idx],
            top: currentY,
            width: col.width,
            height: 18,
            backgroundColor: rowIndex % 2 === 0 ? "#ffffff" : "#f9fafb",
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 7, fontFamily: "Helvetica", color: "#000000" }}>{String(value)}</Text>
        </View>
      );
    });
    currentY += 18;
  });

  return children.map((child, idx) => (
    <View
      key={`table-${idx}`}
      style={{
        position: "absolute",
        left: startPos.x,
        top: startPos.y,
        width: 420,
        height: 700,
      }}
    >
      {child}
    </View>
  ));
}

export function LayoutBasedInvoiceRenderer({ invoiceData, layout }: LayoutRendererProps) {
  const children: React.ReactNode[] = [];

  if (layout.mostrarItems) {
    const itemsCoord = layout.mostrarItems;
    if (itemsCoord) {
      const pos = excelToPdfPosition(itemsCoord);
      const tableChildren = renderItemsTable(invoiceData.items, pos, layout);
      children.push(...tableChildren);
    }
  }

  for (const [campo, coord] of Object.entries(layout)) {
    if (campo === "mostrarItems" || campo === "mostrarCodigoItem" || campo === "mostrarUnidadItem") continue;
    const getter = FIELD_GETTERS[campo];
    if (!getter) continue;
    const value = getter(invoiceData);
    if (value === null || value === undefined || value === "") continue;
    const pos = excelToPdfPosition(coord);
    const isLabelField = ["mostrarEmpresa", "mostrarReceptor", "mostrarFolio", "mostrarTipoDocumento"].includes(campo);
    const label = isLabelField ? `${campo.replace("mostrar", "").replace(/([A-Z])/g, " $1").trim()}: ` : "";
    const cellStyle = (coord as { style?: { bold?: boolean; color?: string; fontSize?: number; align?: "left" | "center" | "right" } }).style || {};
    const fieldStyle = {
      position: "absolute" as const,
      left: pos.x,
      top: pos.y,
      fontSize: cellStyle.fontSize ?? 8,
      fontFamily: "Helvetica",
      fontWeight: cellStyle.bold ? "bold" : "normal",
      color: cellStyle.color ?? "#000000",
      textAlign: (cellStyle.align ?? "left") as "left" | "center" | "right",
    };
    children.push(
      <View key={campo} style={fieldStyle}>
        <Text>{label}{String(value)}</Text>
      </View>
    );
  }

  if (layout.mostrarEmpresa && invoiceData.erpEmpresaLogo) {
    const coord = layout.mostrarEmpresa;
    if (coord) {
      const pos = excelToPdfPosition(coord);
      children.push(
        <View key="logo" style={{ position: "absolute", left: pos.x, top: pos.y, width: 100, height: 40 }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={invoiceData.erpEmpresaLogo} style={{ width: "100%", height: "100%" }} />
        </View>
      );
    }
  }

  return <View style={{ position: "relative", width: "100%", height: "100%" }}>{children}</View>;
}

export function generarLayoutPorDefecto(): Record<string, ExcelCoord> {
  return {
    mostrarEmpresa: { row: 4, col: 2 },
    mostrarDireccion: { row: 5, col: 2 },
    mostrarTelefono: { row: 6, col: 2 },
    mostrarCorreo: { row: 7, col: 2 },
    mostrarRUT: { row: 4, col: 15 },
    mostrarTipoDocumento: { row: 5, col: 15 },
    mostrarFolio: { row: 6, col: 15 },
    mostrarFechaEmision: { row: 7, col: 15 },
    mostrarReceptor: { row: 10, col: 2 },
    mostrarRUTReceptor: { row: 11, col: 2 },
    mostrarDireccionReceptor: { row: 12, col: 2 },
    mostrarFechaVencimiento: { row: 13, col: 2 },
    mostrarFormaPago: { row: 14, col: 2 },
    mostrarVendedor: { row: 15, col: 2 },
    mostrarReferencias: { row: 16, col: 2 },
    mostrarHES: { row: 17, col: 2 },
    mostrarItems: { row: 20, col: 1 },
    mostrarCodigoItem: { row: 20, col: 1 },
    mostrarUnidadItem: { row: 20, col: 1 },
    mostrarTotales: { row: 45, col: 15 },
    mostrarRetencion: { row: 46, col: 15 },
    mostrarExento: { row: 47, col: 15 },
    mostrarRecargo: { row: 48, col: 15 },
    mostrarImporteLetras: { row: 49, col: 2 },
  };
}
