import { type SupportedLanguages } from "./schema";
import type { TranslationSchema } from "./translations-schema";

export const INVOICE_PDF_TRANSLATIONS = {
  en: {
    invoiceNumber: "Invoice No. of",
    dateOfIssue: "Date of issue",
    dateOfService: "Date of sales/of executing the service",
    servicePeriod: "Service period",
    invoiceType: "Invoice Type",
    seller: {
      name: "Seller",
      vatNo: "VAT no",
      email: "e-mail",
      accountNumber: "Account Number",
      swiftBic: "SWIFT/BIC number",
    },
    buyer: {
      name: "Buyer",
      vatNo: "VAT no",
      email: "e-mail",
    },
    invoiceItemsTable: {
      no: "No",
      nameOfGoodsService: "Name of goods/service",
      typeOfGTU: "Type of GTU",
      amount: "Amount",
      unit: "Unit",
      /**
       * You can pass a custom text for the net price label. i.e. for i18n
       * @example
       * netPrice: ({ customTaxLabel: string }) => {
       *   return `Цена без ${customTaxLabel || "НДС"}`;
       * }
       */
      netPrice: () => {
        return `Net price`;
      },
      vat: "VAT",
      netAmount: () => {
        return `Net\n Amount`;
      },
      /**
       * You can pass a custom text for the VAT amount label. i.e. for i18n
       * @example
       * vatAmount: ({ customTaxLabel: string }) => {
       *   return `${customTaxLabel || "VAT"} Amount`;
       * }
       */
      vatAmount: ({ customTaxLabel }) => {
        return `${customTaxLabel || "VAT"} Amount`;
      },
      preTaxAmount: () => {
        return `Pre-tax amount `;
      },
      sum: "SUM",
      discount: "Discount",
    },
    paymentInfo: {
      paymentMethod: "Payment method",
      paymentDate: "Payment date",
    },
    vatSummaryTable: {
      /**
       * You can pass a custom text for the VAT rate label. i.e. for i18n
       * @example
       * vatRate: ({ customTaxLabel: string }) => {
       *   return `Ставка ${customTaxLabel || "НДС"}`;
       * }
       */
      vatRate: ({ customTaxLabel }) => {
        return `${customTaxLabel || "VAT"} rate`;
      },
      /**
       * You can pass a custom text for the net label. i.e. for i18n
       * @example
       * net: ({ customTaxLabel }) => {
       *   return `Без ${customTaxLabel || "НДС"}`;
       * }
       */
      net: () => {
        return `Net`;
      },
      vat: "VAT",
      /**
       * You can pass a custom text for the pre-tax label. i.e. for i18n
       * @example
       * preTax: ({ customTaxLabel: string }) => {
       *   return `С ${customTaxLabel || "НДС"}`;
       * }
       */
      preTax: () => {
        return `Pre-tax`;
      },
      total: "Total",
    },
    paymentTotals: {
      toPay: "To pay",
      paid: "Paid",
      leftToPay: "Left to pay",
      amountInWords: "Amount in words",
    },
    personAuthorizedToReceive: "Person authorized to receive",
    personAuthorizedToIssue: "Person authorized to issue",
    createdWith: "Created with",
    stripe: {
      invoice: "Invoice",
      invoiceNumber: "Invoice number",
      dateOfIssue: "Date of issue",
      dateDue: "Date due",
      servicePeriod: "Service period",
      billTo: "Bill to",
      due: "due",
      payOnline: "Pay Online",
      description: "Description",
      qty: "Qty",
      unit: "Unit",
      unitPrice: "Unit Price",
      amount: "Amount",
      tax: "Tax",
      subtotal: "Subtotal",
      totalExcludingTax: "Total excluding tax",
      total: "Total",
      amountDue: "Amount Due",
      page: "Page",
      of: "of",
      discount: "Discount",
      taxOn: "on",
      discountOff: "off",
    },
  },
  es: {
    invoiceNumber: "Factura n.º",
    dateOfIssue: "Fecha de emisión",
    dateOfService: "Fecha de venta/prestación del servicio",
    servicePeriod: "Periodo de servicio",
    invoiceType: "Tipo de factura",
    seller: {
      name: "Vendedor",
      vatNo: "NIF/CIF",
      email: "Correo electrónico",
      accountNumber: "Número de cuenta",
      swiftBic: "SWIFT/BIC",
    },
    buyer: {
      name: "Comprador",
      vatNo: "NIF/CIF",
      email: "Correo electrónico",
    },
    invoiceItemsTable: {
      no: "N.º",
      nameOfGoodsService: "Descripción del producto/servicio",
      typeOfGTU: "Tipo\n GTU",
      amount: "Cantidad",
      unit: "Unidad",
      netPrice: () => {
        return `Precio neto`;
      },
      vat: "IVA",
      netAmount: () => {
        return `Importe\n neto`;
      },
      vatAmount: ({ customTaxLabel }) => {
        return `Importe ${customTaxLabel || "IVA"}`;
      },
      preTaxAmount: () => {
        return `Importe bruto`;
      },
      sum: "TOTAL",
      discount: "Descuento",
    },
    paymentInfo: {
      paymentMethod: "Forma de pago",
      paymentDate: "Fecha de pago",
    },
    vatSummaryTable: {
      vatRate: ({ customTaxLabel }) => {
        // MODIFICACIÓN (vendorizado): el original decía "Tipo IVA", que en español
        // no se entiende. Es una tasa.
        return `Tasa de ${customTaxLabel || "IVA"}`;
      },
      net: () => {
        return `Neto`;
      },
      vat: "IVA",
      preTax: () => {
        return `Bruto`;
      },
      total: "Total",
    },
    paymentTotals: {
      toPay: "Total a pagar",
      paid: "Pagado",
      leftToPay: "Pendiente de pago",
      amountInWords: "Importe en letras",
    },
    personAuthorizedToReceive: "Persona autorizada para recibir",
    personAuthorizedToIssue: "Persona autorizada para emitir",
    createdWith: "Creado con",
    stripe: {
      invoice: "Factura",
      invoiceNumber: "Número de factura",
      dateOfIssue: "Fecha de emisión",
      dateDue: "Fecha de vencimiento",
      servicePeriod: "Periodo de servicio",
      billTo: "Facturar a",
      due: "con vencimiento el",
      payOnline: "Pago en línea",
      description: "Descripción",
      qty: "Cant.",
      unit: "Unidad",
      unitPrice: "Precio unitario",
      amount: "Monto",
      tax: "Impuesto",
      subtotal: "Subtotal",
      totalExcludingTax: "Total sin impuestos",
      total: "Total",
      amountDue: "Monto a pagar",
      page: "Página",
      of: "de",
      discount: "Descuento",
      taxOn: "sobre",
      discountOff: "de descuento",
    },
  },
} as const satisfies Record<SupportedLanguages, TranslationSchema>;

