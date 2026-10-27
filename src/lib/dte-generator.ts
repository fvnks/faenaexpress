/**
 * Generador de XML DTE para el SII (facturación electrónica chilena).
 *
 * Produce el XML de un documento tipo 33 (Factura Electrónica) o 39
 * (Boleta Electrónica) listo para ser firmado y enviado al SII.
 *
 * Estructura basada en el formato oficial del SII:
 * https://www.sii.cl/servicios_online/3532-formato_xml-3811.html
 *
 * El XML generado va sin la firma digital (TimbreElectronico vacía). La
 * firma se aplica después con el certificado .pfx de la empresa antes de
 * enviarlo al SII.
 */

import { formatCLP } from "@/lib/money";
import { normalizeRut } from "@/lib/rut";

/**
 * Datos mínimos para armar un DTE de venta POS.
 */
export type DteVentaInput = {
  /** Tipo de DTE: 33 = Factura, 39 = Boleta */
  tipoDte: number;
  /** Folio asignado desde el CAF */
  folio: number;
  /** Fecha de emisión (YYYY-MM-DD) */
  fecha: string;
  /** Hora de emisión (HH:MM:SS) opcional */
  hora?: string;
  /** RUT del emisor (con puntos y guion, ej: "76.056.614-4") */
  rutEmisor: string;
  /** Razón social del emisor */
  razonSocialEmisor: string;
  /** Giro del emisor */
  giroEmisor?: string | null;
  /** Código de actividad económica */
  actecoEmisor?: string | null;
  /** Dirección del emisor */
  direccionEmisor?: string | null;
  /** Comuna del emisor */
  comunaEmisor?: string | null;
  /** Ciudad del emisor */
  ciudadEmisor?: string | null;
  /** Teléfono del emisor */
  telefonoEmisor?: string | null;
  /** Correo del emisor */
  emailEmisor?: string | null;
  /** Sucursal del emisor */
  sucursalEmisor?: string | null;
  /** RUT del receptor (puede ser "66666666-6" para consumidor final) */
  rutReceptor: string;
  /** Razón social del receptor */
  razonSocialReceptor: string;
  /** Giro del receptor */
  giroReceptor?: string | null;
  /** Dirección del receptor */
  direccionReceptor?: string | null;
  /** Comuna del receptor */
  comunaReceptor?: string | null;
  /** Ciudad del receptor */
  ciudadReceptor?: string | null;
  /** Teléfono del receptor */
  telefonoReceptor?: string | null;
  /** Correo del receptor */
  emailReceptor?: string | null;
  /** Ítems de la venta */
  items: Array<{
    /** Número de línea (1, 2, 3...) */
    nroLinDet: number;
    /** Código del producto (opcional) */
    codigo?: string | null;
    /** Tipo de código (opcional) */
    codigoTipo?: string | null;
    /** Nombre del producto */
    nombre: string;
    /** Descripción opcional */
    descripcion?: string | null;
    /** Cantidad */
    cantidad: number;
    /** Unidad de medida (opcional) */
    unidad?: string | null;
    /** Precio unitario neto */
    precio: number;
    /** Descuento por línea (monto) */
    descuentoMonto?: number;
    /** Indicador exento ("1" si es exento) */
    indicadorExento?: string | null;
  }>;
  /** Neto total */
  neto: number;
  /** Exento total */
  exento: number;
  /** IVA 19% */
  iva: number;
  /** Total */
  total: number;
  /** Forma de pago: 1=contado, 2=crédito, 3=sin costo */
  formaPago: "1" | "2" | "3";
  /** Glosa de pago (ej: "CREDITO 30 DIAS") */
  terminoPago?: string | null;
  /** Orden de compra (referencia tipo 801) */
  ordenCompra?: string | null;
  /** Guía de despacho (referencia tipo 52) */
  guiaDespacho?: string | null;
  /** N° HES */
  hesNumber?: string | null;
  /** Notas adicionales */
  notas?: string | null;
  /** RUT de quien envía (para boletas de terceros) */
  rutEnvia?: string | null;
};

/**
 * Escapa texto para incluirlo en XML.
 */
