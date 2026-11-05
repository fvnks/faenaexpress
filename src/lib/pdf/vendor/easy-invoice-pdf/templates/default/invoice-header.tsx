import { Image, Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";

import { INVOICE_PDF_TRANSLATIONS } from "../../translations";
import {
  formatDateOfServiceEnd,
  formatServicePeriodRange,
} from "../../utils/format-service-period";
import { type InvoiceData } from "../../schema";

import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";

/**
 * Encabezado al estilo del SII chileno: empresa emisora a la izquierda con
 * todos sus datos (nombre, giro, dirección, teléfono, email, web) y a la
 * derecha el RUT, tipo de documento, folio y unidad SII.
 */
function HeaderEmisor({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const seller = invoiceData?.seller;
  if (!seller) return null;

  // Plantilla de la empresa (sin plantilla todo se imprime como antes).
  const config = invoiceData.erpPlantilla?.configuracion;
  const mostrarNombre = config?.mostrarEmpresa ?? true;
  const mostrarGiro = config?.mostrarDireccion ?? true;
  const mostrarDireccion = config?.mostrarDireccion ?? true;
  const mostrarTelefono = config?.mostrarTelefono ?? true;
  const mostrarCorreo = config?.mostrarCorreo ?? true;

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
      {/* Emisor del documento - izquierda */}
      <View style={{ flex: 1 }}>
        {mostrarNombre && seller.name && (
          <Text style={[styles.fontBold, styles.fontSize11]}>
            {seller.name}
          </Text>
        )}
        {mostrarGiro && seller.notes && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {seller.notes}
          </Text>
        )}
        {mostrarDireccion && seller.address && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {seller.address}
          </Text>
        )}
        {mostrarDireccion && seller.city && seller.commune && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {seller.city}, {seller.commune}
          </Text>
        )}
        {mostrarDireccion && seller.city && !seller.commune && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {seller.city}
          </Text>
        )}
        {mostrarDireccion && !seller.city && seller.commune && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {seller.commune}
          </Text>
        )}
        {mostrarTelefono &&
          seller.phone &&
          seller.phoneFieldIsVisible !== false && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              Teléfono: {seller.phone}
            </Text>
          )}
        {mostrarCorreo &&
          seller.email &&
          seller.emailFieldIsVisible !== false && (
            <Text style={[styles.fontSize7, { marginTop: 1 }]}>
              Correo: {seller.email}
            </Text>
          )}
        {mostrarCorreo && seller.web && (
          <Text style={[styles.fontSize7, { marginTop: 1 }]}>
            {seller.web}
          </Text>
        )}
      </View>

      {/* Datos del documento - derecha */}
      <View style={{ flex: 1, textAlign: "right" }}>
        {(config?.mostrarRUT ?? true) &&
          seller.vatNoFieldIsVisible &&
          seller.vatNo && (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              R.U.T.: {seller.vatNo}
            </Text>
          )}
        {(config?.mostrarTipoDocumento ?? true) &&
          invoiceData.invoiceType &&
          invoiceData.invoiceTypeFieldIsVisible && (
            <Text style={[styles.fontSize7, { marginBottom: 2 }]}>
              {invoiceData.invoiceType}
            </Text>
          )}
        {(config?.mostrarFolio ?? true) &&
          invoiceData.invoiceNumberObject?.value && (
            <Text style={[styles.fontBold, styles.fontSize9]}>
              Folio N° {invoiceData.invoiceNumberObject.value}
            </Text>
          )}
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

  const config = invoiceData.erpPlantilla?.configuracion;
  const mostrarFechaEmision = config?.mostrarFechaEmision ?? true;
  const mostrarFechaVencimiento = config?.mostrarFechaVencimiento ?? true;

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {mostrarFechaEmision && (
        <Text style={styles.fontSize7}>
          {t.dateOfIssue}:{" "}
          <Text style={[styles.fontBold, styles.fontSize8]}>{dateOfIssue}</Text>
        </Text>
      )}
      {showServicePeriod ? (
        <Text style={styles.fontSize7}>
          {servicePeriodLabel}:{" "}
          <Text style={[styles.fontBold, styles.fontSize8]}>
            {servicePeriodRange}
          </Text>
        </Text>
      ) : null}
      {showDateOfService && mostrarFechaVencimiento ? (
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
 * Encabezado de la factura: quien emite el documento (empresa en venta,
 * proveedor en compra) arriba con sus datos y fechas debajo.
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
      {/* Logo + Emisor + Datos del documento */}
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
            {invoiceData.erpEmpresaLogo ? (
              <Image
                src={invoiceData.erpEmpresaLogo as string}
                style={{
                  maxWidth: 110,
                  maxHeight: 40,
                  objectFit: "contain",
                }}
              />
            ) : null}
          </View>
          <View style={{ flex: 1, textAlign: "right" }}>
            <HeaderDates invoiceData={invoiceData} styles={styles} />
          </View>
        </View>
      ) : null}

      {/* Emisor del documento + fechas (cuando no hay logo) */}
      {!hasLogo ? (
        <>
          <HeaderEmisor invoiceData={invoiceData} styles={styles} />
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
    </View>
  );
}
