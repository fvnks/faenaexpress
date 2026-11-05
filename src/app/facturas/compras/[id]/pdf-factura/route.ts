// Descarga el PDF de la factura de compra (versión comercial, con la plantilla de
// easy-invoice-pdf vendorizada en `src/lib/pdf/vendor`, AGPL-3.0).
//
// Ojo: esta NO es la carta DTE (el documento tributario), que vive en
// `/facturas/compras/[id]/pdf`. Esta es la factura tal como la entrega el proveedor:
// emisor (el proveedor), receptor (la empresa), ítems, IVA, exento, recargo y saldo.
//
// Los totales salen de `lib/ledger.ts`: el PDF y la pantalla dicen lo mismo.

import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentTypeLabel } from "@/lib/labels";
import { documentoCompraPdf, type PlantillaFacturaPdf } from "@/lib/pdf/documento-pdf";
import { nombreArchivoPdf, renderPdfDocumento } from "@/lib/pdf/render";
import { getPurchase } from "@/lib/purchases";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const ctx = await requireContext("compras");
  const { id } = await params;
  const purchase = await getPurchase(ctx.company.id, id);

  if (!purchase) {
    notFound();
  }

  const pagos = await db.payment.findMany({
    where: { purchaseId: purchase.id },
    select: { amount: true },
  });
  const abonado = pagos.reduce((a, p) => a + Number(p.amount), 0);

  // Obtener el logo y plantilla de factura configurados para la empresa
  const [facturaConfig, plantillaFactura] = await Promise.all([
    db.facturaConfiguracion.findUnique({
      where: { companyId: ctx.company.id },
      select: { logo: true, mostrarLogo: true },
    }),
    db.facturaPlantilla.findFirst({
      where: { companyId: ctx.company.id, esActiva: true },
      orderBy: { esPredeterminada: "desc" },
    }),
  ]);

  const documento = await documentoCompraPdf({
    empresa: {
      name: ctx.company.name,
      rut: ctx.company.rut,
      address: ctx.company.address,
      city: ctx.company.city,
      commune: ctx.company.commune,
      giro: ctx.company.giro,
      email: ctx.company.email,
      phone: ctx.company.phone,
      ivaRate: ctx.company.ivaRate,
      logo: facturaConfig?.logo ?? null,
    },
    proveedor: {
      name: purchase.partner.name,
      rut: purchase.partner.rut,
      address: purchase.partner.address,
      city: purchase.partner.city,
      commune: purchase.partner.commune,
      giro: purchase.partner.giro,
      email: purchase.partner.email,
      phone: purchase.partner.phone,
      notes: purchase.partner.notes,
    },
    compra: {
      documentType: purchase.documentType,
      documentNumber: purchase.documentNumber,
      date: purchase.date,
      dueDate: purchase.dueDate,
      netAmount: Number(purchase.netAmount),
      ivaAmount: Number(purchase.ivaAmount),
      totalAmount: Number(purchase.totalAmount),
      status: purchase.status,
      paymentMethod: purchase.paymentMethod,
      paymentDate: purchase.paymentDate,
      notes: purchase.notes,
      abonado,
      // Documento de referencia (OC/guía) y HES: llegan al PDF para el bloque
      // de referencias.
      ordenCompra: purchase.purchaseOrder,
      guiaDespacho: purchase.dispatchGuide,
      hesNumber: purchase.hesNumber,
      items: purchase.items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    },
    compraExtra: {
      exento: Number(purchase.exento),
      ivaRecargo: Number(purchase.ivaRecargo),
      tasaIVA: purchase.tasaIVA,
      description: purchase.description,
      category: purchase.category?.name,
      area: purchase.area?.name,
    },
    plantillaFactura: plantillaFactura
      ? {
          nombre: plantillaFactura.nombre,
          configuracion: (plantillaFactura.configuracion ??
            {}) as PlantillaFacturaPdf["configuracion"],
        }
      : null,
  });

  const pdf = await renderPdfDocumento(documento);
  const nombre = nombreArchivoPdf({
    tipo: `factura-compra-${documentTypeLabel(purchase.documentType).toLowerCase().replaceAll(" ", "-")}`,
    folio: purchase.documentNumber,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
