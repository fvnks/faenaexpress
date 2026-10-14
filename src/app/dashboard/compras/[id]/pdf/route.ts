import { NextResponse } from "next/server";

import { parseDteXml } from "@/lib/dte";
import { requireContext } from "@/lib/auth";
import { getPurchase } from "@/lib/purchases";
import { generateFacturaPdf } from "@/lib/sii/pdf";

/**
 * GET /dashboard/compras/[id]/pdf
 * Genera y descarga el PDF de una compra. El PDF se genera en memoria
 * (nunca se guarda en disco) y se entrega como descarga directa.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireContext("compras");
  const { id } = await params;

  const purchase = await getPurchase(ctx.company.id, id);
  if (!purchase) {
    return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });
  }

  // Si hay XML original guardado, parsear el detalle completo al vuelo.
  let items: { codigo?: string; nombre: string; cantidad: string; precio: number; monto: number }[] | null = null;
  if (purchase.xmlContent) {
    try {
      const parsed = parseDteXml(Buffer.from(purchase.xmlContent, "utf8"));
      const doc = parsed.documentos.find((d) => d.folio === purchase.documentNumber);
      if (doc?.itemsDetalle) items = doc.itemsDetalle;
    } catch { /* sin items si el XML no se puede re-parsear */ }
  }

  const pdf = await generateFacturaPdf({
    tipo: "compra",
    empresa: {
      name: ctx.company.name,
      rut: ctx.company.rut,
      address: ctx.company.address,
      city: ctx.company.city,
      commune: ctx.company.commune,
      email: ctx.company.email,
      phone: ctx.company.phone,
      giro: ctx.company.giro,
    },
    tercero: {
      name: purchase.partner.name,
      rut: purchase.partner.rut,
      address: purchase.partner.address,
      city: purchase.partner.city,
      commune: purchase.partner.commune,
      giro: purchase.partner.giro,
    },
    documento: {
      documentType: purchase.documentType,
      documentNumber: purchase.documentNumber,
      date: purchase.date,
      dueDate: purchase.dueDate,
      status: purchase.status,
      paymentDate: purchase.paymentDate,
      notes: purchase.notes,
      formaPago: purchase.formaPago ?? null,
    },
    montos: {
      netAmount: purchase.netAmount,
      ivaAmount: purchase.ivaAmount,
      totalAmount: purchase.totalAmount,
    },
    extras: {
      description: purchase.description,
      purchaseOrder: purchase.purchaseOrder,
      dispatchGuide: purchase.dispatchGuide,
      hesNumber: purchase.hesNumber,
    },
    items,
  });

  const filename = `compra_${purchase.documentNumber ?? id}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}