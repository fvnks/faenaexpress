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
 * Encabezado al estilo del SII chileno: empresa emisora (del ERP) a la izquierda
 * con todos sus datos (nombre, giro, dirección, teléfono, email, web, logo) y a la
 * derecha el RUT, tipo de documento, folio y unidad SII.
 */
function HeaderEmpresa({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const e = invoiceData;
  if (!e) return null;

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
      {/* Empresa emisora del ERP - izquierda */}
      <View style={{ flex: 1 }}>
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
        {e.erpEmpresaPhone && e.erpEmpresaPhoneFieldIsVisible !== false && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            Teléfono: {e.erpEmpresaPhone}
          </Text>
        )}
        {e.erpEmpresaEmail && e.erpEmpresaEmailFieldIsVisible !== false && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            Email: {e.erpEmpresaEmail}
          </Text>
        )}
        {e.erpEmpresaWeb && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {e.erpEmpresaWeb}
          </Text>
        )}
      </View>

      {/* Datos del documento - derecha */}
      <View style={{ flex: 1, textAlign: "right" }}>
        {e.seller?.vatNoFieldIsVisible && e.seller.vatNo && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            R.U.T.: {e.seller.vatNo}
          </Text>
        )}
        {e.invoiceType && e.invoiceTypeFieldIsVisible && (
          <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
            {e.invoiceType}
          </Text>
        )}
        {e.invoiceNumberObject?.value && (
          <Text style={[styles.fontBold, styles.fontSize9]}>
            Folio N° {e.invoiceNumberObject.value}
          </Text>
        )}
        <Text style={[styles.fontSize7]}>UNIDAD S.I.I.</Text>
      </View>
    </View>
  );
}

function HeaderDates({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const t = INVOICE_PDF_TRANSLATIONS[invoiceData.language];

  const dateOfIssue = dayjs(invoiceData.dateOfIssue).format(
    invoiceData.dateFormat,
  );
  const dateOfServiceEnd = formatDateOfServiceEnd(invoiceData);
  const servicePeriodRange = formatServicePeriodRange(invoiceData);

  const showServicePeriod = invoiceData?.servicePeriodFieldIsVisible;

  const showDateOfService = invoiceData?.dateOfServiceFieldIsVisible;

  const servicePeriodLabel =
    invoiceData.servicePeriodLabelText ?? t.servicePeriod;
  const dateOfServiceLabel =
    invoiceData.dateOfServiceLabelText ?? t.dateOfService;

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <Text style={styles.fontSize7}>
        {t.dateOfIssue}:{" "}
        <Text style={[styles.fontBold, styles.fontSize8]}>{dateOfIssue}</Text>
      </Text>
      {showServicePeriod ? (
        <Text style={styles.fontSize7}>
          {servicePeriodLabel}:{" "}
          <Text style={[styles.fontBold, styles.fontSize8]}>
            {servicePeriodRange}
          </Text>
        </Text>
      ) : null}
      {showDateOfService ? (
        <Text style={styles.fontSize7}>
          {dateOfServiceLabel}:{" "}
          <Text style={[styles.fontBold, styles.fontSize8]}>
            {dateOfServiceEnd}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Encabezado de la factura: empresa emisora del ERP arriba (con datos del SII a la
 * derecha) y fechas debajo.
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
      {/* Logo + Empresa + Datos del documento */}
      {hasLogo ? (
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <View style={{ alignItems: "flex-start" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
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
          </View>
          <View style={{ flex: 1, textAlign: "right" }}>
            <HeaderDates invoiceData={invoiceData} styles={styles} />
          </View>
        </View>
      ) : null}

      {/* Empresa emisora del ERP + datos del documento (cuando no hay logo) */}
      {!hasLogo ? (
        <>
          <HeaderEmpresa invoiceData={invoiceData} styles={styles} />
          <View
            style={{
              marginTop: 4,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <HeaderDates invoiceData={invoiceData} styles={styles} />
          </View>
        </>
      ) : null}

      {/* Cuadro SII rojo: solo en compras, el emisor es el proveedor */}
      {invoiceData.erpIsPurchase ? (
        <View
          style={{
            width: "100%",
            marginBottom: 10,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <InvoiceSiiBox invoiceData={invoiceData} />
        </View>
      ) : null}
    </View>
  );
}