function xmlEscape(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formatea un RUT para el DTE (sin puntos, con guion, ej: "76056614-4").
 */
function formatRutForDte(rut: string | null | undefined): string {
  if (!rut) return "66666666-6";
  const normalized = normalizeRut(rut);
  // normalizeRut devuelve algo como "76056614-4" o "66666666-6"
  return normalized;
}

/**
 * Genera el XML DTE (sin firmar) como string.
 *
 * El XML incluye la declaración, el nodo DTE con Documento, Encabezado,
 * IdDoc, Emisor, Receptor, Totales, Detalle y TimbreElectronico vacío.
 */
export function generateDteXml(input: DteVentaInput): string {
  const tipoDteStr = String(input.tipoDte);
  const folioStr = String(input.folio).padStart(6, "0");

  const fechaHora = input.hora
    ? `${input.fecha}T${input.hora}`
    : `${input.fecha}T00:00:00`;

  const itemsXml = input.items
    .map(
      (item) => `
      <Detalle>
        <NroLinDet>${item.nroLinDet}</NroLinDet>
        ${item.codigo ? `<CdgItem><VlroCod>${xmlEscape(item.codigo)}</VlroCod>${item.codigoTipo ? `<TpoCod>${xmlEscape(item.codigoTipo)}</TpoCod>` : ""}</CdgItem>` : ""}
        <NmbItem>${xmlEscape(item.nombre)}</NmbItem>
        ${item.descripcion ? `<DscItem>${xmlEscape(item.descripcion)}</DscItem>` : ""}
        <QtyItem>${item.cantidad}</QtyItem>
        ${item.unidad ? `<UnmdItem>${xmlEscape(item.unidad)}</UnmdItem>` : ""}
        <PrcItem>${Math.round(item.precio)}</PrcItem>
        <MontoItem>${Math.round(
          item.precio * item.cantidad - (item.descuentoMonto ?? 0)
        )}</MontoItem>
        ${item.indicadorExento ? `<IndExe>${xmlEscape(item.indicadorExento)}</IndExe>` : ""}
        ${item.descuentoMonto && item.descuentoMonto > 0 ? `<DescuentoMonto>${Math.round(item.descuentoMonto)}</DescuentoMonto>` : ""}
      </Detalle>
    `,
    )
    .join("");

  const referenciasXml: string[] = [];
  if (input.ordenCompra) {
    referenciasXml.push(`
      <Referencia>
        <TpoDocRef>801</TpoDocRef>
        <FolioRef>${xmlEscape(input.ordenCompra)}</FolioRef>
      </Referencia>
    `);
  }
  if (input.guiaDespacho) {
    referenciasXml.push(`
      <Referencia>
        <TpoDocRef>52</TpoDocRef>
        <FolioRef>${xmlEscape(input.guiaDespacho)}</FolioRef>
      </Referencia>
    `);
  }

  const pagosXml = `
    <MntPagos>
      <FchPago>${input.fecha}</FchPago>
      <MntPago>${input.total}</MntPago>
    </MntPagos>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<DTE version="1.0">
  <Documento>
    <Encabezado>
      <IdDoc>
        <TipoDTE>${tipoDteStr}</TipoDTE>
        <Folio>${input.folio}</Folio>
        <FchEmis>${input.fecha}</FchEmis>
        <FormaPago>${input.formaPago}</FormaPago>
        ${input.terminoPago ? `<TermPagoGlosa>${xmlEscape(input.terminoPago)}</TermPagoGlosa>` : ""}
        ${pagosXml}
      </IdDoc>
      <Emisor>
        <RUTEmisor>${formatRutForDte(input.rutEmisor)}</RUTEmisor>
        <RznSoc>${xmlEscape(input.razonSocialEmisor)}</RznSoc>
        ${input.giroEmisor ? `<GiroEmis>${xmlEscape(input.giroEmisor)}</GiroEmis>` : ""}
        ${input.actecoEmisor ? `<Acteco>${xmlEscape(input.actecoEmisor)}</Acteco>` : ""}
        ${input.direccionEmisor ? `<DirOrigen>${xmlEscape(input.direccionEmisor)}</DirOrigen>` : ""}
        ${input.comunaEmisor ? `<CmnaOrigen>${xmlEscape(input.comunaEmisor)}</CmnaOrigen>` : ""}
        ${input.ciudadEmisor ? `<CiudadOrigen>${xmlEscape(input.ciudadEmisor)}</CiudadOrigen>` : ""}
        ${input.telefonoEmisor ? `<FonoEmisor>${xmlEscape(input.telefonoEmisor)}</FonoEmisor>` : ""}
        ${input.emailEmisor ? `<CorreoEmisor>${xmlEscape(input.emailEmisor)}</CorreoEmisor>` : ""}
        ${input.sucursalEmisor ? `<Sucursal>${xmlEscape(input.sucursalEmisor)}</Sucursal>` : ""}
      </Emisor>
      ${input.rutEnvia ? `<RecepEnvia><RUTEnvia>${formatRutForDte(input.rutEnvia)}</RUTEnvia></RecepEnvia>` : ""}
      <Receptor>
        <RUTRecep>${formatRutForDte(input.rutReceptor)}</RUTRecep>
        <RznSocRecep>${xmlEscape(input.razonSocialReceptor)}</RznSocRecep>
        ${input.giroReceptor ? `<GiroRecep>${xmlEscape(input.giroReceptor)}</GiroRecep>` : ""}
        ${input.direccionReceptor ? `<DirRecep>${xmlEscape(input.direccionReceptor)}</DirRecep>` : ""}
        ${input.comunaReceptor ? `<CmnaRecep>${xmlEscape(input.comunaReceptor)}</CmnaRecep>` : ""}
        ${input.ciudadReceptor ? `<CiudadRecep>${xmlEscape(input.ciudadReceptor)}</CiudadRecep>` : ""}
        ${input.telefonoReceptor ? `<FonoRecep>${xmlEscape(input.telefonoReceptor)}</FonoRecep>` : ""}
        ${input.emailReceptor ? `<CorreoRecep>${xmlEscape(input.emailReceptor)}</CorreoRecep>` : ""}
      </Receptor>
      <Totales>
        <MntNeto>${input.neto}</MntNeto>
        <MntExe>${input.exento}</MntExe>
        <IVA>${input.iva}</IVA>
        <MntTotal>${input.total}</MntTotal>
      </Totales>
    </Encabezado>
    <Detalle>
${itemsXml}
    </Detalle>
    ${referenciasXml.length > 0 ? `<Referencia>${referenciasXml.join("")}</Referencia>` : ""}
    <TED>
      <DD>
        <RUTEmisor>${formatRutForDte(input.rutEmisor)}</RUTEmisor>
        <RznSoc>${xmlEscape(input.razonSocialEmisor)}</RznSoc>
        <RUTRecep>${formatRutForDte(input.rutReceptor)}</RUTRecep>
        <RznSocRecep>${xmlEscape(input.razonSocialReceptor)}</RznSocRecep>
        <MntNeto>${input.neto}</MntNeto>
        <MntExe>${input.exento}</MntExe>
        <IVA>${input.iva}</IVA>
        <MntTotal>${input.total}</MntTotal>
      </DD>
    </TED>
    <TimbreElectronico></TimbreElectronico>
  </Documento>
</DTE>`;
}
