import { Text, View } from "@react-pdf/renderer";

import type { InvoiceData } from "../../schema";

/**
 * Bloque al estilo del SII que se imprime solo en las facturas de compra:
 * recuadro rojo con RUT del emisor (proveedor), tipo de documento y folio,
 * más la leyenda "UNIDAD S.I.I.".
 */
export function InvoiceSiiBox({
  invoiceData,
}: {
  invoiceData: InvoiceData;
}) {
  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceType = invoiceData.invoiceType ?? "Factura electrónica";

  return (
    <View
      style={{
        border: "2px solid #ff0000",
        width: "45%",
        padding: 10,
        textAlign: "center",
        color: "#ff0000",
        fontWeight: "bold",
        alignSelf: "flex-end",
        marginTop: 6,
      }}
    >
      <Text style={{ fontSize: 7, marginBottom: 4 }}>
        R.U.T.:{" "}
        <Text style={{ fontSize: 8, fontWeight: "bold" }}>
          {invoiceData?.seller.vatNo ?? ""}
        </Text>
      </Text>
      <Text style={{ fontSize: 7, marginBottom: 4 }}>
        {invoiceType}
      </Text>
      <Text style={{ fontSize: 8, marginBottom: 2, fontWeight: "bold" }}>
        Folio N° {invoiceNumberValue ?? ""}
      </Text>
      <Text style={{ fontSize: 6 }}>UNIDAD S.I.I.</Text>
    </View>
  );
}
