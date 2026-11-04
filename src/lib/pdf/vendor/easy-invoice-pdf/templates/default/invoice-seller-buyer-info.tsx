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

/**
 * Cuadrado rojo simple con los datos del receptor, para ventas (al estilo del
 * cuadro SII de compras).
 */
function ReceiverBox({
  buyer,
  invoiceNumberValue,
}: {
  buyer: InvoiceData["buyer"];
  invoiceNumberValue: string | null | undefined;
}) {
  return (
    <View
      style={{
        border: "2px solid #ff0000",
        width: "40%",
        padding: 12,
        textAlign: "center",
        color: "#ff0000",
        fontWeight: "bold",
        alignSelf: "flex-start",
        marginTop: 6,
      }}
    >
      <Text style={{ fontSize: 7, marginBottom: 4 }}>
        R.U.T.:{" "}
        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
          {buyer.vatNo ?? ""}
        </Text>
      </Text>
      <Text style={{ fontSize: 7, marginBottom: 4 }}>
        {buyer.name ?? ""}
      </Text>
      <Text style={{ fontSize: 8, marginBottom: 2, fontWeight: "bold" }}>
        Folio N° {invoiceNumberValue ?? ""}
      </Text>
      <Text style={{ fontSize: 6 }}>
        {[buyer.address, buyer.city, buyer.commune]
          .filter(Boolean)
          .join(", ")}
      </Text>
    </View>
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

  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;

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
      {/* En ventas: datos del receptor a la izquierda, cuadro rojo del receptor
          a la derecha. */}
      {!invoiceData.erpIsPurchase ? (
        <>
          <View style={{ width: "55%" }}>
            <Text style={styles.subheader}>
              {invoiceData.erpLabels?.buyer ?? "Receptor"}
            </Text>
            {/* Forma y fecha de pago bajo del receptor */}
            <View style={{ marginTop: 10 }}>
              {paymentFields}
            </View>
          </View>
          <ReceiverBox
            buyer={buyer}
            invoiceNumberValue={invoiceNumberValue}
          />
        </>
      ) : (
        <>
          {/* En compras: el cuadro SII (proveedor/emisor del documento) a la
              derecha, el receptor (empresa) ya se muestra arriba. */}
          <View style={{ width: "40%", alignSelf: "flex-start" }}>
            <InvoiceSiiBox invoiceData={invoiceData} />
          </View>
        </>
      )}
    </View>
  );
}
