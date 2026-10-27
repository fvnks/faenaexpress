import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";
import {
  construirDocumentoDTE,
  construirRepresentacionImprimible,
  DatosDteVenta,
  emitirDteTypeDte,
  generarPdfCartaDte,
  normalizarRutSii,
  nombreArchivoDte,
} from "@/lib/dte-typedte";
import { getSale } from "@/lib/sales";
import { getPosSiiConfigForUI } from "@/app/actions/pos-sii-caf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const ctx = await requireContext("ventas");
  const { id } = await params;
  const sale = await getSale(ctx.company.id, id);

  if (!sale) {
    notFound();
  }

  // Cargar configuración SII para acteco y resolución.
  const configSii = await getPosSiiConfigForUI(ctx.company.id);
  const acteco = configSii?.acteco ?? "471101";
  const numeroResolucion = configSii?.resolucionSii
    ? parseInt(configSii.resolucionSii.replace(/\D/g, "")) || 0
    : 0;

  // Determinar tipo de DTE: boleta (39) para consumidor final, factura (33) si tiene RUT.
  const esConsumidorFinal =
    !sale.partner ||
    sale.partner.rut === "66666666-6" ||
    sale.partner.rut === null;
  const tipoDte = esConsumidorFinal ? 39 : 33;

  // Usar el folio del DTE existente si lo hay, o uno secuencial basado en documentNumber.
  const folio =
    sale.documentNumber && /^\d+$/.test(sale.documentNumber)
      ? parseInt(sale.documentNumber)
      : 1;

  const fechaEmision = sale.date.toISOString().slice(0, 10);

  const datos: DatosDteVenta = {
    tipoDte,
    folio,
    fechaEmision,
    rutEmisor: ctx.company.rut ?? "",
    razonSocialEmisor: ctx.company.name,
    giroEmisor: ctx.company.giro ?? "",
    actividadesEconomicas: [Number(acteco)],
    direccionEmisor: ctx.company.address ?? "",
    comunaEmisor: ctx.company.commune ?? "",
    ciudadEmisor: ctx.company.city ?? undefined,
    telefonoEmisor: ctx.company.phone ?? undefined,
    correoEmisor: ctx.company.email ?? undefined,
    rutReceptor: normalizarRutSii(sale.partner?.rut),
    razonSocialReceptor: sale.partner?.name ?? "Consumidor final",
    giroReceptor: undefined,
    direccionReceptor: undefined,
    comunaReceptor: undefined,
    ciudadReceptor: undefined,
    telefonoReceptor: undefined,
    correoReceptor: undefined,
    items: sale.items.map((item: any) => ({
      nombre: item.name,
      cantidad: Number(item.quantity),
      precioUnitario: item.unitPrice,
      descuentoMonto: item.discount ?? 0,
      exento: false,
    })),
    formaPago: "contado",
    neto: Number(sale.netAmount),
    exento: 0,
    iva: Number(sale.ivaAmount),
    total: Number(sale.totalAmount),
    notas: sale.notes ?? undefined,
  };

  // Generar el DTE con typeDte para obtener el TED (timbre) necesario para el PDF.
  // Usamos un CAF temporal vacío si no hay configuración SII: el PDF aún se puede
  // generar con los datos del documento, aunque el timbre estará vacío.
  let dteGenerado: { xml: string; totales: any; ted: any } | null = null;
  if (configSii?.certificadoPfx) {
    try {
      const certificadoPfx = Buffer.from(configSii.certificadoPfx, "base64");
      const cafXml = `<?xml version="1.0" encoding="ISO-8859-1"?><CAF><DA><RE>00000000-0</RE><RS>CAF Temporal</RS><TD>${tipoDte}</TD><RNG><D>1</D><H>99999999</H><FA>2020-01-01</FA><FH>2030-12-31</FH></DA><FRMT></FRMT></CAF>`;
      dteGenerado = emitirDteTypeDte(
        construirDocumentoDTE(datos),
        cafXml,
        certificadoPfx,
        configSii.certificadoPass ?? undefined,
        `${fechaEmision}T00:00:00`,
      );
    } catch {
      // Si falla la emisión (sin credenciales reales), el PDF aún se genera con TED vacío.
    }
  }

  const representacion = construirRepresentacionImprimible(
    datos,
    {
      neto: datos.neto,
      exento: datos.exento,
      iva: datos.iva,
      total: datos.total,
    },
    dteGenerado ? dteGenerado.ted : {},
    "SANTIAGO ORIENTE",
    numeroResolucion,
    new Date().getFullYear(),
  );

  try {
    const pdfBuffer = await generarPdfCartaDte(representacion);
    const nombreArchivo = nombreArchivoDte(tipoDte, folio);

    return new Response(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new Response(
      JSON.stringify({ error: `No se pudo generar el PDF: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
