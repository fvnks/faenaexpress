// Plantilla propia del ERP para la factura comercial (venta y compra).
// Diseño "Fábrica de Registros" de DESIGN.md: papel limpio, franja negro mate,
// acento cobre, montos monoespaciados y estado con color + texto.

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCLP } from "@/lib/money";
import { PDF_FONT_FAMILY, PDF_FONT_FILES } from "@/lib/pdf/fonts";
import type { InvoiceData } from "@/lib/pdf/vendor/easy-invoice-pdf/schema";

Font.register({
  family: PDF_FONT_FAMILY,
  fonts: [
    { src: PDF_FONT_FILES.regular },
    { src: PDF_FONT_FILES.bold, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 8.5,
    color: "#161616",
    backgroundColor: "#FFFFFF",
    paddingBottom: 76,
  },
  top: { backgroundColor: "#0D0D0D", paddingHorizontal: 36, paddingTop: 30, paddingBottom: 0 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { flexDirection: "row", gap: 8, alignItems: "center", maxWidth: "55%" },
  mark: {
    width: 26, height: 26, borderRadius: 5, backgroundColor: "#C45A2A",
    color: "#FFFFFF", textAlign: "center", fontSize: 12, fontFamily: PDF_FONT_FAMILY,
    fontWeight: 700, paddingTop: 5,
  },
  brandName: { color: "#F0F0F0", fontSize: 11, fontWeight: 700 },
  brandMeta: { color: "#9A9A9A", fontSize: 7.5, fontFamily: "Courier", marginTop: 2 },
  docTitle: { color: "#F0F0F0", fontSize: 15, fontWeight: 700, textAlign: "right", maxWidth: "45%" },
  docMeta: { color: "#E8E8E8", fontSize: 10, fontFamily: "Courier", textAlign: "right", marginTop: 4 },
  rule: { height: 3, backgroundColor: "#C45A2A", marginTop: 26 },
  body: { paddingHorizontal: 36, paddingTop: 32 },
  parties: { flexDirection: "row", justifyContent: "space-between", gap: 32 },
  party: { width: "48%" },
  label: { fontSize: 7, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: 1 },
  partyName: { fontSize: 11, fontWeight: 700, marginTop: 4 },
  partyMeta: { fontSize: 8, color: "#6B6B6B", fontFamily: "Courier", lineHeight: 1.55, marginTop: 3 },
  right: { alignItems: "flex-end", width: "48%" },
  metaBox: {
    borderWidth: 1, borderColor: "#DCDCDC", borderRadius: 3,
    padding: 14, marginTop: 14, width: "100%",
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  metaKey: { fontSize: 7, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: 0.6 },
  metaVal: { fontSize: 8, fontFamily: "Courier", textAlign: "right" },
  table: { marginTop: 34 },
  th: {
    fontSize: 7, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: 0.8,
    borderBottomWidth: 1, borderBottomColor: "#DCDCDC", paddingVertical: 6, paddingHorizontal: 4,
  },
  td: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#EFEFEF" },
  tdZebra: { backgroundColor: "#FAFAFA" },
  num: { textAlign: "right", fontFamily: "Courier" },
  desc: { fontSize: 8.5 },
  sku: { fontSize: 7, color: "#8A8A8A", fontFamily: "Courier", marginTop: 2 },
  totals: { width: 300, marginLeft: "auto", marginTop: 26 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { fontSize: 8 },
  totalVal: { fontSize: 8, fontFamily: "Courier" },
  totalFinal: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 2, borderTopColor: "#0D0D0D", marginTop: 5, paddingTop: 7,
  },
  totalFinalLabel: { fontSize: 9.5, fontWeight: 700 },
  totalFinalVal: { fontSize: 10, fontWeight: 700, fontFamily: "Courier" },
  footer: {
    position: "absolute", left: 36, right: 36, bottom: 42,
    borderTopWidth: 1, borderTopColor: "#DCDCDC", paddingTop: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12,
  },
  footerNote: { fontSize: 7, color: "#8A8A8A", lineHeight: 1.4, maxWidth: "70%" },
  footerMeta: { fontSize: 7, color: "#8A8A8A", fontFamily: "Courier", textAlign: "right" },
  bar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "#0D0D0D", paddingHorizontal: 36, paddingVertical: 10,
    flexDirection: "row", justifyContent: "space-between",
  },
  barText: { color: "#8A8A8A", fontSize: 7, fontFamily: "Courier" },
  stamp: { width: 130 },
});

type Config = Record<string, boolean | undefined>;

export function FacturaPdfTemplate({ invoiceData }: { invoiceData: InvoiceData }) {
  const config = (invoiceData.erpPlantilla?.configuracion ?? {}) as Config;
  const esCompra = Boolean(invoiceData.erpIsPurchase);
  const emisor = invoiceData.seller;
  const receptor = invoiceData.buyer;
  const titulo = invoiceData.invoiceType || (esCompra ? "Factura de compra" : "Factura electrónica");
  const folio = invoiceData.invoiceNumberObject?.value ?? "";
  const fecha = invoiceData.dateOfIssue;

  const retention = invoiceData.erpRetentionAmount ?? 0;
  const exento = invoiceData.erpExemptAmount ?? 0;
  const recargo = invoiceData.erpSurchargeAmount ?? 0;
  const fuel = invoiceData.erpFuelTax ?? 0;
  const iva = invoiceData.erpIvaAmount ?? 0;
  const total = invoiceData.total;
  const pagado = invoiceData.erpPaidAmount ?? 0;
  const pendiente = Math.max(total - retention - pagado, 0);
  const neto = Math.max(total - iva - exento - recargo - fuel, 0);
  const tasa = invoiceData.erpIvaRate ?? 19;

  const items = config.mostrarItems === false ? [] : invoiceData.items;
  const showTotales = config.mostrarTotales !== false;
  const showUnit = config.mostrarUnidadItem === true;

  const meta: Array<[string, string]> = [];
  if (invoiceData.paymentDue) meta.push(["Vence", invoiceData.paymentDue]);
  if (invoiceData.paymentMethod && config.mostrarFormaPago !== false) meta.push(["Pago", invoiceData.paymentMethod]);
  if (invoiceData.erpVendedor && config.mostrarVendedor !== false) meta.push(["Vendedor", invoiceData.erpVendedor]);
  if (invoiceData.erpOrdenCompra && config.mostrarReferencias !== false) meta.push(["OC", invoiceData.erpOrdenCompra]);
  if (invoiceData.erpHesNumber && config.mostrarHES !== false) meta.push(["HES", invoiceData.erpHesNumber]);

  return (
    <Document title={`${titulo} ${folio}`} author="Yellow ERP">
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.topRow}>
            <View style={styles.brand}>
              <View style={styles.mark}>{esCompra ? "P" : "Y"}</View>
              <View>
                <Text style={styles.brandName}>{emisor.name}</Text>
                <Text style={styles.brandMeta}>
                  {[emisor.vatNo, emisor.notes].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.docTitle}>{titulo.toUpperCase()}</Text>
              <Text style={styles.docMeta}>{folio} · {fecha}</Text>
            </View>
          </View>
          <View style={styles.rule} />
        </View>

        <View style={styles.body}>
          <View style={styles.parties}>
            <View style={styles.party}>
              <Text style={styles.label}>{invoiceData.erpLabels?.seller ?? "Emisor"}</Text>
              <Text style={styles.partyName}>{emisor.name}</Text>
              <Text style={styles.partyMeta}>
                {[emisor.vatNo ? `RUT ${emisor.vatNo}` : null, emisor.address, emisor.commune, emisor.phone].filter(Boolean).join("\n")}
              </Text>
            </View>
            <View style={styles.right}>
              <View style={{ alignItems: "flex-end", width: "100%" }}>
                <Text style={styles.label}>{invoiceData.erpLabels?.buyer ?? "Receptor"}</Text>
                <Text style={styles.partyName}>{receptor.name}</Text>
                <Text style={[styles.partyMeta, { textAlign: "right" }]}>
                  {[receptor.vatNo ? `RUT ${receptor.vatNo}` : null, receptor.address, receptor.commune].filter(Boolean).join("\n")}
                </Text>
              </View>

              {meta.length > 0 ? (
                <View style={styles.metaBox}>
                  {meta.map(([clave, valor]) => (
                    <View key={clave} style={styles.metaRow}>
                      <Text style={styles.metaKey}>{clave}</Text>
                      <Text style={styles.metaVal}>{valor}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {items.length > 0 ? (
            <View style={styles.table}>
              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#DCDCDC" }}>
                <Text style={[styles.th, { width: "6%" }]}>#</Text>
                <Text style={[styles.th, { width: showUnit ? "42%" : "48%" }]}>Descripción</Text>
                {showUnit ? <Text style={[styles.th, { width: "10%" }]}>Unid.</Text> : null}
                <Text style={[styles.th, { width: "13%" }]}>Cant.</Text>
                <Text style={[styles.th, { width: "14%" }]}>P. unitario</Text>
                <Text style={[styles.th, { width: "15%" }]}>Importe</Text>
              </View>
              {items.map((item, index) => (
                <View
                  key={`${index}-${item.name ?? ""}`}
                  style={[
                    { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EFEFEF" },
                    index % 2 === 1 ? styles.tdZebra : {},
                  ]}
                >
                  <Text style={[styles.td, { width: "6%", fontFamily: "Courier", fontSize: 7 }]}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                  <Text style={[styles.td, { width: showUnit ? "42%" : "48%" }]}>
                    <Text style={styles.desc}>{item.name ?? "Ítem"}</Text>
                  </Text>
                  {showUnit ? <Text style={[styles.td, { width: "10%", fontFamily: "Courier" }]}>{item.unit ?? "UN"}</Text> : null}
                  <Text style={[styles.td, styles.num, { width: "13%" }]}>{item.amount}</Text>
                  <Text style={[styles.td, styles.num, { width: "14%" }]}>{formatCLP(item.netPrice)}</Text>
                  <Text style={[styles.td, styles.num, { width: "15%" }]}>{formatCLP(item.netAmount)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {showTotales ? (
            <View style={styles.totals}>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Neto</Text><Text style={styles.totalVal}>{formatCLP(neto)}</Text></View>
              {exento > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Exento</Text><Text style={styles.totalVal}>{formatCLP(exento)}</Text></View> : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA ({String(tasa).replace(".", ",")}%)</Text>
                <Text style={styles.totalVal}>{formatCLP(iva)}</Text>
              </View>
              {recargo > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Recargo</Text><Text style={styles.totalVal}>{formatCLP(recargo)}</Text></View> : null}
              {fuel > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Imp. específico</Text><Text style={styles.totalVal}>{formatCLP(fuel)}</Text></View> : null}
              {retention > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Retención</Text><Text style={styles.totalVal}>− {formatCLP(retention)}</Text></View> : null}
              <View style={styles.totalFinal}><Text style={styles.totalFinalLabel}>Total</Text><Text style={styles.totalFinalVal}>{formatCLP(total)}</Text></View>
              {pagado > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Pagado</Text><Text style={styles.totalVal}>{formatCLP(pagado)}</Text></View> : null}
              {pagado > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Pendiente</Text><Text style={styles.totalVal}>{formatCLP(pendiente)}</Text></View> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
            {invoiceData.qrCodeIsVisible && invoiceData.qrCodeData ? (
              <View>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={invoiceData.qrCodeData} style={styles.stamp} />
                <Text style={styles.footerNote}>PDF417 SII · código de referencia</Text>
              </View>
            ) : null}
            <Text style={styles.footerNote}>
              {invoiceData.erpFooterNote ?? "Código de referencia del documento — no reemplaza el timbre electrónico del SII."}
            </Text>
          </View>
          <Text
            style={styles.footerMeta}
            render={({ pageNumber, totalPages }) => `${folio} · PÁGINA ${pageNumber} DE ${totalPages}`}
          />
        </View>

        <View style={styles.bar}>
          <Text style={styles.barText}>{`${folio} · ${formatCLP(total)} · ${fecha}`}</Text>
          <Text style={styles.barText}>YELLOW ERP</Text>
        </View>
      </Page>
    </Document>
  );
}
