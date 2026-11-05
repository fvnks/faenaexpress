/**
 * Vendorizado desde easy-invoice-pdf (https://github.com/VladSez/easy-invoice-pdf).
 * Licencia: AGPL-3.0 — ver LICENSE en esta carpeta y ../README.md.
 *
 * MODIFICACIONES (ver ../README.md):
 *  - El schema de zod del original se reemplaza por interfaces de TypeScript: los tipos
 *    que la plantilla usa y las constantes que necesita. La validación con zod quedó del
 *    lado del ERP (`src/lib/pdf/documento-pdf.ts`), que es quien arma el documento.
 *  - La lista de idiomas se reduce a los que el ERP usa (es/en) y la de monedas a las
 *    que el ERP imprime (CLP, USD, EUR).
 *  - Se agregan los campos `erp*` que el ERP necesita para sus documentos (retención,
 *    abonado, exento, recargo, etiqueta del documento y pie de página).
 */

/** Monedas que el ERP puede imprimir. */
export const SUPPORTED_CURRENCIES = ["CLP", "USD", "EUR"] as const;
export type SupportedCurrencies = (typeof SUPPORTED_CURRENCIES)[number];

/** Plantillas: el ERP usa la del template "default" del original. */
export const SUPPORTED_TEMPLATES = ["default"] as const;
export type SupportedTemplates = (typeof SUPPORTED_TEMPLATES)[number];

/** Idiomas de la plantilla. El ERP imprime en español. */
export const SUPPORTED_INVOICE_PDF_LANGUAGES = ["es", "en"] as const;
export type SupportedLanguages =
  (typeof SUPPORTED_INVOICE_PDF_LANGUAGES)[number];

/** Formatos de fecha que la plantilla sabe escribir. */
export const SUPPORTED_DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "D/M/YYYY",
  "D [de] MMMM [de] YYYY",
] as const;
export type SupportedDateFormat = (typeof SUPPORTED_DATE_FORMATS)[number];

/**
 * Los locales con los que se puede punctuatedar un número. `international` es el que
 * usaba la plantilla por omisión: miles con espacio y decimal con punto.
 */
export const SUPPORTED_NUMBER_FORMAT_LOCALES = [
  "international",
  ...SUPPORTED_INVOICE_PDF_LANGUAGES,
] as const;
export type SupportedNumberFormatLocale =
  (typeof SUPPORTED_NUMBER_FORMAT_LOCALES)[number];

interface ResolveNumberFormatLocaleArgs {
  /** El idioma del documento. */
  language: SupportedLanguages;
  /** El override, en los documentos que lo llevan. */
  numberFormatLocale?: SupportedNumberFormatLocale;
}

/**
 * El locale con el que se escribe un número: el que el documento lleva, o su idioma.
 */
export function resolveNumberFormatLocale({
  language,
  numberFormatLocale,
}: ResolveNumberFormatLocaleArgs): SupportedNumberFormatLocale {
  return numberFormatLocale ?? language;
}

/** Una línea del documento. */
export type InvoiceItemData = {
  /** Mostrar la columna de numeración. */
  invoiceItemNumberIsVisible: boolean;
  /** Descripción del producto o servicio. */
  name?: string;
  nameFieldIsVisible: boolean;
  /** Tipo de bien o servicio (GTU). */
  typeOfGTU: string;
  typeOfGTUFieldIsVisible: boolean;
  /** Cantidad. */
  amount: number;
  amountFieldIsVisible: boolean;
  /** Unidad. */
  unit?: string;
  unitFieldIsVisible: boolean;
  /** Precio neto unitario. */
  netPrice: number;
  netPriceFieldIsVisible: boolean;
  /** Tasa de impuesto: número (19) o texto ("EXENTO"). */
  vat: number | string;
  vatFieldIsVisible: boolean;
  /** Importe neto de la línea. */
  netAmount: number;
  netAmountFieldIsVisible: boolean;
  /** Importe del impuesto de la línea. */
  vatAmount: number;
  vatAmountFieldIsVisible: boolean;
  /** Importe bruto de la línea (neto + impuesto). */
  preTaxAmount: number;
  preTaxAmountFieldIsVisible: boolean;
  discountType: "percentage" | "amount";
  discountValue: number;
  discountLabel: string;
  discountAmount: number;
};

