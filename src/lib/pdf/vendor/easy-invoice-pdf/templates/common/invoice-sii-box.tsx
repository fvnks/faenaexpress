import { Text, View } from "@react-pdf/renderer";

import type { InvoiceData } from "../../schema";

/**
 * Cuadro rojo al estilo SII: muestra el emisor del documento (proveedor en
 * compras, empresa en ventas) con RUT, tipo y folio.
 */
export function InvoiceSiiBox({
  invoiceData,
}: {
  invoiceData: InvoiceData;
}) {
  const seller = invoiceData?.seller;
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceType = invoiceData.invoiceType ?? "Factura electrónica";

  if (!seller) return null;

  return (
    <View
      style={{
        border: "2px solid #ff0000",
        width: "45%",
        padding: 12,
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
          {seller.vatNo ?? ""}
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
