import { Text, View } from "@react-pdf/renderer";

import type { InvoiceData } from "../../schema";

/**
 * Cuadro al estilo del SII con tipo de documento, folio y UNIDAD S.I.I.
 * El RUT del emisor ya aparece arriba con los datos de la empresa.
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
        width: "40%",
        padding: 12,
        textAlign: "center",
        color: "#ff0000",
        fontWeight: "bold",
        alignSelf: "flex-start",
        marginTop: 6,
      }}
    >
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