/** El emisor del documento. */
export type SellerData = {
  id?: string;
  name: string;
  address: string;
  city?: string | null;
  commune?: string | null;
  vatNo?: string;
  vatNoLabelText: string;
  vatNoFieldIsVisible: boolean;
  email?: string;
  emailFieldIsVisible: boolean;
  phone?: string;
  phoneFieldIsVisible?: boolean;
  web?: string | null;
  accountNumber?: string;
  accountNumberFieldIsVisible: boolean;
  swiftBic?: string;
  swiftBicFieldIsVisible: boolean;
  notes?: string;
  notesFieldIsVisible: boolean;
};

/** El receptor del documento. */
export type BuyerData = {
  id?: string;
  name: string;
  address: string;
  city?: string | null;
  commune?: string | null;
  vatNo?: string;
  vatNoLabelText: string;
  vatNoFieldIsVisible: boolean;
  email?: string;
  emailFieldIsVisible: boolean;
  phone?: string;
  phoneFieldIsVisible?: boolean;
  notes?: string;
  notesFieldIsVisible: boolean;
};

/**
 * El documento que la plantilla sabe imprimir.
 *
 * Los campos `erp*` son la extensión del ERP al modelo del original (AGPL permite
 * modificarla; los cambios se documentan en ../README.md).
 */
