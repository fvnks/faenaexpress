"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { normalizeRut } from "@/lib/rut";

/**
 * Relaciona una guía de despacho con la factura de venta que despacha.
 *
 * Cuando la guía viene del SII y su factura ya estaba importada, el vínculo
 * sale solo. Esto es para el resto de los casos: la factura se importó
 * después, o la guía se registró a mano.
 */
export async function linkDispatchGuideToSale(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  const destino = "/facturas/ventas/guias";

  if (!canWrite(ctx, "ventas")) {
    await setFlash("error", "No tienes permiso para editar las guías de despacho.");
    redirect(destino);
  }

  const guideId = String(formData.get("guideId") ?? "").trim();
  const saleId = String(formData.get("saleId") ?? "").trim();
  if (!guideId) redirect(destino);

  const guide = await db.dispatchGuide.findFirst({
    where: { id: guideId, companyId: ctx.company.id },
    select: { id: true, guideNumber: true, partnerId: true },
  });
  if (!guide) {
    await setFlash("error", "La guía no existe en esta empresa.");
    redirect(destino);
  }

  // Sin factura: se suelta el vínculo.
  if (!saleId) {
    await db.dispatchGuide.update({ where: { id: guide.id }, data: { saleId: null } });
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "DispatchGuide",
      entityId: guide.id,
      summary: `Desvinculó la guía N° ${guide.guideNumber} de su factura de venta.`,
    });
    revalidatePath(destino);
    revalidatePath("/facturas/ventas");
    redirect(destino);
  }

  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    select: { id: true, documentNumber: true, partnerId: true },
  });
  if (!sale) {
    await setFlash("error", "La factura no existe en esta empresa.");
    redirect(destino);
  }

  // Una guía se despacha al cliente de su factura: si los clientes difieren,
  // el vínculo estaría mal.
  if (sale.partnerId !== guide.partnerId) {
    const [uno, otro] = await Promise.all([
      db.partner.findUnique({ where: { id: guide.partnerId }, select: { name: true, rut: true } }),
      db.partner.findUnique({ where: { id: sale.partnerId }, select: { name: true, rut: true } }),
    ]);
    const mismoRut =
      uno?.rut && otro?.rut && normalizeRut(uno.rut) === normalizeRut(otro.rut);
    if (!mismoRut) {
      await setFlash(
        "error",
        "La guía y la factura son de clientes distintos",
        `La guía es de ${uno?.name ?? "otro cliente"} y la factura de ${otro?.name ?? "otro cliente"}. Una guía se despacha al cliente de su propia factura.`,
      );
      redirect(destino);
    }
  }

  await db.dispatchGuide.update({ where: { id: guide.id }, data: { saleId: sale.id } });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "DispatchGuide",
    entityId: guide.id,
    summary: `Relacionó la guía N° ${guide.guideNumber} con la factura N° ${sale.documentNumber ?? "—"}.`,
  });

  revalidatePath(destino);
  revalidatePath("/facturas/ventas");
  redirect(destino);
}
