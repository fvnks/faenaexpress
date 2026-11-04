import { View, Text } from "@react-pdf/renderer";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import { type InvoiceData, resolveNumberFormatLocale } from "../../schema";
import {
  getAmountInWords,
  getNumberFractionalPart,
} from "../../utils/invoice-utils";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";
import {
  formatAmount,
  formatAmountInWordsWithCurrency,
  fractionDigitsFor,
} from "../../utils/format-amount";

/**
 * To pay, paid, left to pay and amount in words fields
 */
export function InvoicePaymentTotals({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  const currency = invoiceData.currency;

  // MODIFICACIÓN (vendorizado): el original imprimía siempre "Pagado 0" y daba el
  // total por pendiente. El ERP sabe cuánto se ha abonado (y cuánto se retuvo o
  // está exento), así que el bloque dice la verdad del documento: lo que se paga,
  // lo pagado y lo que queda, con la misma regla que el resto de la app
  // (total = movido + pendiente).
  const retentionAmount = invoiceData.erpRetentionAmount ?? 0;
  const exemptAmount = invoiceData.erpExemptAmount ?? 0;
  const surchargeAmount = invoiceData.erpSurchargeAmount ?? 0;
  const paidAmount = invoiceData.erpPaidAmount ?? 0;

  // Lo que hay que pagar: el total del documento menos la retención (lo retenido no
  // se cobra). El exento y el recargo ya vienen dentro del total.
  const payableAmount = Math.max(invoiceData.total - retentionAmount, 0);
  const leftToPay = Math.max(payableAmount - paidAmount, 0);

  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);

  const formatMonto = (amount: number) =>
    formatAmount({
      amount,
      numberFormatLocale,
      fractionDigits: fractionDigitsFor(invoiceData.currency),
    });

  const payableInWords = getAmountInWords({
    amount: payableAmount,
    language,
  });

  const fractionalPart = getNumberFractionalPart(payableAmount);

  const amountInWordsWithCurrency = formatAmountInWordsWithCurrency({
    amountInWords: payableInWords,
    currency,
    fractionalPart,
  });

  return (
    <View style={{ maxWidth: "100%" }}>
      <View style={{ width: "auto", alignSelf: "flex-start", marginTop: 0 }}>
        <Text
          style={[
            styles.subheader,
            {
              borderBottom: "1px solid black",
            },
            styles.fontSize11,
            styles.fontBold,
          ]}
        >
          {invoiceData.erpLabels?.total ?? t.paymentTotals.toPay}:{" "}
          {formatMonto(payableAmount)} {currency}
        </Text>
      </View>

      {retentionAmount > 0 ? (
        <Text style={styles.fontSize7}>
          {invoiceData.erpLabels?.retention ?? "Retención"}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {formatMonto(retentionAmount)} {currency}
          </Text>
        </Text>
      ) : null}

      {exemptAmount > 0 ? (
        <Text style={styles.fontSize7}>
          {invoiceData.erpLabels?.exempt ?? "Exento"}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {formatMonto(exemptAmount)} {currency}
          </Text>
        </Text>
      ) : null}

      {surchargeAmount > 0 ? (
        <Text style={styles.fontSize7}>
          {invoiceData.erpLabels?.surcharge ?? "Recargo"}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {formatMonto(surchargeAmount)} {currency}
          </Text>
        </Text>
      ) : null}

      {/* MODIFICACIÓN (vendorizado): en una nota de crédito o débito el documento no
          se paga, se aplica contra otro: las líneas de saldo no se imprimen. */}
      {invoiceData.erpBalanceVisible === false ? null : (
        <>
          <Text style={styles.fontSize7}>
            {t.paymentTotals.paid}:{" "}
            <Text style={[styles.boldText, styles.fontSize8]}>
              {formatMonto(paidAmount)} {currency}
            </Text>
          </Text>

          <Text style={[styles.boldText, styles.fontSize7]}>
            {t.paymentTotals.leftToPay}:{" "}
            <Text style={[styles.boldText, styles.fontSize8]}>
              {formatMonto(leftToPay)} {currency}
            </Text>
          </Text>
        </>
      )}

      <Text style={styles.fontSize7}>
        {t.paymentTotals.amountInWords}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {amountInWordsWithCurrency}
        </Text>
      </Text>
    </View>
  );
}
