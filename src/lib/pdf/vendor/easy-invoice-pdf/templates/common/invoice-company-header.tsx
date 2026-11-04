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
  const company = invoiceData?.company;
  if (!company) return null;

  const lines: Array<React.ReactNode> = [];

  // Nombre de la empresa (más grande)
  if (company.name) {
    lines.push(
      <Text key="name" style={{ fontWeight: "bold", fontSize: 12 }}>
        {company.name}
      </Text>,
    );
  }

  // Dirección + ciudad/comuna
  const addressParts = [company.address, company.city, company.commune].filter(
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
  if (company.notes) {
    lines.push(
      <Text key="giro" style={{ fontSize: 8 }}>
        Giro: {company.notes}
      </Text>,
    );
  }

  // Correo
  if (company.email && company.emailFieldIsVisible) {
    lines.push(
      <Text key="email" style={{ fontSize: 8 }}>
        Correo: {company.email}
      </Text>,
    );
  }

  // Teléfono
  if (company.phone && company.phoneFieldIsVisible) {
    lines.push(
      <Text key="phone" style={{ fontSize: 8 }}>
        Teléfono: {company.phone}
      </Text>,
    );
  }

  // RUT
  if (company.vatNo && company.vatNoFieldIsVisible) {
    lines.push(
      <Text key="vatNo" style={{ fontWeight: "bold", fontSize: 8 }}>
        {company.vatNoLabelText}: {company.vatNo}
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
