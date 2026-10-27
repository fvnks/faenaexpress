/**
 * Servicio de generación de DTE y PDF usando typeDte (typedte-sii).
 *
 * Funciones puras (sin "use server") que pueden usarse tanto desde Server
 * Actions como desde el servidor directamente. No dependen de Prisma ni de
 * auth; solo transforman datos en XML/PDF.
 *
 * typeDte cubre los 12 tipos de DTE del SII chileno, con timbre (TED), firma
 * XMLDSig, validación XSD y generación de PDF (carta y ticket térmico 80mm).
 */

import {
  emitir,
  type DocumentoEmitido,
  TIPO,
  TIPO_BOLETA,
  cargarCertificado,
  parseCaf,
  calcularTotales,
  calcularTotalesBoleta,
  sanitizeSiiText,
  formatRut,
} from "typedte-sii";
import {
  generarPdfCarta,
  nombreDocumento,
  construirRepresentacion,
} from "typedte-sii/pdf";

/** Entorno del SII. */
export type SiiAmbiente = "pruebas" | "produccion";

/** Datos mínimos para construir un DTE de venta. */
export type DatosDteVenta = {
  tipoDte: number;
  folio: number;
  fechaEmision: string; // AAAA-MM-DD
  horaEmision?: string; // HH:MM:SS
  rutEmisor: string;
  razonSocialEmisor: string;
  giroEmisor?: string;
  actividadesEconomicas: number[];
  direccionEmisor?: string;
  comunaEmisor?: string;
  ciudadEmisor?: string;
  telefonoEmisor?: string;
  correoEmisor?: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  giroReceptor?: string;
  direccionReceptor?: string;
  comunaReceptor?: string;
  ciudadReceptor?: string;
  telefonoReceptor?: string;
  correoReceptor?: string;
  items: Array<{
    nombre: string;
    descripcion?: string;
    cantidad: number;
    unidad?: string;
    precioUnitario: number;
    descuentoMonto?: number;
    exento?: boolean;
  }>;
  formaPago: "contado" | "credito" | "sin_costo";
  neto: number;
  exento: number;
  iva: number;
  total: number;
  notas?: string;
};

/** Resultado de generación de DTE (sin enviar al SII). */
export type DteGenerado = {
  xml: string;
  totales: {
    neto: number;
    exento: number;
    iva: number;
    total: number;
  };
  ted: any;
};

/** Resultado de generación de PDF. */
export type PdfGenerado = {
  buffer: Buffer;
  nombreArchivo: string;
  tipo: "carta" | "ticket";
};

/**
 * Normaliza un RUT para el SII: quita puntos, deja guion, ej: "76056614-4".
 * Si no hay RUT, usa el consumidor final "66666666-6".
 */
export function normalizarRutSii(rut: string | null | undefined): string {
  if (!rut) return "66666666-6";
  return rut.replace(/\./g, "");
}

/**
 * Construye el objeto documento DTE para typeDte a partir de los datos de venta.
 */
export function construirDocumentoDTE(datos: DatosDteVenta): any {
  const esBoleta = datos.tipoDte === TIPO_BOLETA.AFECTA || datos.tipoDte === TIPO_BOLETA.EXENTA;

  const comun: any = {
    folio: datos.folio,
    fechaEmision: datos.fechaEmision,
    emisor: {
      rut: normalizarRutSii(datos.rutEmisor),
      razonSocial: sanitizeSiiText(datos.razonSocialEmisor),
      giro: datos.giroEmisor ?? "Comercio al por menor",
      actividadesEconomicas: datos.actividadesEconomicas,
      direccion: datos.direccionEmisor ?? "",
      comuna: datos.comunaEmisor ?? "",
      ciudad: datos.ciudadEmisor,
      telefono: datos.telefonoEmisor,
      correo: datos.correoEmisor,
    },
    receptor: {
      rut: normalizarRutSii(datos.rutReceptor),
      razonSocial: sanitizeSiiText(datos.razonSocialReceptor),
      giro: datos.giroReceptor,
      direccion: datos.direccionReceptor,
      comuna: datos.comunaReceptor,
      ciudad: datos.ciudadReceptor,
      contacto: undefined,
      correo: datos.correoReceptor,
    },
    items: datos.items.map((item, index) => ({
      nombre: sanitizeSiiText(item.nombre),
      descripcion: item.descripcion ? sanitizeSiiText(item.descripcion) : undefined,
      cantidad: item.cantidad,
      unidad: item.unidad,
      precioUnitario: item.precioUnitario,
      descuentoMonto: item.descuentoMonto ?? 0,
      exento: item.exento ?? false,
    })),
    formaPago: datos.formaPago,
  };

  if (esBoleta) {
    return {
      tipo: datos.tipoDte,
      ...comun,
      receptor: {
        ...comun.receptor,
        rut: datos.rutReceptor ? normalizarRutSii(datos.rutReceptor) : undefined,
        razonSocial: datos.razonSocialReceptor ? sanitizeSiiText(datos.razonSocialReceptor) : undefined,
      },
    };
  }

  return {
    tipo: datos.tipoDte,
    ...comun,
  };
}

