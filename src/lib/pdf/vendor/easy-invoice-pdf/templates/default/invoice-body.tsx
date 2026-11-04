import { Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { InvoicePdf417 } from "../common/invoice-pdf417";
import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import { type InvoiceData, resolveNumberFormatLocale } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";
import { formatAmountChunks, fractionDigitsFor } from "../../utils/format-amount";
import { InvoiceFooter } from "./invoice-footer";
import { InvoiceHeader } from "./invoice-header";
import { InvoiceItemsTable } from "./invoice-items-table";
import { InvoicePaymentTotals } from "./invoice-payment-totals";
import { InvoiceSellerBuyerInfo } from "./invoice-seller-buyer-info";
import { InvoiceVATSummaryTable } from "./invoice-vat-summary-table";
import "dayjs/locale/en";
import "dayjs/locale/pl";
import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import "dayjs/locale/ru";
import "dayjs/locale/uk";
import "dayjs/locale/fr";
import "dayjs/locale/it";
import "dayjs/locale/nl";

/**
 * Referencias de documento (orden de compra, guía de despacho).
 */
function Referencias({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const t = INVOICE_PDF_TRANSLATIONS[invoiceData.language];

  const filas: Array<{ tipo: string; folio: string | null; fecha: string | null }> = [];

  if (invoiceData.erpOrdenCompra) {
    filas.push({
      tipo: invoiceData.erpOrdenCompra,
      folio: invoiceData.erpOrdenCompraFolio ?? null,
      fecha: invoiceData.erpOrdenCompraFecha ?? null,
    });
  }
  if (invoiceData.erpGuiaDespacho) {
    filas.push({
      tipo: invoiceData.erpGuiaDespacho,
      folio: invoiceData.erpGuiaDespachoFolio ?? null,
      fecha: invoiceData.erpGuiaDespachoFecha ?? null,
    });
  }

  if (filas.length === 0) return null;

  return (
    <View style={{ width: "100%", marginBottom: 10 }}>
      <View style={styles.table}>
        <View style={[styles.tableRow, { borderTopWidth: 1 }]} fixed>
          <View style={[styles.tableCol, { flex: 2 }]}>
            <Text style={styles.tableCellBold}>
              Documento de Ref.
            </Text>
          </View>
          <View style={[styles.tableCol, { flex: 1 }]}>
            <Text style={styles.tableCellBold}>Razón de Ref.</Text>
          </View>
          <View style={[styles.tableCol, { flex: 1 }]}>
            <Text style={styles.tableCellBold}>Folio de Ref.</Text>
          </View>
          <View style={[styles.tableCol, { flex: 1 }]}>
            <Text style={styles.tableCellBold}>Fecha de Ref.</Text>
          </View>
        </View>
        {filas.map((fila, i) => (
          <View style={styles.tableRow} key={i}>
            <View style={[styles.tableCol, { flex: 2 }]}>
              <Text style={styles.tableCell}>{fila.tipo}</Text>
            </View>
            <View style={[styles.tableCol, { flex: 1 }]}>
              <Text style={styles.tableCell}></Text>
            </View>
            <View style={[styles.tableCol, { flex: 1 }]}>
              <Text style={styles.tableCell}>
                {fila.folio ?? ""}
              </Text>
            </View>
            <View style={[styles.tableCol, { flex: 1 }]}>
              <Text style={styles.tableCell}>
                {fila.fecha ?? ""}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Bloque de firma y acuse de recibo al pie del documento.
 */
function FirmaBloque({
  styles,
}: {
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  return (
    <View style={{ width: "100%", marginTop: 16 }}>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: 4 }}>
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Nombre:
          </Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", height: 12 }} />
        </View>
        <View style={{ flex: 1, marginLeft: 4, marginRight: 4 }}>
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Rut:
          </Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", height: 12 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Fecha:
          </Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", height: 12 }} />
        </View>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <View style={{ flex: 1, marginRight: 4 }}>
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Recinto:
          </Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", height: 12 }} />
        </View>
        <View style={{ flex: 1, marginLeft: 4, marginRight: 4 }}>
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Firma:
          </Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", height: 12 }} />
        </View>
        <View style={{ flex: 1 }} />
      </View>
      <View style={{ marginTop: 4 }}>
        <Text style={[styles.fontSize7, { lineHeight: 1.2 }]}>
          El acuse de recibo que se declara en este acto, de acuerdo a lo
          dispuesto en la letra b) del art&iacute;culo 4° y la letra c) del
          art&iacute;culo 5° de la ley 19.983, acredita que la entrega de
          mercaderia(s) o servicio(s) prestado(s) ha(n) sido recibido(s)
        </Text>
      </View>
    </View>
  );
}

export const InvoiceBody = ({
  invoiceData,
  styles,
  shouldLocaliseDates = true,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
  shouldLocaliseDates?: boolean;
}) => {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  if (shouldLocaliseDates) {
    dayjs.locale(language);
  }

  const invoiceTotal = invoiceData?.total;

  const invoiceTotalChunks = formatAmountChunks({
    amount: invoiceTotal,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
    fractionDigits: fractionDigitsFor(invoiceData.currency),
  });

  const formattedInvoiceTotal = invoiceTotalChunks.join("");

  const vatTableSummaryIsVisible = invoiceData.vatTableSummaryIsVisible;

  const isPdf417Visible =
    invoiceData?.qrCodeIsVisible &&
    invoiceData.qrCodeData &&
    invoiceData.qrCodeData.length > 0;

  return (
    <>
      <InvoiceHeader invoiceData={invoiceData} styles={styles} />

      {/* Emisor/receptor y campos adicionales del documento */}
      <InvoiceSellerBuyerInfo invoiceData={invoiceData} styles={styles} />

      {/* Referencias de documento (orden de compra, guía de despacho). */}
      <Referencias invoiceData={invoiceData} styles={styles} />

      <InvoiceItemsTable
        invoiceData={invoiceData}
        formattedInvoiceTotal={formattedInvoiceTotal}
        styles={styles}
      />

      {/* Debajo de la tabla de ítems: a la izquierda el PDF417 y a la derecha
          el cuadro de IVA con el total a pagar debajo. */}
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: vatTableSummaryIsVisible ? 0 : 20,
        }}
      >
        <View style={{ width: "50%" }}>
          {/* PDF417 del SII (timbre electrónico) - a la izquierda. */}
          {isPdf417Visible ? (
            <InvoicePdf417
              pdf417DataUrl={invoiceData.qrCodeData!}
              description={invoiceData.qrCodeDescription}
            />
          ) : null}
        </View>

        <View style={{ width: "50%" }}>
          {vatTableSummaryIsVisible ? (
            <InvoiceVATSummaryTable
              invoiceData={invoiceData}
              invoiceTotalChunks={invoiceTotalChunks}
              styles={styles}
            />
          ) : null}
          {/* El total a pagar va debajo del cuadro de IVA (Neto, IVA, Bruto). */}
          <InvoicePaymentTotals invoiceData={invoiceData} styles={styles} />
        </View>
      </View>

      {/* Bloque de firma y acuse de recibo */}
      <FirmaBloque styles={styles} />

      {/* Footer  */}
      <InvoiceFooter invoiceData={invoiceData} styles={styles} />
    </>
  );
}
