import { Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { InvoicePdf417 } from "../common/invoice-pdf417";
import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import { type InvoiceData, resolveNumberFormatLocale } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";
import { formatAmountChunks, fractionDigitsFor } from "../../utils/format-amount";
import { InvoiceFooter } from "./invoice-footer";
import { InvoiceHeader } from "./invoice-header";
import { InvoiceItemsTable } from "./invoice-items-table";
import { InvoicePaymentTotals } from "./invoice-payment-totals";
import { InvoiceSellerBuyerInfo } from "./invoice-seller-buyer-info";
import { InvoiceVATSummaryTable } from "./invoice-vat-summary-table";
import "dayjs/locale/en";
import "dayjs/locale/pl";
import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import "dayjs/locale/ru";
import "dayjs/locale/uk";
import "dayjs/locale/fr";
import "dayjs/locale/it";
import "dayjs/locale/nl";

export const InvoiceBody = ({
  invoiceData,
  styles,
  shouldLocaliseDates = true,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
  shouldLocaliseDates?: boolean;
}) => {
  const language = invoiceData.language;
  const t = INVOICE_PDF_TRANSLATIONS[language];

  if (shouldLocaliseDates) {
    dayjs.locale(language);
  }

  const invoiceTotal = invoiceData?.total;

  const invoiceTotalChunks = formatAmountChunks({
    amount: invoiceTotal,
    numberFormatLocale: resolveNumberFormatLocale(invoiceData),
    fractionDigits: fractionDigitsFor(invoiceData.currency),
  });

  // The VAT summary prints the total into a 69pt cell and takes the pieces; every other
  // place prints it into running text and takes them joined back up
  const formattedInvoiceTotal = invoiceTotalChunks.join("");

  const signatureSectionIsVisible =
    invoiceData.personAuthorizedToReceiveFieldIsVisible ||
    invoiceData.personAuthorizedToIssueFieldIsVisible;

  const vatTableSummaryIsVisible = invoiceData.vatTableSummaryIsVisible;

  const isPdf417Visible =
    invoiceData?.qrCodeIsVisible &&
    invoiceData.qrCodeData &&
    invoiceData.qrCodeData.length > 0;

  return (
    <>
      <InvoiceHeader invoiceData={invoiceData} styles={styles} />

      <InvoiceSellerBuyerInfo invoiceData={invoiceData} styles={styles} />

      <InvoiceItemsTable
        invoiceData={invoiceData}
        formattedInvoiceTotal={formattedInvoiceTotal}
        styles={styles}
      />

      {/* Debajo de la tabla de ítems: a la izquierda el PDF417 (donde iba el
          total a pagar) y a la derecha el cuadro de IVA con el total a pagar
          debajo. */}
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: vatTableSummaryIsVisible ? 0 : 15,
        }}
      >
        <View style={{ width: "50%" }}>
          {/* PDF417 del SII (timbre electrónico) - a la izquierda. */}
          {isPdf417Visible ? (
            <InvoicePdf417
              pdf417DataUrl={invoiceData.qrCodeData!}
              description={invoiceData.qrCodeDescription}
            />
          ) : null}
        </View>

        <View style={{ width: "50%" }}>
          {vatTableSummaryIsVisible ? (
            <InvoiceVATSummaryTable
              invoiceData={invoiceData}
              invoiceTotalChunks={invoiceTotalChunks}
              styles={styles}
            />
          ) : null}
          {/* El total a pagar va debajo del cuadro de IVA (Neto, IVA, Bruto). */}
          <InvoicePaymentTotals invoiceData={invoiceData} styles={styles} />
        </View>
      </View>

      {/* Notes */}
      {invoiceData.notesFieldIsVisible ? (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.fontSize8}>{invoiceData?.notes}</Text>
        </View>
      ) : null}

      {/* Footer  */}
      <InvoiceFooter invoiceData={invoiceData} styles={styles} />
    </>
  );
};
