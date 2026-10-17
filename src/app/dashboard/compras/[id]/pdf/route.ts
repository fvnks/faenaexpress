import { NextResponse } from "next/server";

import { parseDteXml } from "@/lib/dte";
import { requireContext } from "@/lib/auth";
import { getPurchase } from "@/lib/purchases";
import { generateFacturaPdf } from "@/lib/sii/pdf";

function asDate(v: string | null): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null;
}

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

  // Si hay XML original guardado, extraemos TODO (emisor/receptor, montos,
  // ítems, referencias, forma de pago) desde el DTE.
  let parsedItems: { codigo?: string; nombre: string; cantidad: string; precio: number; monto: number }[] | null = null;
  let parsedDoc: ReturnType<typeof parseDteXml>["documentos"][number] | null = null;
  if (purchase.xmlContent) {
    try {
      const parsed = parseDteXml(purchase.xmlContent);
      parsedDoc =
        parsed.documentos.find((d) => d.folio === purchase.documentNumber) ??
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
    tipo: "compra",
    empresa: {
      name: parsedDoc?.razonSocialEmisor ?? purchase.partner.name,
      rut: parsedDoc?.rutEmisor ?? purchase.partner.rut,
      address: parsedDoc?.direccionEmisor ?? purchase.partner.address,
      city: parsedDoc?.ciudadEmisor ?? purchase.partner.city,
      commune: parsedDoc?.comunaEmisor ?? purchase.partner.commune,
      email: parsedDoc?.emailEmisor ?? purchase.partner.email,
      phone: parsedDoc?.telefonoEmisor ?? purchase.partner.phone,
      giro: parsedDoc?.giroEmisor ?? purchase.partner.giro,
    },
    tercero: {
      name: parsedDoc?.razonSocialReceptor ?? ctx.company.name,
      rut: parsedDoc?.rutReceptor ?? ctx.company.rut,
      address: parsedDoc?.direccionReceptor ?? ctx.company.address,
      city: parsedDoc?.ciudadReceptor ?? ctx.company.city,
      commune: parsedDoc?.comunaReceptor ?? ctx.company.commune,
      giro: parsedDoc?.giroReceptor ?? ctx.company.giro,
    },
    documento: {
      documentType: purchase.documentType,
      documentNumber: parsedDoc?.folio ?? purchase.documentNumber,
      date: asDate(parsedDoc?.fecha ?? null) ?? purchase.date,
      dueDate: asDate(parsedDoc?.vencimiento ?? null) ?? purchase.dueDate,
      status: purchase.status,
      paymentDate: purchase.paymentDate,
      notes: purchase.notes,
      formaPago: parsedDoc?.formaPago ?? purchase.formaPago ?? null,
    },
    montos: {
      netAmount: parsedDoc?.neto ?? purchase.netAmount,
      ivaAmount: parsedDoc?.iva ?? purchase.ivaAmount,
      totalAmount: parsedDoc?.total ?? purchase.totalAmount,
      exento: parsedDoc?.exento ?? 0,
      retentionAmount: 0,
    },
    extras: {
      description: purchase.description,
      purchaseOrder: parsedDoc?.ordenCompra ?? purchase.purchaseOrder,
      dispatchGuide: parsedDoc?.guiaDespacho ?? purchase.dispatchGuide,
      hesNumber: parsedDoc?.hesNumber ?? purchase.hesNumber,
    },
    items: parsedItems ?? (purchase.items?.length
      ? purchase.items.map((it) => ({
          codigo: it.product?.sku ?? undefined,
          nombre: it.name ?? it.product?.name ?? "Ítem",
          cantidad: String(Number(it.quantity ?? 1)),
          precio: Number(it.unitPrice ?? 0),
          monto: Number(it.amount ?? 0),
        }))
      : null),
  });

  const filename = `compra_${parsedDoc?.folio ?? purchase.documentNumber ?? id}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}