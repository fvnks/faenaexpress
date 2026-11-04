import { Image, Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { InvoiceSiiBox } from "../common/invoice-sii-box";
import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import {
  formatDateOfServiceEnd,
  formatServicePeriodRange,
} from "../../utils/format-service-period";
import { type InvoiceData } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";

/**
 * Encabezado de la factura: empresa emisora del ERP arriba a la izquierda,
 * fechas a la derecha debajo. El cuadro SII va junto al receptor (en
 * InvoiceSellerBuyerInfo).
 */
export function InvoiceHeader({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const hasLogo =
    invoiceData.erpEmpresaLogo && invoiceData.erpEmpresaLogo.length > 0;

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Logo + Empresa del ERP + Fechas */}
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        {/* Logo + Empresa emisora del ERP - izquierda */}
        <View style={{ flex: 1 }}>
          {invoiceData.erpEmpresaLogo && (
            <Image
              src={invoiceData.erpEmpresaLogo}
              style={{
                maxWidth: 110,
                maxHeight: 40,
                objectFit: "contain",
              }}
            />
          )}
          {invoiceData.erpEmpresaNombre && (
            <Text style={[styles.fontBold, styles.fontSize11]}>
              {invoiceData.erpEmpresaNombre}
            </Text>
          )}
          {invoiceData.erpEmpresaGiro && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              {invoiceData.erpEmpresaGiro}
            </Text>
          )}
          {invoiceData.erpEmpresaAddress && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              {invoiceData.erpEmpresaAddress}
            </Text>
          )}
          {invoiceData.erpEmpresaCity && invoiceData.erpEmpresaCommune && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              {invoiceData.erpEmpresaCity}, {invoiceData.erpEmpresaCommune}
            </Text>
          )}
          {invoiceData.erpEmpresaCity && !invoiceData.erpEmpresaCommune && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              {invoiceData.erpEmpresaCity}
            </Text>
          )}
          {!invoiceData.erpEmpresaCity && invoiceData.erpEmpresaCommune && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              {invoiceData.erpEmpresaCommune}
            </Text>
          )}
          {invoiceData.erpEmpresaPhone && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              Teléfono: {invoiceData.erpEmpresaPhone}
            </Text>
          )}
          {invoiceData.erpEmpresaEmail && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              Email: {invoiceData.erpEmpresaEmail}
            </Text>
          )}
          {invoiceData.erpEmpresaWeb && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              {invoiceData.erpEmpresaWeb}
            </Text>
          )}
        </View>

        {/* Fecha de emisión - derecha */}
        <View style={{ flex: 1, textAlign: "right" }}>
          <Text style={styles.fontSize7}>
            {INVOICE_PDF_TRANSLATIONS[invoiceData.language].dateOfIssue}:{" "}
            <Text style={[styles.fontBold, styles.fontSize8]}>
              {dayjs(invoiceData.dateOfIssue).format(
                invoiceData.dateFormat,
              )}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
