import { Text, View } from "@react-pdf/renderer";

import { InvoiceSiiBox } from "../common/invoice-sii-box";
import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import type { InvoiceData } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";

/**
 * Una línea de texto con etiqueta opcional y valor en negrita.
 */
function fieldLine({
  label,
  value,
  styles,
}: {
  label?: string;
  value: string | null | undefined;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  if (!value) return null;
  return (
    <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
      {label ? `${label}: ` : ""}
      <Text style={[styles.boldText, styles.fontSize8]}>{value}</Text>
    </Text>
  );
}

export function InvoiceSellerBuyerInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  const sellerFields = [
    fieldLine({
      label: undefined,
      value: invoiceData?.seller.address,
      styles,
    }),
    fieldLine({
      label: undefined,
      value: [invoiceData?.seller.city, invoiceData?.seller.commune]
        .filter(Boolean)
        .join(", "),
      styles,
    }),
    fieldLine({ label: "Giro", value: invoiceData?.seller.notes, styles }),
    fieldLine({ label: "Email", value: invoiceData?.seller.email, styles }),
    invoiceData.seller.vatNoFieldIsVisible ? (
      <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
        {invoiceData.seller.vatNoLabelText}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {invoiceData?.seller.vatNo}
        </Text>
      </Text>
    ) : null,
  ];

  const buyerFields = [
    fieldLine({
      label: undefined,
      value: invoiceData?.buyer.address,
      styles,
    }),
    fieldLine({
      label: undefined,
      value: [invoiceData?.buyer.city, invoiceData?.buyer.commune]
        .filter(Boolean)
        .join(", "),
      styles,
    }),
    fieldLine({ label: "Giro", value: invoiceData?.buyer.notes, styles }),
    fieldLine({ label: "Email", value: invoiceData?.buyer.email, styles }),
    invoiceData.buyer.vatNoFieldIsVisible ? (
      <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
        {invoiceData.buyer.vatNoLabelText}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {invoiceData?.buyer.vatNo}
        </Text>
      </Text>
    ) : null,
  ];

  const paymentFields = [
    fieldLine({
      label: invoiceData.erpLabels?.paymentDate ?? t.paymentInfo.paymentDate,
      value: invoiceData.paymentDue,
      styles,
    }),
    invoiceData.paymentMethodFieldIsVisible && invoiceData.paymentMethod
      ? fieldLine({
          label: t.paymentInfo.paymentMethod,
          value: invoiceData.paymentMethod,
          styles,
        })
      : null,
  ];

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
      {/* En compras el diseño sigue el SII: el emisor (proveedor) va a la
          izquierda y el recuadro rojo (RUT/tipo/folio + UNIDAD S.I.I.) va a la
          derecha, en la misma fila. El receptor va debajo. */}
      {invoiceData.erpIsPurchase ? (
        <>
          <View style={{ width: "55%" }}>
            <Text style={styles.subheader}>
              {invoiceData.erpLabels?.seller ?? t.seller.name}
            </Text>
            <Text style={[styles.fontBold, styles.fontSize10]}>
              {invoiceData?.seller.name}
            </Text>
            {sellerFields}
          </View>
          <View style={{ width: "40%", alignSelf: "flex-start" }}>
            <InvoiceSiiBox invoiceData={invoiceData} />
          </View>
        </>
      ) : (
        <>
          {/* Venta: seller izquierda, buyer derecha (misma fila). */}
          <View style={{ width: "280px", marginRight: 25 }}>
            <Text style={styles.subheader}>
              {invoiceData.erpLabels?.seller ?? t.seller.name}
            </Text>
            <Text style={[styles.fontBold, styles.fontSize10]}>
              {invoiceData?.seller.name}
            </Text>
            {sellerFields}
          </View>
          <View style={{ width: "280px" }}>
            <Text style={styles.subheader}>
              {invoiceData.erpLabels?.buyer ?? t.buyer.name}
            </Text>
            <Text style={[styles.fontBold, styles.fontSize10]}>
              {invoiceData?.buyer.name}
            </Text>
            {buyerFields}
            {/* Forma y fecha de pago bajo del receptor */}
            <View style={{ marginTop: 10 }}>
              {paymentFields}
            </View>
          </View>
        </>
      )}
    </View>
  );
}
