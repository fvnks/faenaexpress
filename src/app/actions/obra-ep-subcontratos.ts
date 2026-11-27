"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { totalPartida } from "@/lib/obra-budget";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

/**
 * Genera un EP de subcontrato desde el avance aprobado de sus partidas.
 * El anticipo se descuenta una sola vez (primer EP) y la retención en cada uno.
 * Las cantidades ya incluidas en EP anteriores no se vuelven a cobrar.
 */
export async function generarEpSubcontrato(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("subcontratos");
  if (!obraCanWrite(ctx, "subcontratos")) {
    return { error: "Tu rol no permite generar estados de pago de subcontratos." };
  }

  const subcontratoId = String(formData.get("subcontratoId") ?? "");
  const periodo = String(formData.get("periodo") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: "Indica el período (YYYY-MM)." };

  const subcontrato = await db.subcontrato.findFirst({
    where: { id: subcontratoId, obraId: ctx.obra.id, estado: "VIGENTE" },
    include: { partidas: true, partner: { select: { name: true } } },
  });
  if (!subcontrato) return { error: "El subcontrato no existe o no está vigente." };

  const yaGenerado = await db.estadoPagoSubcontrato.findFirst({
    where: { subcontratoId, periodo },
    select: { id: true },
  });
  if (yaGenerado) return { error: `Ya existe un EP para ${periodo} en este subcontrato.` };

  const ids = subcontrato.partidas.map((p) => p.partidaId);
  const [cubicaciones, facturado, totalEps] = await Promise.all([
    db.cubicacion.findMany({
      where: { aprobada: true, partidaId: { in: ids }, partida: { obraId: ctx.obra.id } },
      select: { partidaId: true, cantidad: true },
    }),
    db.estadoPagoSubcontratoPartida.groupBy({
      by: ["partidaId"],
      where: { ep: { subcontratoId } },
      _sum: { cantidad: true },
    }),
    db.estadoPagoSubcontrato.count({ where: { subcontratoId } }),
  ]);

  const cubicado = new Map<string, number>();
  for (const c of cubicaciones) {
    cubicado.set(c.partidaId, (cubicado.get(c.partidaId) ?? 0) + c.cantidad);
  }
  const yaCobrado = new Map(facturado.map((f) => [f.partidaId, f._sum.cantidad ?? 0]));

  const detalle = subcontrato.partidas
    .map((asignada) => {
      const disponible = (cubicado.get(asignada.partidaId) ?? 0) - (yaCobrado.get(asignada.partidaId) ?? 0);
      const cantidad = Math.min(Math.max(disponible, 0), asignada.cantidad);
      return {
        partidaId: asignada.partidaId,
        cantidad,
        precioUnitario: asignada.precioUnitario,
        total: totalPartida(cantidad, asignada.precioUnitario),
      };
    })
    .filter((linea) => linea.cantidad > 0.001);

  if (detalle.length === 0) {
    return { error: "No hay avance aprobado pendiente de pagar en este subcontrato." };
  }

  const bruto = detalle.reduce((sum, linea) => sum + linea.total, 0);
  const anticipo = totalEps === 0 ? Math.min(subcontrato.anticipo, bruto) : 0;
  const retencion = Math.round((bruto * subcontrato.retencionPct) / 100 * 100) / 100;
  const total = Math.round((bruto - anticipo - retencion) * 100) / 100;
  const ultimo = await db.estadoPagoSubcontrato.findFirst({
    where: { subcontratoId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  await db.estadoPagoSubcontrato.create({
    data: {
      subcontratoId,
      numero: (ultimo?.numero ?? 0) + 1,
      periodo,
      estado: "BORRADOR",
      bruto,
      anticipo,
      retencion,
      total,
      createdById: ctx.user.id,
      detalle: { create: detalle },
    },
  });

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "EstadoPagoSubcontrato",
    summary: `Generó un EP para ${subcontrato.partner.name} en ${periodo} por ${total}.`,
  });
  revalidatePath("/obras/subcontratos");
  revalidatePath(`/obras/subcontratos/${subcontratoId}`);
  return { ok: true, message: "Estado de pago generado." };
}

/** Aprueba un EP de subcontrato (paso previo al pago). */
export async function aprobarEpSubcontrato(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("subcontratos");
  if (!obraCanWrite(ctx, "subcontratos")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const ep = await db.estadoPagoSubcontrato.findFirst({
    where: { id, subcontrato: { obraId: ctx.obra.id }, estado: "BORRADOR" },
    select: { id: true, subcontratoId: true },
  });
  if (!ep) return;
  await db.estadoPagoSubcontrato.update({ where: { id }, data: { estado: "APROBADO" } });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "EstadoPagoSubcontrato",
    entityId: id,
    summary: "Aprobó un estado de pago de subcontrato.",
  });
  revalidatePath(`/obras/subcontratos/${ep.subcontratoId}`);
  revalidatePath("/obras/subcontratos");
}

/** Paga un EP aprobado y genera su CostoObra (UNIQUE evita contarlo dos veces). */
export async function pagarEpSubcontrato(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("subcontratos");
  if (!obraCanWrite(ctx, "subcontratos")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const ep = await db.estadoPagoSubcontrato.findFirst({
    where: { id, subcontrato: { obraId: ctx.obra.id }, estado: "APROBADO" },
    select: { id: true, total: true, periodo: true, subcontrato: { select: { id: true, obraId: true, partner: { select: { name: true } } } } },
  });
  if (!ep) return;

  await db.$transaction(async (tx) => {
    await tx.estadoPagoSubcontrato.update({ where: { id }, data: { estado: "PAGADO" } });
    await tx.costoObra.upsert({
      where: { sourceType_sourceId: { sourceType: "SUBCONTRACT", sourceId: id } },
      create: {
        obraId: ep.subcontrato.obraId,
        partidaId: null,
        sourceType: "SUBCONTRACT",
        sourceId: id,
        descripcion: `EP subcontrato · ${ep.subcontrato.partner.name}`.slice(0, 300),
        monto: ep.total,
        fecha: new Date(`${ep.periodo}-01T12:00:00.000Z`),
      },
      update: { monto: ep.total },
    });
  });

  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "EstadoPagoSubcontrato",
    entityId: id,
    summary: `Pagó un EP de ${ep.subcontrato.partner.name} por ${ep.total}.`,
  });
  revalidatePath(`/obras/subcontratos/${ep.subcontrato.id}`);
  revalidatePath("/obras/subcontratos");
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras/reportes");
  revalidatePath("/obras");
}
