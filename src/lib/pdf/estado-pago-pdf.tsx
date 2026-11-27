import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { formatCLP, formatDate } from "@/lib/money";
import { totalPartida } from "@/lib/obra-budget";
import { PDF_FONT_FAMILY, PDF_FONT_FILES } from "@/lib/pdf/fonts";

// Mismas fuentes locales que el resto de los PDF: nada se baja de un tercero.
Font.register({
  family: PDF_FONT_FAMILY,
  fonts: [
    { src: PDF_FONT_FILES.regular },
    { src: PDF_FONT_FILES.bold, fontWeight: 700 },
  ],
});

export type EstadoPagoPdfItem = {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
};

export type EstadoPagoPdfData = {
  numero: number;
  periodo: string;
  estado: string;
  estadoLabel: string;
  /** Subtítulo opcional, p. ej. el subcontrato al que pertenece el EP. */
  subtitulo?: string | null;
  total: number;
  /** Desglose opcional para EP de subcontrato (bruto − anticipo − retención). */
  anticipo?: number | null;
  retencion?: number | null;
  createdAt: Date;
  facturadoAt: Date | null;
  obra: {
    name: string;
    code: string | null;
    mandante: string | null;
    rutMandante: string | null;
    direccion: string | null;
    comuna: string | null;
  };
  empresa: {
    name: string;
    rut: string | null;
    address: string | null;
    commune: string | null;
  } | null;
  aprobadoPor: string | null;
  items: EstadoPagoPdfItem[];
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: "#1A1A1A",
    backgroundColor: "#FFFFFF",
  },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  brand: { fontSize: 12, fontWeight: 700 },
  brandMeta: { fontSize: 8, color: "#5A5A5A", marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: 1 },
  folio: { fontSize: 11, color: "#C45A2A", fontWeight: 700, marginTop: 3 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#C45A2A", marginVertical: 14 },
  grid: { flexDirection: "row", gap: 24, marginBottom: 14 },
  col: { flex: 1 },
  label: { fontSize: 7, color: "#5A5A5A", textTransform: "uppercase", letterSpacing: 0.6 },
  value: { fontSize: 9, marginTop: 2 },
  sectionTitle: { fontSize: 9, fontWeight: 700, marginBottom: 6 },
  table: { borderWidth: 1, borderColor: "#D0D0D0" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  rowLast: { flexDirection: "row" },
  headCell: {
    padding: 6,
    fontWeight: 700,
    fontSize: 7,
    textTransform: "uppercase",
    color: "#5A5A5A",
    backgroundColor: "#F2F2F2",
  },
  cell: { padding: 6, fontSize: 8 },
  cellRight: { padding: 6, fontSize: 8, textAlign: "right" },
  codigo: { width: "16%" },
  desc: { width: "39%" },
  unidad: { width: "10%" },
  cant: { width: "12%" },
  precio: { width: "12%" },
  importe: { width: "11%" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10, gap: 12 },
  totalLabel: { fontSize: 10, fontWeight: 700 },
  totalValue: { fontSize: 12, fontWeight: 700, color: "#C45A2A" },
  note: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    fontSize: 8,
    color: "#5A5A5A",
  },
  signatures: { flexDirection: "row", gap: 30, marginTop: 40 },
  signature: { flex: 1, borderTopWidth: 1, borderTopColor: "#5A5A5A", paddingTop: 6 },
  signatureLabel: { fontSize: 8, color: "#5A5A5A" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#8A8A8A",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 6,
  },
});

