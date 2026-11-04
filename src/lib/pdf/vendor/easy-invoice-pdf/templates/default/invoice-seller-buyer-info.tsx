import { Text, View } from "@react-pdf/renderer";

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

  const isPurchase = invoiceData.erpIsPurchase;

  return (
    <View style={{ width: "100%", marginBottom: 14 }}>
      {/* Receptor: nombre y todos sus datos */}
      <View style={{ width: "100%" }}>
        <Text style={styles.subheader}>
          {invoiceData.erpLabels?.buyer ?? "Señor(es):"}
        </Text>
        <Text style={[styles.fontBold, styles.fontSize10]}>
          {buyer.name}
        </Text>
        {buyer.address && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {buyer.address}
          </Text>
        )}
        {buyer.city && buyer.commune && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {buyer.city}, {buyer.commune}
          </Text>
        )}
        {buyer.city && !buyer.commune && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {buyer.city}
          </Text>
        )}
        {!buyer.city && buyer.commune && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {buyer.commune}
          </Text>
        )}
        {buyer.notes && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            Giro: {buyer.notes}
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
      </View>

      {/* Campos adicionales del documento (derecha) */}
      {!isPurchase ? (
        <>
          {buyer.notes && fieldLine({
            label: "Giro",
            value: buyer.notes,
            styles,
          })}
          {buyer.vatNoFieldIsVisible && fieldLine({
            label: "R.U.T.",
            value: buyer.vatNo,
            styles,
          })}
          {invoiceData.erpFechaDocumento && fieldLine({
            label: "Fecha Documento",
            value: invoiceData.erpFechaDocumento,
            styles,
          })}
          {buyer.city && fieldLine({
            label: "Ciudad",
            value: buyer.city,
            styles,
          })}
          {invoiceData.paymentDue && fieldLine({
            label: "Fecha de Vencimiento",
            value: invoiceData.paymentDue,
            styles,
          })}
          {invoiceData.erpTasaIngreso && fieldLine({
            label: "Tasa de ingreso",
            value: invoiceData.erpTasaIngreso.toString(),
            styles,
          })}
          {invoiceData.erpVendedor && fieldLine({
            label: "Vendedor",
            value: invoiceData.erpVendedor,
            styles,
          })}
          {invoiceData.erpCondicionPago && fieldLine({
            label: "Condición de pago",
            value: invoiceData.erpCondicionPago,
            styles,
          })}
          {invoiceData.erpMonedaIngreso && fieldLine({
            label: "Moneda de ingreso",
            value: invoiceData.erpMonedaIngreso,
            styles,
          })}
        </>
      ) : (
        <>
          {buyer.notes && fieldLine({
            label: "Giro",
            value: buyer.notes,
            styles,
          })}
          {buyer.city && fieldLine({
            label: "Ciudad",
            value: buyer.city,
            styles,
          })}
          {buyer.vatNoFieldIsVisible && fieldLine({
            label: "R.U.T.",
            value: buyer.vatNo,
            styles,
          })}
          {invoiceData.paymentMethod && fieldLine({
            label: "Forma de pago",
            value: invoiceData.paymentMethod,
            styles,
          })}
        </>
      )}
    </View>
  );
}
