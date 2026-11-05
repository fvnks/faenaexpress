import { Text, View } from "@react-pdf/renderer";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import { type InvoiceData, resolveNumberFormatLocale } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";
import { formatAmountChunks, fractionDigitsFor } from "../../utils/format-amount";
import { etiquetaConImpuesto } from "../../utils/etiquetas";
import {
  formatDiscountPercent,
  hasAnyItemDiscount,
  hasItemDiscount,
} from "../../utils/item-discount";
import { WrappableAmount } from "../common/wrappable-amount";

export function InvoiceItemsTable({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const numberFormatLocale = resolveNumberFormatLocale(invoiceData);
  const t = INVOICE_PDF_TRANSLATIONS[language];

  // La plantilla de la empresa puede ocultar el detalle: sin ítems no hay tabla.
  const mostrarItems =
    invoiceData.erpPlantilla?.configuracion?.mostrarItems ?? true;
  if (!mostrarItems || invoiceData.items.length === 0) return null;

  // we need to check only the first row, because all next rows are the same
  const isInvoiceItemNumberVisible =
    invoiceData.items[0].invoiceItemNumberIsVisible;
  const isNameFieldVisible = invoiceData.items[0].nameFieldIsVisible;
  const isTypeOfGTUFieldVisible = invoiceData.items[0].typeOfGTUFieldIsVisible;
  const isAmountFieldVisible = invoiceData.items[0].amountFieldIsVisible;
  const isUnitFieldVisible = invoiceData.items[0].unitFieldIsVisible;
  const isNetPriceFieldVisible = invoiceData.items[0].netPriceFieldIsVisible;
  const isVATFieldVisible = invoiceData.items[0].vatFieldIsVisible;
  const isNetAmountFieldVisible = invoiceData.items[0].netAmountFieldIsVisible;
  const isVATAmountFieldVisible = invoiceData.items[0].vatAmountFieldIsVisible;
  const isPreTaxAmountFieldVisible =
    invoiceData.items[0].preTaxAmountFieldIsVisible;
  // the discount column only earns its width when some item actually has a discount
  const hasDiscountColumn = hasAnyItemDiscount(invoiceData.items);

  // the name column has width to spare, so it pays for the discount column, rather than
  // the narrow numeric columns whose headers would start to hyphenate ("Cantid-ad")
  const nameColumnStyle = hasDiscountColumn
    ? styles.colNameWithDiscount
    : styles.colName;

  /**
   * Custom tax label text i.e. "VAT", "Sales Tax", "IVA", "GST", etc.
   */
  const taxLabelText = invoiceData.taxLabelText || "VAT";

  /**
   * Column labels -- estilo SII chileno.
   */
  const netPriceColumnLabel = etiquetaConImpuesto(
    t.invoiceItemsTable.netPrice,
    taxLabelText,
  );
  const netAmountColumnLabel = etiquetaConImpuesto(
    t.invoiceItemsTable.netAmount,
    taxLabelText,
  );
  const preTaxAmountColumnLabel = etiquetaConImpuesto(
    t.invoiceItemsTable.preTaxAmount,
    taxLabelText,
  );
  const vatAmountColumnLabel = etiquetaConImpuesto(
    t.invoiceItemsTable.vatAmount,
    taxLabelText,
  );

  const fractionDigits = fractionDigitsFor(invoiceData.currency);

  return (
    <View style={{ marginBottom: 14, marginTop: 14 }}>
      <View style={styles.table}>
        {/* Table header row with columns */}
        <View style={[styles.tableRow, { borderTopWidth: 1 }]} fixed>
          {/* Item column */}
          {isInvoiceItemNumberVisible ? (
            <View style={[styles.tableCol, styles.colNo, styles.center]}>
              <Text style={styles.tableCellBold}>{t.invoiceItemsTable.no}</Text>
            </View>
          ) : null}

          {/* Code column (CODIGO) */}
          {isTypeOfGTUFieldVisible ? (
            <View style={[styles.tableCol, styles.colGTU, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.typeOfGTU.split("")}
              </Text>
            </View>
          ) : null}

          {/* Name/Detail column */}
          {isNameFieldVisible ? (
            <View style={[styles.tableCol, nameColumnStyle, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.nameOfGoodsService}
              </Text>
            </View>
          ) : null}

          {/* Quantity column */}
          {isAmountFieldVisible ? (
            <View style={[styles.tableCol, styles.colAmount, styles.center]}>
              <Text style={[styles.tableCellBold]}>
                {t.invoiceItemsTable.amount.split("")}
              </Text>
            </View>
          ) : null}

          {/* Unit price column */}
          {isNetPriceFieldVisible ? (
            <View style={[styles.tableCol, styles.colNetPrice, styles.center]}>
              <Text style={styles.tableCellBold}>{netPriceColumnLabel}</Text>
            </View>
          ) : null}

          {/* Discount column */}
          {hasDiscountColumn ? (
            <View style={[styles.tableCol, styles.colDiscount, styles.center]}>
              <Text style={styles.tableCellBold}>
                {t.invoiceItemsTable.discount}
              </Text>
            </View>
          ) : null}

          {/* VAT column */}
          {isVATFieldVisible ? (
            <View style={[styles.tableCol, styles.colVAT, styles.center]}>
              <Text style={styles.tableCellBold}>{taxLabelText.split("")}</Text>
            </View>
          ) : null}

          {/* Net amount column */}
          {isNetAmountFieldVisible ? (
            <View style={[styles.tableCol, styles.colNetAmount, styles.center]}>
              <Text style={styles.tableCellBold}>{netAmountColumnLabel}</Text>
            </View>
          ) : null}

          {/* Pre-tax amount column */}
          {isPreTaxAmountFieldVisible ? (
            <View
              style={[styles.tableCol, styles.colPreTaxAmount, styles.center]}
            >
              <Text style={[styles.tableCellBold]}>
                {preTaxAmountColumnLabel}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Table body rows */}
        {invoiceData?.items.map((item, index) => {
          // The quantity column: print with up to 6 decimals (Chilean style)
          const amountChunks = formatAmountChunks({
            amount: item.amount,
            numberFormatLocale,
            minimumFractionDigits: 0,
            maximumFractionDigits: 6,
            fractionDigits,
          });

          const netPriceChunks = formatAmountChunks({
            amount: item.netPrice,
            numberFormatLocale,
            fractionDigits,
          });

          const netAmountChunks = formatAmountChunks({
            amount: item.netAmount,
            numberFormatLocale,
            fractionDigits,
          });

          const vatAmountChunks = formatAmountChunks({
            amount: item.vatAmount,
            numberFormatLocale,
            fractionDigits,
          });

          const preTaxAmountChunks = formatAmountChunks({
            amount: item.preTaxAmount,
            numberFormatLocale,
            fractionDigits,
          });

          const itemHasDiscount = hasItemDiscount(item);

          const formattedDiscountPercent = formatDiscountPercent({
            value: item.discountValue,
            numberFormatLocale,
          });

          const discountChunks =
            item.discountType === "percentage"
              ? [formattedDiscountPercent]
              : formatAmountChunks({
                  amount: item.discountAmount,
                  numberFormatLocale,
                  fractionDigits,
                });

          const customDiscountLabel = item.discountLabel?.trim();
          const discountNote = itemHasDiscount ? customDiscountLabel : null;

          const formattedVat = Number.isNaN(Number(item.vat))
            ? item.vat
            : `${Number(item.vat)}%`;

          return (
            <View
              style={styles.tableRow}
              key={index}
              wrap={false}
              minPresenceAhead={60}
            >
              {/* Item number */}
              {isInvoiceItemNumberVisible ? (
                <View style={[styles.tableCol, styles.colNo]}>
                  <Text style={styles.tableCell}>{index + 1}.</Text>
                </View>
              ) : null}

              {/* Code */}
              {isTypeOfGTUFieldVisible ? (
                <View style={[styles.tableCol, styles.colGTU]}>
                  <Text style={[styles.tableCell]}>{item.typeOfGTU}</Text>
                </View>
              ) : null}

              {/* Name/Detail */}
              {isNameFieldVisible ? (
                <View style={[styles.tableCol, nameColumnStyle]}>
                  <Text
                    style={[
                      styles.tableCell,
                      { textAlign: "left", marginLeft: 2, marginRight: 2 },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {discountNote ? (
                    <Text
                      style={[
                        styles.tableCell,
                        styles.fontSize7,
                        {
                          textAlign: "left",
                          marginLeft: 2,
                          marginRight: 2,
                          marginTop: 0,
                          color: "#555",
                        },
                      ]}
                    >
                      {discountNote}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Quantity */}
              {isAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colAmount]}>
                  <WrappableAmount
                    chunks={amountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {/* Unit price */}
              {isNetPriceFieldVisible ? (
                <View style={[styles.tableCol, styles.colNetPrice]}>
                  <WrappableAmount
                    chunks={netPriceChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {/* Discount */}
              {hasDiscountColumn ? (
                <View style={[styles.tableCol, styles.colDiscount]}>
                  {itemHasDiscount ? (
                    <WrappableAmount
                      chunks={discountChunks}
                      style={[
                        styles.tableCell,
                        { textAlign: "right", marginRight: 2 },
                      ]}
                    />
                  ) : null}
                </View>
              ) : null}

              {/* VAT rate */}
              {isVATFieldVisible ? (
                <View
                  style={[
                    styles.tableCol,
                    styles.colVAT,
                    { textAlign: "center" },
                  ]}
                >
                  <Text style={styles.tableCell}>
                    {String(formattedVat).split("")}
                  </Text>
                </View>
              ) : null}

              {/* Net amount */}
              {isNetAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colNetAmount]}>
                  <WrappableAmount
                    chunks={netAmountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}

              {/* Pre-tax amount */}
              {isPreTaxAmountFieldVisible ? (
                <View style={[styles.tableCol, styles.colPreTaxAmount]}>
                  <WrappableAmount
                    chunks={preTaxAmountChunks}
                    style={[
                      styles.tableCell,
                      { textAlign: "right", marginRight: 2 },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Table footer - total line */}
        <View style={styles.tableRow} wrap={false} minPresenceAhead={60}>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>
          <View style={[styles.tableCol, { borderRightWidth: 0 }]}></View>

          <View style={[styles.tableCol, { width: "100%" }]}>
            <Text
              style={[
                styles.tableCell,
                {
                  marginTop: 2,
                  marginBottom: 2,
                  textAlign: "right",
                  marginRight: 5,
                },
              ]}
            >
              {t.invoiceItemsTable.sum}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {formattedInvoiceTotal}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* "Cancelado ___ de ___ de ___" line below the table */}
      <View style={{ width: "100%", marginTop: 6, marginBottom: 6 }}>
        <Text style={[styles.fontSize7]}>
          Cancelado ___________ de ___________ de ___________
        </Text>
      </View>
    </View>
  );
}