/**
 * Emite un DTE con typeDte: calcula totales, arma XML, timbra con CAF y firma
 * con certificado. Requiere credenciales reales del SII.
 *
 * @param documento - Objeto documento construido por construirDocumentoDTE.
 * @param cafXml - XML del CAF (Código de Autorización de Folios) del SII.
 * @param certificadoPfx - Buffer del certificado .pfx/.p12.
 * @param certificadoPass - Clave del certificado (opcional).
 * @param timestamp - Momento de emisión (AAAA-MM-DDTHH:MM:SS).
 */
export function emitirDteTypeDte(
  documento: any,
  cafXml: string,
  certificadoPfx: Buffer,
  certificadoPass: string | undefined,
  timestamp: string,
): DteGenerado {
  const cafParseado = parseCaf(cafXml);
  const certificado = cargarCertificado(
    certificadoPfx,
    certificadoPass ?? "",
  );

  const esBoleta =
    documento.tipo === TIPO_BOLETA.AFECTA || documento.tipo === TIPO_BOLETA.EXENTA;

  const totales = esBoleta
    ? calcularTotalesBoleta(documento)
    : calcularTotales(documento);

  const emitido = emitir(documento, {
    caf: cafParseado,
    certificado,
    timestamp,
  }) as DocumentoEmitido;

  return {
    xml: emitido.xml,
    totales: {
      neto: totales.neto,
      exento: totales.exento,
      iva: totales.iva,
      total: totales.total,
    },
    ted: emitido.ted,
  };
}

/**
 * Construye la representación imprimible para el PDF.
 */
export function construirRepresentacionImprimible(
  datos: DatosDteVenta,
  totales: { neto: number; exento: number; iva: number; total: number },
  ted: any,
  unidadSii: string = "SANTIAGO ORIENTE",
  numeroResolucion: number = 0,
  anioResolucion: number = new Date().getFullYear(),
): any {
  const esBoleta = datos.tipoDte === TIPO_BOLETA.AFECTA || datos.tipoDte === TIPO_BOLETA.EXENTA;

  return {
    tipo: datos.tipoDte,
    folio: datos.folio,
    fechaEmision: datos.fechaEmision,
    emisor: {
      rut: normalizarRutSii(datos.rutEmisor),
      razonSocial: datos.razonSocialEmisor,
      giro: datos.giroEmisor,
      direccion: datos.direccionEmisor,
      comuna: datos.comunaEmisor,
      ciudad: datos.ciudadEmisor,
      telefono: datos.telefonoEmisor,
      correo: datos.correoEmisor,
    },
    receptor: esBoleta && !datos.rutReceptor
      ? undefined
      : {
          rut: datos.rutReceptor ?? undefined,
          razonSocial: datos.razonSocialReceptor ?? undefined,
          giro: datos.giroReceptor,
          direccion: datos.direccionReceptor,
          comuna: datos.comunaReceptor,
          ciudad: datos.ciudadReceptor,
        },
    lineas: datos.items.map((item) => ({
      nombre: item.nombre,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      unidad: item.unidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuentoMonto ?? 0,
      monto: Math.max(0, Math.round(item.precioUnitario * item.cantidad - (item.descuentoMonto ?? 0))),
      exento: item.exento ?? false,
    })),
    referencias: [],
    moneda: "PESO CL",
    resolucion: {
      numero: numeroResolucion,
      anio: anioResolucion,
    },
    ted,
  };
}

/**
 * Genera un PDF de factura/boleta (tamaño carta) usando typeDte/pdf.
 */
export async function generarPdfCartaDte(
  representacion: any,
): Promise<Buffer> {
  const uint8 = await generarPdfCarta(representacion);
  return Buffer.from(uint8);
}

/**
 * Genera un PDF de ticket térmico (80mm) usando typeDte/pdf.
 * typeDte 0.1.0 solo expone generarPdfCarta; se usa la misma función para
 * ticket hasta que se agregue soporte dedicado.
 */
export async function generarPdfTicketDte(
  representacion: any,
  opciones?: { anchoPapelMm?: number; pieDePagina?: string },
): Promise<Buffer> {
  const uint8 = await generarPdfCarta(representacion);
  return Buffer.from(uint8);
}

/**
 * Genera el nombre de archivo para el PDF del DTE.
 */
export function nombreArchivoDte(tipoDte: number, folio: number): string {
  const tipo =
    tipoDte === TIPO_BOLETA.AFECTA ? "Boleta" :
    tipoDte === TIPO_BOLETA.EXENTA ? "BoletaExenta" :
    tipoDte === TIPO.FACTURA_AFECTA ? "Factura" :
    tipoDte === TIPO.FACTURA_EXENTA ? "FacturaExenta" :
    `DTE${tipoDte}`;
  return `${tipo}_${String(folio).padStart(6, "0")}.pdf`;
}

/**
 * Devuelve el nombre legible del tipo de DTE.
 */
export function nombreTipoDte(tipoDte: number): string {
  return nombreDocumento(tipoDte);
}
