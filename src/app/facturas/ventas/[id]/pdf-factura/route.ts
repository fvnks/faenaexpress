// Descarga el PDF de la factura (versión comercial, con la plantilla de
// easy-invoice-pdf vendorizada en `src/lib/pdf/vendor`, AGPL-3.0).
//
// Ojo: esta NO es la carta DTE (el documento tributario), que vive en
// `/facturas/ventas/[id]/pdf`. Esta es la factura que se le entrega al cliente:
// emisor, receptor, ítems, IVA, retenciones y saldo.
//
// Los totales salen de `lib/ledger.ts`: el PDF y la pantalla dicen lo mismo.

import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentTypeLabel } from "@/lib/labels";
import { documentoVentaPdf, type PlantillaFacturaPdf } from "@/lib/pdf/documento-pdf";
import { nombreArchivoPdf, renderPdfDocumento } from "@/lib/pdf/render";
import { getSale } from "@/lib/sales";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const ctx = await requireContext("ventas");
  const { id } = await params;
  const sale = await getSale(ctx.company.id, id);

  if (!sale) {
    notFound();
  }

  const pagos = await db.payment.findMany({
    where: { saleId: sale.id },
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

  const documento = await documentoVentaPdf({
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
    cliente: {
      name: sale.partner.name,
      rut: sale.partner.rut,
      address: sale.partner.address,
      city: sale.partner.city,
      commune: sale.partner.commune,
      giro: sale.partner.giro,
      email: sale.partner.email,
      phone: sale.partner.phone,
      notes: sale.partner.notes,
    },
    venta: {
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      date: sale.date,
      dueDate: sale.dueDate,
      netAmount: Number(sale.netAmount),
      ivaAmount: Number(sale.ivaAmount),
      totalAmount: Number(sale.totalAmount),
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentDate: sale.paymentDate,
      notes: sale.notes,
      abonado,
      // Documento de referencia (OC/guía) y vendedor: llegan al PDF para el
      // bloque de referencias y la línea de vendedor.
      ordenCompra: sale.purchaseOrder,
      guiaDespacho: sale.dispatchGuide,
      hesNumber: sale.hesNumber,
      vendedor: sale.salesperson?.name ?? null,
      items: sale.items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    },
    ventaExtra: {
      retentionAmount: Number(sale.retentionAmount),
      tasaIVA: sale.tasaIVA,
      confirming: Boolean(sale.confirmingAt),
      purchaseOrder: sale.purchaseOrder,
      dispatchGuide: sale.dispatchGuide,
      hesNumber: sale.hesNumber,
      description: sale.description,
      salesperson: sale.salesperson?.name,
      category: sale.category?.name,
      area: sale.area?.name,
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
    tipo: `factura-venta-${documentTypeLabel(sale.documentType).toLowerCase().replaceAll(" ", "-")}`,
    folio: sale.documentNumber,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
