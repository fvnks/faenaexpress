import { NextResponse } from "next/server";

import { parseDteXml } from "@/lib/dte";
import { requireContext } from "@/lib/auth";
import { getSale } from "@/lib/sales";
import { generateFacturaPdf } from "@/lib/sii/pdf";

function asDate(v: string | null): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null;
}

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

  // Si hay XML original guardado, extraemos TODO desde el DTE.
  let parsedItems: { codigo?: string; nombre: string; cantidad: string; precio: number; monto: number }[] | null = null;
  let parsedDoc: ReturnType<typeof parseDteXml>["documentos"][number] | null = null;
  if (sale.xmlContent) {
    try {
      const parsed = parseDteXml(sale.xmlContent);
      parsedDoc =
        parsed.documentos.find((d) => d.folio === sale.documentNumber) ??
        parsed.documentos[0] ??
        null;
      if (parsedDoc?.itemsDetalle) {
        parsedItems = parsedDoc.itemsDetalle.map((it) => ({
          codigo: undefined,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio: it.precio,
          monto: it.monto,
        }));
      }
    } catch {
      /* sin XML válido: cae a los datos de la BD */
    }
  }

  const pdf = await generateFacturaPdf({
    tipo: "venta",
    empresa: {
      name: parsedDoc?.razonSocialEmisor ?? ctx.company.name,
      rut: parsedDoc?.rutEmisor ?? ctx.company.rut,
      address: parsedDoc?.direccionEmisor ?? ctx.company.address,
      city: parsedDoc?.ciudadEmisor ?? ctx.company.city,
      commune: parsedDoc?.comunaEmisor ?? ctx.company.commune,
      email: parsedDoc?.emailEmisor ?? ctx.company.email,
      phone: parsedDoc?.telefonoEmisor ?? ctx.company.phone,
      giro: parsedDoc?.giroEmisor ?? ctx.company.giro,
    },
    tercero: {
      name: parsedDoc?.razonSocialReceptor ?? sale.partner.name,
      rut: parsedDoc?.rutReceptor ?? sale.partner.rut,
      address: parsedDoc?.direccionReceptor ?? sale.partner.address,
      city: parsedDoc?.ciudadReceptor ?? sale.partner.city,
      commune: parsedDoc?.comunaReceptor ?? sale.partner.commune,
      giro: parsedDoc?.giroReceptor ?? sale.partner.giro,
    },
    documento: {
      documentType: sale.documentType,
      documentNumber: parsedDoc?.folio ?? sale.documentNumber,
      date: asDate(parsedDoc?.fecha ?? null) ?? sale.date,
      dueDate: asDate(parsedDoc?.vencimiento ?? null) ?? sale.dueDate,
      status: sale.status,
      paymentDate: sale.paymentDate,
      notes: sale.notes,
      formaPago: parsedDoc?.formaPago ?? null,
    },
    montos: {
      netAmount: parsedDoc?.neto ?? sale.netAmount,
      ivaAmount: parsedDoc?.iva ?? sale.ivaAmount,
      totalAmount: parsedDoc?.total ?? sale.totalAmount,
      exento: parsedDoc?.exento ?? 0,
      retentionAmount: sale.retentionAmount ?? 0,
    },
    extras: {
      description: sale.description,
      salesperson: sale.salesperson?.name ?? null,
      purchaseOrder: parsedDoc?.ordenCompra ?? sale.purchaseOrder,
      dispatchGuide: parsedDoc?.guiaDespacho ?? sale.dispatchGuide,
      hesNumber: parsedDoc?.hesNumber ?? sale.hesNumber,
    },
    items: parsedItems ?? (sale.items?.length
      ? sale.items.map((it) => ({
          codigo: it.product?.sku ?? undefined,
          nombre: it.name ?? it.product?.name ?? "Ítem",
          cantidad: String(Number(it.quantity ?? 1)),
          precio: Number(it.unitPrice ?? 0),
          monto: Number(it.amount ?? 0),
        }))
      : null),
  });

  const filename = `venta_${parsedDoc?.folio ?? sale.documentNumber ?? id}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}