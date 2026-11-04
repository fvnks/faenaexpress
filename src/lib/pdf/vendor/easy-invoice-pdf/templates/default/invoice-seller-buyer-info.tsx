import { Text, View } from "@react-pdf/renderer";

import { InvoiceCompanyHeader } from "../common/invoice-company-header";
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
  const buyer = invoiceData?.buyer;
  if (!buyer) return null;

  const buyerFields = [
    fieldLine({
      label: undefined,
      value: buyer.address,
      styles,
    }),
    fieldLine({
      label: undefined,
      value: [buyer.city, buyer.commune].filter(Boolean).join(", "),
      styles,
    }),
    fieldLine({ label: "Giro", value: buyer.notes, styles }),
    fieldLine({ label: "Email", value: buyer.email, styles }),
    buyer.vatNoFieldIsVisible ? (
      <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
        {buyer.vatNoLabelText}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {buyer.vatNo}
        </Text>
      </Text>
    ) : null,
  ];

  const paymentFields = [
    fieldLine({
      label:
        invoiceData.erpLabels?.paymentDate ??
        INVOICE_PDF_TRANSLATIONS.es.paymentInfo.paymentDate,
      value: invoiceData.paymentDue,
      styles,
    }),
    invoiceData.paymentMethodFieldIsVisible && invoiceData.paymentMethod
      ? fieldLine({
          label: INVOICE_PDF_TRANSLATIONS.es.paymentInfo.paymentMethod,
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
        marginBottom: 18,
      }}
    >
      {/* Datos de la empresa emisora (arriba, ancho completo) */}
      <InvoiceCompanyHeader invoiceData={invoiceData} />

      {/* En compras: receptor a la izquierda, cuadro SII (más ancho) a la derecha. */}
      {invoiceData.erpIsPurchase ? (
        <>
          <View style={{ width: "55%" }}>
            <Text style={styles.subheader}>
              {invoiceData.erpLabels?.buyer ?? "Receptor"}
            </Text>
            <Text style={[styles.fontBold, styles.fontSize10]}>
              {buyer.name}
            </Text>
            {buyerFields}
          </View>
          <View style={{ width: "40%", alignSelf: "flex-start" }}>
            <InvoiceSiiBox invoiceData={invoiceData} />
          </View>
        </>
      ) : (
        <>
          {/* Venta: receptor a la derecha (misma fila que el emisor arriba). */}
          <View style={{ width: "280px" }}>
            <Text style={styles.subheader}>
              {invoiceData.erpLabels?.buyer ?? "Receptor"}
            </Text>
            <Text style={[styles.fontBold, styles.fontSize10]}>
              {buyer.name}
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
