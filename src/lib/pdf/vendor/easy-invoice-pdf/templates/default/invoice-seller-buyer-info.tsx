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
  const buyer = invoiceData?.buyer;
  if (!buyer) return null;

  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;

  // Dirección + ciudad/comuna del receptor
  const addressParts = [buyer.address, buyer.city, buyer.commune].filter(
    Boolean,
  );

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
      {/* Receptor: nombre y todos sus datos (izquierda) */}
      <View style={{ width: "55%" }}>
        <Text style={styles.subheader}>
          {invoiceData.erpLabels?.buyer ?? "Señor(es):"}
        </Text>
        <Text style={[styles.fontBold, styles.fontSize10]}>
          {buyer.name}
        </Text>
        {addressParts.length > 0 && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {addressParts.join(", ")}
          </Text>
        )}
        {buyer.notes && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Giro: {buyer.notes}
          </Text>
        )}
        {buyer.email && buyer.emailFieldIsVisible && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Correo: {buyer.email}
          </Text>
        )}
        {buyer.phone && buyer.phoneFieldIsVisible && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Teléfono: {buyer.phone}
          </Text>
        )}
        {buyer.vatNoFieldIsVisible && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {buyer.vatNoLabelText}:{" "}
            <Text style={[styles.boldText, styles.fontSize8]}>
              {buyer.vatNo}
            </Text>
          </Text>
        )}
        {/* Forma y fecha de pago bajo del receptor */}
        <View style={{ marginTop: 10 }}>
          {invoiceData.erpLabels?.paymentDate &&
          invoiceData.paymentDue && (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              {invoiceData.erpLabels.paymentDate}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData.paymentDue}
              </Text>
            </Text>
          )}
          {invoiceData.paymentMethodFieldIsVisible &&
          invoiceData.paymentMethod && (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              {INVOICE_PDF_TRANSLATIONS.es.paymentInfo.paymentMethod}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData.paymentMethod}
              </Text>
            </Text>
          )}
        </View>
      </View>

      {/* Cuadro SII a la derecha: tipo, folio, UNIDAD S.I.I. */}
      <View style={{ width: "40%", alignSelf: "flex-start" }}>
        <InvoiceSiiBox invoiceData={invoiceData} />
      </View>
    </View>
  );
}
