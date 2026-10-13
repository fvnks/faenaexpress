import { NextResponse } from "next/server";

import { parseDteXml } from "@/lib/dte";
import { requireContext } from "@/lib/auth";
import { getSale } from "@/lib/sales";
import { generateFacturaPdf } from "@/lib/sii/pdf";

/**
 * GET /dashboard/ventas/[id]/pdf
 * Genera y descarga el PDF de una venta. El PDF se genera en memoria
 * (nunca se guarda en disco) y se entrega como descarga directa.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireContext("ventas");
  const { id } = await params;

  const sale = await getSale(ctx.company.id, id);
  if (!sale) {
    return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
  }

  // Si hay XML original guardado, parsear el detalle completo al vuelo.
  let items: { nombre: string; cantidad: string; precio: number; monto: number }[] | null = null;
  if (sale.xmlContent) {
    try {
      const parsed = parseDteXml(Buffer.from(sale.xmlContent, "utf8"));
      const doc = parsed.documentos.find((d) => d.folio === sale.documentNumber);
      if (doc?.itemsDetalle) items = doc.itemsDetalle;
    } catch { /* sin items si el XML no se puede re-parsear */ }
  }

  const pdf = await generateFacturaPdf({
    tipo: "venta",
    empresa: {
      name: ctx.company.name,
      rut: ctx.company.rut,
      address: ctx.company.address,
      city: ctx.company.city,
      email: ctx.company.email,
      phone: ctx.company.phone,
    },
    tercero: {
      name: sale.partner.name,
      rut: sale.partner.rut,
      address: sale.partner.address,
      city: null,
    },
    documento: {
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      date: sale.date,
      dueDate: sale.dueDate,
      status: sale.status,
      paymentDate: sale.paymentDate,
      notes: sale.notes,
    },
    montos: {
      netAmount: sale.netAmount,
      ivaAmount: sale.ivaAmount,
      totalAmount: sale.totalAmount,
      retentionAmount: sale.retentionAmount,
    },
    extras: {
      description: sale.description,
      salesperson: sale.salesperson?.name ?? null,
      purchaseOrder: sale.purchaseOrder,
      dispatchGuide: sale.dispatchGuide,
      hesNumber: sale.hesNumber,
    },
    items,
  });

  const filename = `venta_${sale.documentNumber ?? id}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
