import { Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import type { InvoiceData } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";

/**
 * Payment date and payment method fields
 */
export function InvoicePaymentInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  const paymentDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );

  const paymentMethodIsVisible = invoiceData.paymentMethodFieldIsVisible;

  return (
    <View style={{ maxWidth: "250px" }}>
      {paymentMethodIsVisible ? (
        <Text style={styles.fontSize7}>
          {t.paymentInfo.paymentMethod}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {invoiceData?.paymentMethod}
          </Text>
        </Text>
      ) : null}
      <Text
        style={[
          styles.fontSize7,
          { marginLeft: paymentMethodIsVisible ? 9.75 : 0 },
        ]}
      >
        {/* MODIFICACIÓN (vendorizado): el original decía siempre "Fecha de pago" y
            escribía la fecha de vencimiento. El ERP dice qué fecha es. */}
        {invoiceData.erpLabels?.paymentDate ?? t.paymentInfo.paymentDate}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>{paymentDate}</Text>
      </Text>
    </View>
  );
}
