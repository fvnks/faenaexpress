import { Text, View } from "@react-pdf/renderer";

import type { InvoiceData } from "../../schema";

/**
 * Bloque superior con todos los datos de la empresa emisora (los que el
 * usuario configuró en la app): nombre, dirección, correo, teléfono y giro.
 * Solo se muestran los campos que tengan valor.
 */
export function InvoiceCompanyHeader({
  invoiceData,
}: {
  invoiceData: InvoiceData;
}) {
  const seller = invoiceData?.seller;
  if (!seller) return null;

  const lines: Array<React.ReactNode> = [];

  // Nombre de la empresa (más grande)
  if (seller.name) {
    lines.push(
      <Text key="name" style={{ fontWeight: "bold", fontSize: 12 }}>
        {seller.name}
      </Text>,
    );
  }

  // Dirección + ciudad/comuna
  const addressParts = [seller.address, seller.city, seller.commune].filter(
    Boolean,
  );
  if (addressParts.length > 0) {
    lines.push(
      <Text key="address" style={{ fontSize: 8 }}>
        {addressParts.join(", ")}
      </Text>,
    );
  }

  // Giro
  if (seller.notes) {
    lines.push(
      <Text key="giro" style={{ fontSize: 8 }}>
        Giro: {seller.notes}
      </Text>,
    );
  }

  // Correo
  if (seller.email && seller.emailFieldIsVisible) {
    lines.push(
      <Text key="email" style={{ fontSize: 8 }}>
        Correo: {seller.email}
      </Text>,
    );
  }

  // Teléfono
  if (seller.phone && seller.phoneFieldIsVisible) {
    lines.push(
      <Text key="phone" style={{ fontSize: 8 }}>
        Teléfono: {seller.phone}
      </Text>,
    );
  }

  // RUT
  if (seller.vatNo && seller.vatNoFieldIsVisible) {
    lines.push(
      <Text key="vatNo" style={{ fontWeight: "bold", fontSize: 8 }}>
        {seller.vatNoLabelText}: {seller.vatNo}
      </Text>,
    );
  }

  return (
    <View
      style={{
        marginBottom: 18,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#000",
      }}
    >
      {lines}
    </View>
  );
}
