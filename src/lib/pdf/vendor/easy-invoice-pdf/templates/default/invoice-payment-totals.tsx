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
 * Totales del documento: Neto/Afecto, Exento (si aplica), IVA, Total, Importe en letras.
 *
 * Sigue el diseño de referencia del SII chileno.
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

  const retentionAmount = invoiceData.erpRetentionAmount ?? 0;
  const exemptAmount = invoiceData.erpExemptAmount ?? 0;
  const surchargeAmount = invoiceData.erpSurchargeAmount ?? 0;
  const ivaAmount = invoiceData.erpIvaAmount ?? 0;
  const tasaIva = invoiceData.erpIvaRate ?? 19;
  const fuelTax = invoiceData.erpFuelTax ?? 0;

  // Mismo criterio que lib/ledger.ts: el total del documento incluye IVA,
  // exento, recargo e impuesto específico. La retención se descuenta UNA vez.
  const payableAmount = Math.max(invoiceData.total - retentionAmount, 0);
  const netoAmount = Math.max(
    invoiceData.total - ivaAmount - exemptAmount - surchargeAmount - fuelTax,
    0,
  );

  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const fractionDigits = fractionDigitsFor(invoiceData.currency);

  const formatMonto = (amount: number) =>
    formatAmount({
      amount,
      numberFormatLocale,
      fractionDigits,
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

  // Plantilla de la empresa: cada línea de totales se puede ocultar.
  const config = invoiceData.erpPlantilla?.configuracion;
  const mostrarRetencion = config?.mostrarRetencion ?? true;
  const mostrarExento = config?.mostrarExento ?? true;
  const mostrarRecargo = config?.mostrarRecargo ?? true;
  const mostrarImporteLetras = config?.mostrarImporteLetras ?? true;

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

      {/* Neto / Afecto */}
      <Text style={styles.fontSize7}>
        Neto:{ " " }
        <Text style={[styles.boldText, styles.fontSize8]}>
          {formatMonto(netoAmount)} {currency}
        </Text>
      </Text>

      {/* Exento (compras) */}
      {exemptAmount > 0 && mostrarExento ? (
        <Text style={styles.fontSize7}>
          {invoiceData.erpLabels?.exempt ?? "Exento"}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {formatMonto(exemptAmount)} {currency}
          </Text>
        </Text>
      ) : null}

      {/* IVA */}
      <Text style={styles.fontSize7}>
        IVA ({String(tasaIva).replace(".", ",")}%):{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {formatMonto(ivaAmount)} {currency}
        </Text>
      </Text>

      {/* Recargo (compras) */}
      {surchargeAmount > 0 && mostrarRecargo ? (
        <Text style={styles.fontSize7}>
          {invoiceData.erpLabels?.surcharge ?? "Recargo"}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {formatMonto(surchargeAmount)} {currency}
          </Text>
        </Text>
      ) : null}

      {/* Impuesto específico de combustible: suma al total, no a la base del IVA */}
      {fuelTax > 0 ? (
        <Text style={styles.fontSize7}>
          Impuesto específico (combustible):{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {formatMonto(fuelTax)} {currency}
          </Text>
        </Text>
      ) : null}

      {/* Retención (honorarios) */}
      {retentionAmount > 0 && mostrarRetencion ? (
        <Text style={styles.fontSize7}>
          {invoiceData.erpLabels?.retention ?? "Retención"}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            -{formatMonto(retentionAmount)} {currency}
          </Text>
        </Text>
      ) : null}

      {/* Total del documento (antes de retención) */}
      <Text style={[styles.boldText, styles.fontSize8]}>
        Total del documento:{ " " }
        <Text style={[styles.boldText, styles.fontSize8]}>
          {formatMonto(invoiceData.total)} {currency}
        </Text>
      </Text>

      {/* Importe en letras */}
      {mostrarImporteLetras ? (
        <Text style={styles.fontSize7}>
          {t.paymentTotals.amountInWords}:{" "}
          <Text style={[styles.boldText, styles.fontSize8]}>
            {amountInWordsWithCurrency}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}
