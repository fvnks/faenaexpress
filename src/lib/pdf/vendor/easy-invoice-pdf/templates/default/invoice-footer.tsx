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

  // Plantilla de la empresa: el pie puede ocultar folio, pagado y pendiente.
  const config = invoiceData.erpPlantilla?.configuracion;
  const mostrarFolio = config?.mostrarFolio ?? true;
  const mostrarPagado = config?.mostrarPagado ?? true;
  const mostrarPendiente = config?.mostrarPendiente ?? true;

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
          {mostrarFolio && invoiceNumberValue ? `${invoiceNumberValue} · ` : ""}
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
      {/* Pagado / Pendiente (solo si la plantilla lo pide) */}
      {(mostrarPagado || mostrarPendiente) &&
      (invoiceData.erpPaidAmount ?? 0) > 0 ? (
        <View style={styles.spaceBetween}>
          <Text style={[styles.fontSize7, { flexShrink: 1 }]}>
            {mostrarPagado
              ? `Pagado: ${formatAmount({
                  amount: invoiceData.erpPaidAmount ?? 0,
                  numberFormatLocale: resolveNumberFormatLocale(invoiceData),
                  fractionDigits: fractionDigitsFor(invoiceData.currency),
                })} ${invoiceData.currency}`
              : ""}
            {mostrarPagado && mostrarPendiente ? " · " : ""}
            {mostrarPendiente
              ? `Pendiente: ${formatAmount({
                  amount: Math.max(
                    (invoiceData.total ?? 0) -
                      (invoiceData.erpRetentionAmount ?? 0) -
                      (invoiceData.erpPaidAmount ?? 0),
                    0,
                  ),
                  numberFormatLocale: resolveNumberFormatLocale(invoiceData),
                  fractionDigits: fractionDigitsFor(invoiceData.currency),
                })} ${invoiceData.currency}`
              : ""}
          </Text>
        </View>
      ) : null}
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
