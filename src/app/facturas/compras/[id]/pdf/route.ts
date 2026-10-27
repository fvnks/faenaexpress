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
import { getPurchase } from "@/lib/purchases";
import { getPosSiiConfigForUI } from "@/app/actions/pos-sii-caf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const ctx = await requireContext("compras");
  const { id } = await params;
  const purchase = await getPurchase(ctx.company.id, id);

  if (!purchase) {
    notFound();
  }

  // Cargar configuración SII para acteco y resolución.
  const configSii = await getPosSiiConfigForUI(ctx.company.id);
  const acteco = configSii?.acteco ?? "471101";
  const numeroResolucion = configSii?.resolucionSii
    ? parseInt(configSii.resolucionSii.replace(/\D/g, "")) || 0
    : 0;

  // Tipo 46 = Factura de Compra Electrónica.
  const tipoDte = 46;

  // Usar documentNumber como folio si es numérico.
  const folio =
    purchase.documentNumber && /^\d+$/.test(purchase.documentNumber)
      ? parseInt(purchase.documentNumber)
      : 1;

  const fechaEmision = purchase.date.toISOString().slice(0, 10);

  // Para factura de compra (tipo 46):
  // Emisor = la empresa (autofactura), Receptor = el proveedor.
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
    rutReceptor: normalizarRutSii(purchase.partner?.rut),
    razonSocialReceptor: purchase.partner?.name ?? "Proveedor",
    giroReceptor: undefined,
    direccionReceptor: undefined,
    comunaReceptor: undefined,
    ciudadReceptor: undefined,
    telefonoReceptor: undefined,
    correoReceptor: undefined,
    items: purchase.items.map((item: any) => ({
      nombre: item.name,
      cantidad: Number(item.quantity),
      precioUnitario: item.unitPrice,
      descuentoMonto: item.discount ?? 0,
      exento: false,
    })),
    formaPago: "contado",
    neto: Number(purchase.netAmount),
    exento: Number(purchase.exento),
    iva: Number(purchase.ivaAmount),
    total: Number(purchase.totalAmount),
    notas: purchase.notes ?? undefined,
  };

  // Generar el DTE con typeDte para obtener el TED (timbre) necesario para el PDF.
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
      // Si falla la emisión, el PDF aún se genera con TED vacío.
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
