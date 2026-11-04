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

/**
 * Cuadro rojo SII flotante: muestra RUT del emisor del documento,
 * tipo de documento, folio y UNIDAD S.I.I.
 */
function SiiBox({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const seller = invoiceData?.seller;
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceType = invoiceData.invoiceType ?? "Factura electrónica";

  return (
    <View
      style={{
        border: "2px solid #ff0000",
        width: "40%",
        padding: 10,
        textAlign: "center",
        color: "#ff0000",
        fontWeight: "bold",
        alignSelf: "flex-start",
        marginTop: 6,
      }}
    >
      <Text style={{ fontSize: 7, marginBottom: 4 }}>
        R.U.T.:{" "}
        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
          {seller?.vatNo ?? ""}
        </Text>
      </Text>
      <Text style={{ fontSize: 7, marginBottom: 4 }}>{invoiceType}</Text>
      <Text style={{ fontSize: 8, marginBottom: 2, fontWeight: "bold" }}>
        Folio N° {invoiceNumberValue ?? ""}
      </Text>
      <Text style={{ fontSize: 6 }}>UNIDAD S.I.I.</Text>
    </View>
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
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;

  return (
    <View style={{ width: "100%", marginBottom: 14 }}>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
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
          {/* Forma y fecha de pago bajo del receptor */}
          {invoiceData.paymentDue && (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              {invoiceData.erpLabels?.paymentDate ?? "Fecha de vencimiento"}:
              {" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData.paymentDue}
              </Text>
            </Text>
          )}
          {invoiceData.paymentMethod && (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              {INVOICE_PDF_TRANSLATIONS[invoiceData.language].paymentInfo.paymentMethod}:{" "}
              <Text style={[styles.boldText, styles.fontSize8]}>
                {invoiceData.paymentMethod}
              </Text>
            </Text>
          )}
        </View>

        {/* Cuadro rojo SII a la derecha (flotando en paralelo al receptor) */}
        <View style={{ width: "40%", alignSelf: "flex-start" }}>
          <SiiBox invoiceData={invoiceData} styles={styles} />

          {/* Campos adicionales debajo del cuadro SII */}
          {!isPurchase ? (
            <>
              {invoiceData.erpVendedor && (
                <Text style={[styles.fontSize7, { marginTop: 10, marginBottom: 2 }]}>
                  Vendedor: {invoiceData.erpVendedor}
                </Text>
              )}
              {invoiceData.erpGuiaDespacho && (
                <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
                  Guía de Despacho: {invoiceData.erpGuiaDespacho}
                </Text>
              )}
            </>
          ) : (
            <>
              {invoiceData.erpCiudad && (
                <Text style={[styles.fontSize7, { marginTop: 10, marginBottom: 2 }]}>
                  Ciudad: {invoiceData.erpCiudad}
                </Text>
              )}
              {invoiceData.erpCondicionPago && (
                <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
                  Condición de pago: {invoiceData.erpCondicionPago}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