export type InvoiceData = {
  language: SupportedLanguages;
  dateFormat: SupportedDateFormat;
  currency: SupportedCurrencies;
  numberFormatLocale?: SupportedNumberFormatLocale;
  template: SupportedTemplates;

  /** Logo en base64 (data URL). */
  logo?: string;

  invoiceNumberObject?: {
    label: string;
    value: string;
  };

  /** Etiqueta del impuesto: "IVA" en Chile. */
  taxLabelText: string;

  dateOfIssue: string;
  dateOfServiceStart?: string;
  dateOfService: string;
  dateOfServiceFieldIsVisible: boolean;
  servicePeriodFieldIsVisible: boolean;
  servicePeriodLabelText: string;
  dateOfServiceLabelText: string;

  /** Notas de cabecera (el ERP las usa para el tipo de documento). */
  invoiceType?: string;
  invoiceTypeFieldIsVisible: boolean;

  seller: SellerData;
  buyer: BuyerData;

  items: InvoiceItemData[];

  /** Total del documento. */
  total: number;
  vatTableSummaryIsVisible: boolean;

  paymentMethod?: string;
  paymentMethodFieldIsVisible: boolean;
  paymentDue: string;

  notes?: string;
  notesFieldIsVisible: boolean;

  qrCodeData?: string;
  qrCodeDescription?: string;
  qrCodeIsVisible: boolean;

  personAuthorizedToReceiveName: string;
  personAuthorizedToReceiveFieldIsVisible: boolean;
  personAuthorizedToIssueName: string;
  personAuthorizedToIssueFieldIsVisible: boolean;

  // ---- Extensión del ERP ----

  /**
   * Lo abonado del documento. La plantilla original lo tenía en cero fijo; el ERP lo
   * calcula desde los abonos (misma regla que `lib/ledger.ts`).
   */
  erpPaidAmount?: number;
  /** Retención (ventas): lo que no se cobra al cliente. */
  erpRetentionAmount?: number;
  /** Monto exento (compras). */
  erpExemptAmount?: number;
  /** Recargo de IVA (compras). */
  erpSurchargeAmount?: number;
  /** Etiqueta del documento: "Factura de venta", "Factura de compra"... */
  erpDocumentLabel?: string;
  /**
   * Si se muestran las líneas "Pagado" y "Pendiente de pago".
   *
   * En una nota de crédito o débito no tiene sentido: el documento no se paga, se
   * aplica contra otro. El original no tenía esta opción (imprimía siempre "Pagado 0").
   */
  erpBalanceVisible?: boolean;
  /** Texto del pie: con qué se generó el PDF. */
  erpFooterNote?: string;
  /** URL del pie (el código fuente de la app). */
  erpFooterUrl?: string;
  /**
   * La fecha de vencimiento que se escribe en el pie.
   *
   * Va aparte de `paymentDue` porque el bloque de pago muestra la fecha de pago (si
   * el documento ya se pagó) y el pie siempre habla del vencimiento: son dos fechas
   * distintas y confundirlas hace que el documento diga una cosa y el pie otra.
   */
  erpFooterDueDate?: string;
  /**
   * Etiquetas propias del ERP. El original usaba las suyas ("Vendedor",
   * "Comprador"), que en una factura de compra están al revés: el emisor es el
   * proveedor.
   */
  erpLabels?: {
    seller?: string;
    buyer?: string;
    paymentDate?: string;
    retention?: string;
    exempt?: string;
    surcharge?: string;
    total?: string;
  };
  /**
   * N° de Orden de Servicio (HES) del documento (referencia TpoDocRef/OS).
   */
  erpHesNumber?: string | null;
  /**
   * Si el documento es una compra: el emisor es el proveedor y el diseño se
   * acerca al formato del SII (recuadro RUT/tipo/folio + UNIDAD SII).
   */
  erpIsPurchase?: boolean;
  /** Fecha de documento (para compras). */
  erpFechaDocumento?: string | null;
  /** Ciudad del documento. */
  erpCiudad?: string | null;
  /** Tasa de ingreso. */
  erpTasaIngreso?: number | null;
  /** Vendedor. */
  erpVendedor?: string | null;
  /** Condición de pago. */
  erpCondicionPago?: string | null;
  /** Moneda de ingreso. */
  erpMonedaIngreso?: string | null;
  /** Orden de compra (referencia). */
  erpOrdenCompra?: string | null;
  /** Guía de despacho (referencia). */
  erpGuiaDespacho?: string | null;
  /** Folio de la orden de compra. */
  erpOrdenCompraFolio?: string | null;
  /** Fecha de la orden de compra. */
  erpOrdenCompraFecha?: string | null;
  /** Folio de la guía de despacho. */
  erpGuiaDespachoFolio?: string | null;
  /** Fecha de la guía de despacho. */
  erpGuiaDespachoFecha?: string | null;
  /** IVA del documento (para mostrar en totales). */
  erpIvaAmount?: number;
  /** Datos de la empresa del ERP para el encabezado del PDF (siempre iguales,
   * tanto en ventas como en compras). */
  erpEmpresaNombre?: string | null;
  erpEmpresaRut?: string | null;
  erpEmpresaAddress?: string | null;
  erpEmpresaCity?: string | null;
  erpEmpresaCommune?: string | null;
  erpEmpresaGiro?: string | null;
  erpEmpresaEmail?: string | null;
  erpEmpresaPhone?: string | null;
  erpEmpresaPhoneFieldIsVisible?: boolean;
  erpEmpresaEmailFieldIsVisible?: boolean;
  erpEmpresaWeb?: string | null;
  erpEmpresaLogo?: string | null;
  /** Plantilla de factura configurada por la empresa (opcional): el nombre y
   * los flags mostrar/ocultar que el diseño debe respetar. */
  erpPlantilla?: {
    nombre?: string;
    configuracion?: Partial<
      Record<
        | "mostrarEmpresa"
        | "mostrarRUT"
        | "mostrarDireccion"
        | "mostrarTelefono"
        | "mostrarCorreo"
        | "mostrarReceptor"
        | "mostrarRUTReceptor"
        | "mostrarDireccionReceptor"
        | "mostrarFechaEmision"
        | "mostrarFechaVencimiento"
        | "mostrarFolio"
        | "mostrarTipoDocumento"
        | "mostrarItems"
        | "mostrarTotales"
        | "mostrarRetencion"
        | "mostrarExento"
        | "mostrarRecargo"
        | "mostrarFormaPago"
        | "mostrarPagado"
        | "mostrarPendiente"
        | "mostrarImporteLetras"
        | "mostrarVendedor"
        | "mostrarReferencias"
        | "mostrarHES"
        | "mostrarCdgVendedor"
        | "mostrarTipoDespacho"
        | "mostrarIndServicio"
        | "mostrarTpoTranVenta"
        | "mostrarCdgIntRecep"
        | "mostrarDirPostal"
        | "mostrarCmnaPostal"
        | "mostrarCiudadPostal"
        | "mostrarUnidadItem"
        | "mostrarCodigoItem",
        boolean
      >
    >;
  };
};
