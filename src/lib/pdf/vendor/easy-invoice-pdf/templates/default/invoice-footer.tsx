import { Link, Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import { type InvoiceData, resolveNumberFormatLocale } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";
import { formatAmount } from "../../utils/format-amount";

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

  // MODIFICACIÓN (vendorizado): el pie habla SIEMPRE del vencimiento. La fecha de
  // pago (que el bloque de pagos muestra cuando el documento ya se pagó) es otra
  // fecha: si el pie usara esa, el documento diría "vence 28/10" en un papel cuyo
  // vencimiento es el 14/11.
  const footerDueDate = dayjs(
    invoiceData.erpFooterDueDate ?? invoiceData.paymentDue,
  ).format(invoiceData.dateFormat);

  const invoiceTotal = invoiceData?.total;

  /**
   * The footer writes the total the same way the body does -- it used to be the one place in
   * this template that localised the number and printed a currency symbol, so a German
   * invoice read "321 200.00 EUR" in its totals and "321.200,00 €" at its foot.
   */
  const formattedInvoiceTotal = formatAmount({
    amount: invoiceTotal,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
  });

  return (
    <View style={styles.footer} fixed>
      {/* MODIFICACIÓN (vendorizado): el original armaba el pie con varios <Text>
          sueltos y un `gap` que react-pdf no siempre respeta: el texto salía pegado
          ("...con vencimiento el 31/10/2026· Documento generado..."). Acá el pie son
          dos líneas de texto continuo, con los separadores dentro, para que respire
          y la atribución no se monte con el número de página. */}
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
      {invoiceData.erpFooterNote || invoiceData.erpFooterUrl ? (
        <Text style={[styles.fontSize8, { marginTop: 2 }]}>
          {invoiceData.erpFooterNote ? `${invoiceData.erpFooterNote} ` : ""}
          {invoiceData.erpFooterUrl ? (
            <Link
              style={[styles.fontSize8, { color: "blue" }]}
              src={invoiceData.erpFooterUrl}
            >
              {invoiceData.erpFooterUrl}
            </Link>
          ) : null}
        </Text>
      ) : null}
    </View>
  );
}