function EstadoPagoDocument({ data }: { data: EstadoPagoPdfData }) {
  const items = data.items.map((item) => ({
    ...item,
    importe: totalPartida(item.cantidad, item.precioUnitario),
  }));
  // El importe se recalcula por línea con la misma regla del presupuesto.
  const bruto = items.reduce((sum, item) => sum + item.importe, 0);
  const conDescuentos = data.anticipo != null || data.retencion != null;
  const total = conDescuentos ? data.total : bruto;
  const folio = `EP-${String(data.numero).padStart(4, "0")}`;

  return (
    <Document title={`Estado de pago ${folio}`} author={data.empresa?.name ?? "Yellow ERP"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View>
            <Text style={styles.brand}>{data.empresa?.name ?? data.obra.name}</Text>
            {data.empresa?.rut ? <Text style={styles.brandMeta}>RUT {data.empresa.rut}</Text> : null}
            {data.empresa?.address ? <Text style={styles.brandMeta}>{data.empresa.address}</Text> : null}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>ESTADO DE PAGO</Text>
            <Text style={styles.folio}>{folio}</Text>
            <Text style={styles.brandMeta}>{data.estadoLabel}</Text>
            {data.subtitulo ? <Text style={styles.brandMeta}>{data.subtitulo}</Text> : null}
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.label}>Obra</Text>
            <Text style={styles.value}>{data.obra.name}</Text>
            {data.obra.code ? <Text style={styles.brandMeta}>Código {data.obra.code}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Mandante</Text>
            <Text style={styles.value}>{data.obra.mandante ?? "—"}</Text>
            {data.obra.rutMandante ? <Text style={styles.brandMeta}>RUT {data.obra.rutMandante}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Período</Text>
            <Text style={styles.value}>{data.periodo}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Emitido</Text>
            <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalle por partida</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.headCell, styles.codigo]}>Código</Text>
            <Text style={[styles.headCell, styles.desc]}>Partida</Text>
            <Text style={[styles.headCell, styles.unidad]}>Unid.</Text>
            <Text style={[styles.headCell, styles.cant]}>Cantidad</Text>
            <Text style={[styles.headCell, styles.precio]}>P. unitario</Text>
            <Text style={[styles.headCell, styles.importe]}>Importe</Text>
          </View>
          {items.map((item, index) => (
            <View key={`${item.codigo}-${index}`} style={index === items.length - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.cell, styles.codigo]}>{item.codigo}</Text>
              <Text style={[styles.cell, styles.desc]}>{item.descripcion}</Text>
              <Text style={[styles.cell, styles.unidad]}>{item.unidad}</Text>
              <Text style={[styles.cellRight, styles.cant]}>{String(item.cantidad)}</Text>
              <Text style={[styles.cellRight, styles.precio]}>{formatCLP(item.precioUnitario)}</Text>
              <Text style={[styles.cellRight, styles.importe]}>{formatCLP(item.importe)}</Text>
            </View>
          ))}
          {items.length === 0 ? (
            <View style={styles.rowLast}>
              <Text style={styles.cell}>Sin partidas en este estado de pago.</Text>
            </View>
          ) : null}
        </View>

        {conDescuentos ? (
          <View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Importe bruto</Text>
              <Text style={styles.value}>{formatCLP(bruto)}</Text>
            </View>
            {data.anticipo && data.anticipo > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Anticipo descontado</Text>
                <Text style={styles.value}>− {formatCLP(data.anticipo)}</Text>
              </View>
            ) : null}
            {data.retencion && data.retencion > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Retención</Text>
                <Text style={styles.value}>− {formatCLP(data.retencion)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{conDescuentos ? "Total a pagar" : "Total del estado de pago"}</Text>
          <Text style={styles.totalValue}>{formatCLP(total)}</Text>
        </View>

        {data.aprobadoPor ? (
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.label}>Aprobado por</Text>
              <Text style={styles.value}>{data.aprobadoPor}</Text>
            </View>
            {data.facturadoAt ? (
              <View style={styles.col}>
                <Text style={styles.label}>Facturado</Text>
                <Text style={styles.value}>{formatDate(data.facturadoAt)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.note}>
          Documento interno de control del avance de obra. No es un DTE ni una factura tributaria;
          el cobro se emite como venta en Facturas cuando el mandante aprueba este estado de pago.
        </View>

        <View style={styles.signatures}>
          <View style={styles.signature}>
            <Text style={styles.signatureLabel}>Aprobado por el ITO / mandante</Text>
          </View>
          <View style={styles.signature}>
            <Text style={styles.signatureLabel}>Por la contratista</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{folio} · {data.obra.name}</Text>
          <Text>Generado por Yellow ERP · {data.periodo}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderEstadoPagoPdf(data: EstadoPagoPdfData): Promise<Buffer> {
  return renderToBuffer(<EstadoPagoDocument data={data} />);
}
