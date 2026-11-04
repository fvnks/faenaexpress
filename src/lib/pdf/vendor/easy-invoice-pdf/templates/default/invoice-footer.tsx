import { Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import { type InvoiceData, resolveNumberFormatLocale } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";
import { formatAmount, fractionDigitsFor } from "../../utils/format-amount";

export function InvoiceFooter({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;

  const footerDueDate = dayjs(
    invoiceData.erpFooterDueDate ?? invoiceData.paymentDue,
  ).format(invoiceData.dateFormat);

  const invoiceTotal = invoiceData?.total;

  const formattedInvoiceTotal = formatAmount({
    amount: invoiceTotal,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
    fractionDigits: fractionDigitsFor(invoiceData.currency),
  });

  return (
    <View style={styles.footer} fixed>
      {/* Línea 1: folio, total, vencimiento, página */}
      <View style={styles.spaceBetween}>
        <Text style={[styles.fontSize8, { flexShrink: 1 }]}>
          {invoiceNumberValue ? `${invoiceNumberValue} · ` : ""}
          {formattedInvoiceTotal} {invoiceData.currency} {t.stripe.due}{" "}
          {footerDueDate}
        </Text>
        <Text
          style={[styles.fontSize8, { marginLeft: 8, flexShrink: 0 }]}
          render={({ pageNumber, totalPages }) => {
            return `${t.stripe.page} ${pageNumber} ${t.stripe.of} ${totalPages}`;
          }}
        />
      </View>
      {/* Timbre electrónico SII - línea separada */}
      <View style={{ marginTop: 4 }}>
        <Text style={[styles.fontSize7, { textAlign: "center" }]}>
          Timbre Electrónico SII
        </Text>
        <Text style={[styles.fontSize7, { textAlign: "center" }]}>
          Resolución 0 del 2026 - Verifique documento en: www.sii.cl
        </Text>
      </View>
    </View>
  );
}
