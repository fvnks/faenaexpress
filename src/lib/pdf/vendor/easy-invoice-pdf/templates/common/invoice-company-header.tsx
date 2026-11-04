import { Text, View } from "@react-pdf/renderer";

import type { InvoiceData } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from "../default";

/**
 * Bloque superior con los datos de la empresa del ERP (emisor de la factura).
 * Se muestra arriba de todo en la factura comercial.
 */
export function InvoiceCompanyHeader({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const e = invoiceData;
  if (!e) return null;

  return (
    <View style={{ width: "100%", marginBottom: 10 }}>
      {e.erpEmpresaNombre && (
        <Text style={[styles.fontBold, styles.fontSize11]}>
          {e.erpEmpresaNombre}
        </Text>
      )}
      {e.erpEmpresaGiro && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          {e.erpEmpresaGiro}
        </Text>
      )}
      {e.erpEmpresaAddress && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          {e.erpEmpresaAddress}
        </Text>
      )}
      {e.erpEmpresaCity && e.erpEmpresaCommune && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          {e.erpEmpresaCity}, {e.erpEmpresaCommune}
        </Text>
      )}
      {e.erpEmpresaCity && !e.erpEmpresaCommune && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          {e.erpEmpresaCity}
        </Text>
      )}
      {!e.erpEmpresaCity && e.erpEmpresaCommune && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          {e.erpEmpresaCommune}
        </Text>
      )}
      {e.erpEmpresaPhone && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          Teléfono: {e.erpEmpresaPhone}
        </Text>
      )}
      {e.erpEmpresaEmail && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          Correo: {e.erpEmpresaEmail}
        </Text>
      )}
      {e.erpEmpresaWeb && (
        <Text style={[styles.fontSize7, { marginTop: 1 }]}>
          {e.erpEmpresaWeb}
        </Text>
      )}
    </View>
  );
}
