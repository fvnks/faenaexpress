import { Text, View } from "@react-pdf/renderer";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import type { InvoiceData } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";

export function InvoiceSellerBuyerInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  /** Una línea de texto con etiqueta opcional y valor en negrita. */
  const sellerLine = (
    label: string | undefined,
    value: string | null | undefined,
  ) => {
    if (!value) return null;
    return (
      <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
        {label ? `${label}: ` : ""}
        <Text style={[styles.boldText, styles.fontSize8]}>{value}</Text>
      </Text>
    );
  };

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        maxWidth: "512px",
      }}
    >
      {/* Seller info - toda la información disponible del emisor */}
      <View style={{ width: "280px", marginRight: 25 }}>
        {/* MODIFICACIÓN (vendorizado): el original ponía "Vendedor" y "Comprador".
            El ERP imprime "Emisor" y "Receptor", porque en una factura de compra los
            papeles están al revés. */}
        <Text style={styles.subheader}>
          {invoiceData.erpLabels?.seller ?? t.seller.name}
        </Text>
        <Text style={[styles.fontBold, styles.fontSize10]}>
          {invoiceData?.seller.name}
        </Text>
        {sellerLine(
          undefined,
          invoiceData?.seller.address,
        )}
        {sellerLine(
          undefined,
          [invoiceData?.seller.city, invoiceData?.seller.commune]
            .filter(Boolean)
            .join(", "),
        )}
        {sellerLine("Giro", invoiceData?.seller.notes)}
        {sellerLine("Email", invoiceData?.seller.email)}
        {invoiceData.seller.vatNoFieldIsVisible ? (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {invoiceData.seller.vatNoLabelText}:{" "}
            <Text style={[styles.boldText, styles.fontSize8]}>
              {invoiceData?.seller.vatNo}
            </Text>
          </Text>
        ) : null}
      </View>

      {/* Buyer info */}
      <View style={{ width: "280px" }}>
        <Text style={styles.subheader}>
          {invoiceData.erpLabels?.buyer ?? t.buyer.name}
        </Text>
        <Text style={[styles.fontBold, styles.fontSize10]}>
          {invoiceData?.buyer.name}
        </Text>
        {sellerLine(undefined, invoiceData?.buyer.address)}
        {sellerLine(
          undefined,
          [invoiceData?.buyer.city, invoiceData?.buyer.commune]
            .filter(Boolean)
            .join(", "),
        )}
        {sellerLine("Giro", invoiceData?.buyer.notes)}
        {sellerLine("Email", invoiceData?.buyer.email)}
        {invoiceData.buyer.vatNoFieldIsVisible ? (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {invoiceData.buyer.vatNoLabelText}:{" "}
            <Text style={[styles.boldText, styles.fontSize8]}>
              {invoiceData?.buyer.vatNo}
            </Text>
          </Text>
        ) : null}

        {/* Forma y fecha de pago bajo del receptor */}
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {invoiceData.erpLabels?.paymentDate ?? t.paymentInfo.paymentDate}:
            {" "}
            <Text style={[styles.boldText, styles.fontSize8]}>
              {invoiceData.paymentDue}
            </Text>
          </Text>
          {invoiceData.paymentMethodFieldIsVisible &&
          invoiceData.paymentMethod ? (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              {t.paymentInfo.paymentMethod}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData.paymentMethod}
              </Text>
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
