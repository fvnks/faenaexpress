// El puente entre los documentos del ERP (ventas y compras) y el modelo de datos que
// entiende la plantilla de PDF vendorizada de easy-invoice-pdf.
//
// Los totales NO se calculan acá: salen de `lib/ledger.ts`, la misma regla que usa el
// panel, las listas y los reportes (total = movido + pendiente). Si el PDF sumara por su
// cuenta, el documento impreso y la pantalla dirían cosas distintas.

import type { DocumentType } from "@/generated/prisma/client";
import { documentTypeLabel } from "@/lib/labels";
import { calcularTotales } from "@/lib/ledger";

import type {
  InvoiceData,
  InvoiceItemData,
} from "./vendor/easy-invoice-pdf/schema";
import { pdf417SiiDataUrl, tipoDocumentoASii } from "./pdf417-sii";

/** La empresa emisora (la del ERP) con los datos que se imprimen en el encabezado. */
export type EmpresaPdf = {
  name: string;
  rut: string | null;
  address: string | null;
  city: string | null;
  commune: string | null;
  giro: string | null;
  email: string | null;
  phone: string | null;
  web?: string | null;
  logo?: string | null; // data URL del logo configurado por el usuario
  ivaRate: number;
};

/** El tercero (cliente o proveedor) con los datos que se imprimen. */
export type TerceroPdf = {
  name: string;
  rut: string | null;
  address: string | null;
  city: string | null;
  commune: string | null;
  giro: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

/** Una línea del documento. */
export type LineaPdf = {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type DocumentoPdfBase = {
  documentType: DocumentType;
  documentNumber: string | null;
  date: Date;
  dueDate: Date | null;
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
  status: string;
  paymentMethod: string | null;
  paymentDate: Date | null;
  notes: string | null;
  items: LineaPdf[];
  /** Lo ya abonado (suma de los pagos aplicados). */
  abonado: number;
  /** Fecha de documento (para impresión en compras). */
  fechaDocumento?: string | null;
  /** Ciudad del documento. */
  ciudad?: string | null;
  /** Tasa de ingreso. */
  tasaIngreso?: number | null;
  /** Vendedor. */
  vendedor?: string | null;
  /** Condición de pago. */
  condicionPago?: string | null;
  /** Moneda de ingreso. */
  monedaIngreso?: string | null;
  /** Número de orden de compra (referencia). */
  ordenCompra?: string | null;
  /** Número de guía de despacho (referencia). */
  guiaDespacho?: string | null;
  /** Folio de la orden de compra. */
  ordenCompraFolio?: string | null;
  /** Fecha de la orden de compra. */
  ordenCompraFecha?: string | null;
  /** Folio de la guía de despacho. */
  guiaDespachoFolio?: string | null;
  /** Fecha de la guía de despacho. */
  guiaDespachoFecha?: string | null;
};

/** Lo que la venta tiene y la compra no. */
export type VentaPdfExtra = {
  retentionAmount: number;
  /** La tasa de IVA del documento, si se conoce (sale del XML del SII). */
  tasaIVA?: number | null;
  /** El documento está en confirming: el dinero entró por otra vía. */
  confirming: boolean;
  /** Datos del documento que no cambian la matemática pero se imprimen. */
  purchaseOrder?: string | null;
  dispatchGuide?: string | null;
  hesNumber?: string | null;
  description?: string | null;
  salesperson?: string | null;
  category?: string | null;
  area?: string | null;
};

/** Lo que la compra tiene y la venta no. */
export type CompraPdfExtra = {
  exento: number;
  ivaRecargo: number;
  tasaIVA: number | null;
  description?: string | null;
  category?: string | null;
  area?: string | null;
};

/** Los rótulos de las dos partes del documento. */
const ETIQUETAS_PARTES = { seller: "Emisor", buyer: "Receptor" } as const;

/** La fecha del documento es un día de calendario: se pasa como YYYY-MM-DD. */
function fechaIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function partesDireccion(p: {
  address: string | null;
  city: string | null;
  commune: string | null;
}): string {
  return [p.address, p.city, p.commune].filter(Boolean).join(", ");
}

/**
 * El IVA de cada línea, repartido desde el IVA del documento.
 *
 * El ERP guarda el IVA del documento, no el de cada línea: multiplicar línea por línea y
 * redondear deja la suma descuadrada en uno o dos pesos. Acá se reparte el IVA real entre
 * las líneas según su peso neto y la última línea absorbe la diferencia, de modo que la
 * columna del PDF sume exactamente lo que dice el documento.
 */
function repartirIvaPorLinea(
  lineas: LineaPdf[],
  ivaTotal: number,
): number[] {
  if (lineas.length === 0) return [];

  const netos = lineas.map((l) => l.amount);
  const sumaNeto = netos.reduce((a, b) => a + b, 0);

  if (sumaNeto <= 0) {
    return lineas.map((_, i) => (i === 0 ? ivaTotal : 0));
  }

  const bruto = netos.map((n) => Math.round((n * ivaTotal) / sumaNeto));
  const suma = bruto.reduce((a, b) => a + b, 0);
  bruto[bruto.length - 1] += ivaTotal - suma;

  return bruto;
}

/**
 * Las líneas del PDF.
 */
function lineasPdf(
  items: LineaPdf[],
  ivaTotal: number,
  tasa: number,
  fallback: { nombre: string; neto: number },
): { lineas: InvoiceItemData[]; netoLineas: number } {
  const base: LineaPdf[] =
    items.length > 0
      ? items
      : [
          {
            name: fallback.nombre,
            quantity: 1,
            unitPrice: fallback.neto,
            amount: fallback.neto,
          },
        ];

  const ivas = repartirIvaPorLinea(base, ivaTotal);

  const lineas: InvoiceItemData[] = base.map((linea, i) => ({
    invoiceItemNumberIsVisible: true,
    name: linea.name,
    nameFieldIsVisible: true,
    typeOfGTU: "",
    typeOfGTUFieldIsVisible: false,
    amount: linea.quantity,
    amountFieldIsVisible: true,
    unit: "",
    unitFieldIsVisible: false,
    netPrice: linea.unitPrice,
    netPriceFieldIsVisible: true,
    vat: tasa,
    vatFieldIsVisible: true,
    netAmount: linea.amount,
    netAmountFieldIsVisible: true,
    vatAmount: ivas[i] ?? 0,
    vatAmountFieldIsVisible: true,
    preTaxAmount: linea.amount + (ivas[i] ?? 0),
    preTaxAmountFieldIsVisible: false,
    discountType: "percentage",
    discountValue: 0,
    discountLabel: "",
    discountAmount: 0,
  }));

  return {
    lineas,
    netoLineas: lineas.reduce((a, l) => a + l.netAmount, 0),
  };
}

/** Los datos de la empresa del ERP (siempre la misma, para el encabezado). */
function empresaComoParte(
  empresa: EmpresaPdf,
  etiquetas: { seller: string; buyer: string },
) {
  return {
    name: empresa.name,
    address: empresa.address ?? "",
    city: empresa.city ?? undefined,
    commune: empresa.commune ?? undefined,
    vatNo: empresa.rut ?? "",
    vatNoLabelText: "RUT",
    vatNoFieldIsVisible: true,
    email: empresa.email ?? "",
    emailFieldIsVisible: Boolean(empresa.email),
    phone: empresa.phone ?? "",
    phoneFieldIsVisible: Boolean(empresa.phone),
    notes: empresa.giro ?? undefined,
    notesFieldIsVisible: Boolean(empresa.giro),
    accountNumberFieldIsVisible: false,
    swiftBicFieldIsVisible: false,
    label: etiquetas.seller,
  };
}

/** Los datos del tercero (cliente o proveedor). */
function terceroComoParte(
  tercero: TerceroPdf,
  rol: "seller" | "buyer",
  etiquetas: { seller: string; buyer: string },
) {
  const base = {
    name: tercero.name,
    address: tercero.address ?? "",
    city: tercero.city ?? undefined,
    commune: tercero.commune ?? undefined,
    vatNo: tercero.rut ?? "",
    vatNoLabelText: "RUT",
    vatNoFieldIsVisible: true,
    email: tercero.email ?? "",
    emailFieldIsVisible: Boolean(tercero.email),
    phone: tercero.phone ?? "",
    phoneFieldIsVisible: Boolean(tercero.phone),
    notes: tercero.notes ?? undefined,
    notesFieldIsVisible: Boolean(tercero.notes),
    accountNumberFieldIsVisible: false,
    swiftBicFieldIsVisible: false,
  };

  if (rol === "seller") {
    return { ...base, label: etiquetas.seller };
  }

  return { ...base, label: etiquetas.buyer };
}

/** Lo que la plantilla y el pie necesitan, común a venta y compra. */
async function baseDocumento({
  empresa,
  tercero,
  emisorEsEmpresa,
  documento,
  tipoDocumento,
  descripcion,
  lineas,
  extra,
  confirming = false,
}: {
  empresa: EmpresaPdf;
  tercero: TerceroPdf;
  /**
   * Quién emite el documento. En una venta es la empresa; en una compra es el
   * proveedor: la factura que se imprime es la que él entregó.
   */
  emisorEsEmpresa: boolean;
  documento: DocumentoPdfBase;
  tipoDocumento: string;
  descripcion: string;
  lineas: { lineas: InvoiceItemData[]; netoLineas: number };
  extra: {
    retention?: number;
    exento?: number;
    recargo?: number;
  };
  /** El documento está en confirming: el dinero ya entró por otra vía. */
  confirming?: boolean;
}): Promise<InvoiceData> {
  const totales = calcularTotales([
    {
      documentType: documento.documentType,
      documentNumber: documento.documentNumber,
      status: documento.status,
      totalAmount: documento.totalAmount,
      abonado: documento.abonado,
      retentionAmount: extra.retention ?? 0,
      confirming,
    },
  ]);

  const pago = documento.paymentMethod ?? "";

  const esNota =
    documento.documentType === "CREDIT_NOTE" ||
    documento.documentType === "DEBIT_NOTE";

  // PDF417 del SII (timbre electrónico)
  let qrCodeIsVisible = false;
  let qrCodeData = "";
  if (
    documento.documentNumber &&
    empresa.rut &&
    tercero.rut &&
    documento.totalAmount > 0
  ) {
    try {
      const dataUrl = await pdf417SiiDataUrl({
        rutEmisor: empresa.rut,
        tipoDte: tipoDocumentoASii(documento.documentType),
        folio: documento.documentNumber,
        fecha: documento.date,
        monto: documento.totalAmount,
        rutReceptor: tercero.rut,
      });
      if (dataUrl) {
        qrCodeIsVisible = true;
        qrCodeData = dataUrl;
      }
    } catch {
      // Si falla, el PDF se imprime sin QR.
    }
  }

  return {
    language: "es",
    dateFormat: "DD/MM/YYYY",
    currency: "CLP",
    numberFormatLocale: "es",
    template: "default",
    taxLabelText: "IVA",
    invoiceNumberObject: {
      label: `${tipoDocumento} N°`,
      value: documento.documentNumber ?? "sin folio",
    },
    dateOfIssue: fechaIso(documento.date),
    dateOfService: fechaIso(documento.date),
    dateOfServiceFieldIsVisible: false,
    servicePeriodFieldIsVisible: false,
    servicePeriodLabelText: "Periodo de servicio",
    dateOfServiceLabelText: "Fecha de venta",
    invoiceType: descripcion || undefined,
    invoiceTypeFieldIsVisible: Boolean(descripcion),
    // seller = quien emite el documento (empresa en venta, proveedor en compra)
    seller: emisorEsEmpresa
      ? empresaComoParte(empresa, ETIQUETAS_PARTES)
      : terceroComoParte(tercero, "seller", ETIQUETAS_PARTES),
    // buyer = quien recibe (cliente en venta, empresa en compra)
    buyer: emisorEsEmpresa
      ? terceroComoParte(tercero, "buyer", ETIQUETAS_PARTES)
      : empresaComoParte(empresa, ETIQUETAS_PARTES),
    // Logo de la empresa para el encabezado (configurable por empresa)
    logo: empresa.logo ?? undefined,
    items: lineas.lineas,
    total: documento.totalAmount,
    vatTableSummaryIsVisible:
      lineas.lineas.length > 0 &&
      Math.abs(lineas.netoLineas - documento.netAmount) <= 1,
    paymentMethod: pago,
    paymentMethodFieldIsVisible: Boolean(pago),
    paymentDue: fechaIso(
      documento.paymentDate ?? documento.dueDate ?? documento.date,
    ),
    notes: documento.notes ?? undefined,
    notesFieldIsVisible: Boolean(documento.notes),
    qrCodeIsVisible,
    qrCodeData,
    qrCodeDescription: "Valida este documento en el SII",
    personAuthorizedToReceiveName: "",
    personAuthorizedToReceiveFieldIsVisible: false,
    personAuthorizedToIssueName: "",
    personAuthorizedToIssueFieldIsVisible: false,
    erpPaidAmount: totales.movido,
    erpRetentionAmount: extra.retention ?? 0,
    erpExemptAmount: extra.exento ?? 0,
    erpSurchargeAmount: extra.recargo ?? 0,
    erpLabels: {
      seller: "Emisor",
      buyer: "Receptor",
      total: esNota ? "Total de la nota" : "Total a pagar",
      retention: "Retención",
      exempt: "Exento",
      surcharge: "Recargo IVA",
      paymentDate: documento.paymentDate
        ? "Fecha de pago"
        : "Fecha de vencimiento",
    },
    erpBalanceVisible: !esNota,
    erpFooterDueDate: fechaIso(documento.dueDate ?? documento.date),
    erpFechaDocumento: documento.fechaDocumento ?? null,
    erpCiudad: documento.ciudad ?? null,
    erpTasaIngreso: documento.tasaIngreso ?? null,
    erpVendedor: documento.vendedor ?? null,
    erpCondicionPago: documento.condicionPago ?? null,
    erpMonedaIngreso: documento.monedaIngreso ?? null,
    erpOrdenCompra: documento.ordenCompra ?? null,
    erpGuiaDespacho: documento.guiaDespacho ?? null,
    erpOrdenCompraFolio: documento.ordenCompraFolio ?? null,
    erpOrdenCompraFecha: documento.ordenCompraFecha ?? null,
    erpGuiaDespachoFolio: documento.guiaDespachoFolio ?? null,
    erpGuiaDespachoFecha: documento.guiaDespachoFecha ?? null,
    erpIvaAmount: documento.ivaAmount,
    // Si es compra, el emisor es el proveedor (cuadro SII rojo)
    erpIsPurchase: !emisorEsEmpresa,
    // Datos de la empresa del ERP para el encabezado del PDF (siempre iguales)
    erpEmpresaNombre: empresa.name,
    erpEmpresaRut: empresa.rut ?? null,
    erpEmpresaAddress: empresa.address ?? null,
    erpEmpresaCity: empresa.city ?? null,
    erpEmpresaCommune: empresa.commune ?? null,
    erpEmpresaGiro: empresa.giro ?? null,
    erpEmpresaEmail: empresa.email ?? null,
    erpEmpresaPhone: empresa.phone ?? null,
    erpEmpresaWeb: empresa.web ?? null,
    erpEmpresaLogo: empresa.logo ?? null,
  };
}

export async function documentoVentaPdf({
  empresa,
  cliente,
  venta,
  ventaExtra,
}: {
  empresa: EmpresaPdf;
  cliente: TerceroPdf;
  venta: DocumentoPdfBase;
  ventaExtra: VentaPdfExtra;
}): Promise<InvoiceData> {
  const tasa = ventaExtra.tasaIVA ?? empresa.ivaRate;
  const lineas = lineasPdf(venta.items, venta.ivaAmount, tasa, {
    nombre: ventaExtra.description ?? venta.notes ?? "Venta",
    neto: venta.netAmount,
  });

  const descripcion = [
    documentTypeLabel(venta.documentType),
    ventaExtra.salesperson ? `Vendedor: ${ventaExtra.salesperson}` : null,
    ventaExtra.purchaseOrder ? `OC: ${ventaExtra.purchaseOrder}` : null,
    ventaExtra.dispatchGuide ? `Guía: ${ventaExtra.dispatchGuide}` : null,
    ventaExtra.hesNumber ? `HES: ${ventaExtra.hesNumber}` : null,
    ventaExtra.category ? `Categoría: ${ventaExtra.category}` : null,
    ventaExtra.area ? `Área: ${ventaExtra.area}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return await baseDocumento({
    empresa,
    tercero: cliente,
    emisorEsEmpresa: true,
    documento: venta,
    tipoDocumento: documentTypeLabel(venta.documentType),
    descripcion,
    lineas,
    extra: { retention: ventaExtra.retentionAmount },
    confirming: ventaExtra.confirming,
  });
}

export async function documentoCompraPdf({
  empresa,
  proveedor,
  compra,
  compraExtra,
}: {
  empresa: EmpresaPdf;
  proveedor: TerceroPdf;
  compra: DocumentoPdfBase;
  compraExtra: CompraPdfExtra;
}): Promise<InvoiceData> {
  const tasa = compraExtra.tasaIVA ?? empresa.ivaRate;
  const lineas = lineasPdf(compra.items, compra.ivaAmount, tasa, {
    nombre: compraExtra.description ?? compra.notes ?? "Compra",
    neto: compra.netAmount,
  });

  const descripcion = [
    documentTypeLabel(compra.documentType),
    compraExtra.category ? `Categoría: ${compraExtra.category}` : null,
    compraExtra.area ? `Área: ${compraExtra.area}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return await baseDocumento({
    empresa,
    tercero: proveedor,
    emisorEsEmpresa: false,
    documento: compra,
    tipoDocumento: documentTypeLabel(compra.documentType),
    descripcion,
    lineas,
    extra: { exento: compraExtra.exento, recargo: compraExtra.ivaRecargo },
  });
}
