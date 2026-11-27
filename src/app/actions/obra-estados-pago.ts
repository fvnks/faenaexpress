"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { computeTotal } from "@/lib/money";
import { recordObraAudit } from "@/lib/obra-audit";
import { normalizeRut } from "@/lib/rut";
import { incrementUsage } from "@/lib/plans";
import { getActiveMembership as membership } from "@/lib/auth";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { puedeAprobarAvance } from "@/lib/obra-permissions";
import { totalPartida } from "@/lib/obra-budget";
import type { ObraActionState } from "./obra-avance";

/** Genera un estado de pago desde las cubicaciones aprobadas no facturadas. */
export async function generarEstadoPago(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("estadosPago");
  if (!obraCanWrite(ctx, "estadosPago")) return { error: "Tu rol no permite armar estados de pago." };

  const periodo = String(formData.get("periodo") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: "Indica el período (YYYY-MM)." };

  const yaGenerado = await db.estadoPago.findFirst({
    where: { obraId: ctx.obra.id, periodo },
    select: { id: true },
  });
  if (yaGenerado) return { error: `Ya existe un estado de pago para ${periodo}.` };

  // Partidas con avance aprobado que aún no se facturó en otro EP.
  const cubicaciones = await db.cubicacion.findMany({
    where: {
      aprobada: true,
      partida: { obraId: ctx.obra.id, estado: "VIGENTE" },
    },
    select: {
      partidaId: true,
      cantidad: true,
      partida: { select: { codigo: true, descripcion: true, precioUnitario: true } },
    },
  });

  const facturado = await db.estadoPagoPartida.groupBy({
    by: ["partidaId"],
    where: { estadoPago: { obraId: ctx.obra.id, estado: { not: "BORRADOR" } } },
    _sum: { cantidad: true },
  });
  const yaFacturadoPorPartida = new Map(facturado.map((f) => [f.partidaId, f._sum.cantidad ?? 0]));

  const porPartida = new Map<string, number>();
  for (const c of cubicaciones) {
    const consumido = yaFacturadoPorPartida.get(c.partidaId) ?? 0;
    const disponible = c.cantidad - consumido;
    if (disponible > 0.001) {
      porPartida.set(c.partidaId, (porPartida.get(c.partidaId) ?? 0) + disponible);
    }
  }
  if (porPartida.size === 0) {
    return { error: "No hay avance aprobado pendiente de facturar en ese período." };
  }

  const[MAX, ultimo] = await Promise.all([
    db.estadoPago.aggregate({ where: { obraId: ctx.obra.id }, _max: { numero: true } }),
    db.estadoPago.findFirst({ where: { obraId: ctx.obra.id }, orderBy: { numero: "desc" }, select: { numero: true } }),
  ]);
  void MAX;
  const numero = (ultimo?.numero ?? 0) + 1;

  const partidas = await db.partida.findMany({
    where: { id: { in: [...porPartida.keys()] } },
    select: { id: true, codigo: true, descripcion: true, precioUnitario: true },
  });
  const porId = new Map(partidas.map((p) => [p.id, p]));

  const detalle = [...porPartida.entries()]
    .map(([partidaId, cantidad]) => {
      const p = porId.get(partidaId)!;
      return {
        partidaId,
        cantidad,
        precioUnitario: p.precioUnitario,
        total: totalPartida(cantidad, p.precioUnitario),
      };
    })
    .sort((a, b) => a.partidaId.localeCompare(b.partidaId));
  const total = detalle.reduce((s, d) => s + d.total, 0);

  await db.estadoPago.create({
    data: {
      obraId: ctx.obra.id,
      numero,
      periodo,
      total,
      createdById: ctx.user.id,
      detalle: { create: detalle },
    },
  });

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "EstadoPago",
    summary: `Generó el estado de pago EP-${String(numero).padStart(4, "0")} de ${periodo} por ${formatCLPLocal(total)}.`,
  });

  revalidatePath("/obras/estados-pago");
  revalidatePath("/obras/avance");
  revalidatePath("/obras");
  return { ok: true, message: `Estado de pago EP-${String(numero).padStart(4, "0")} generado por ${formatCLPLocal(total)}.` };
}

function formatCLPLocal(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

/** Aprueba un EP (paso previo a facturarlo). */
export async function aprobarEstadoPago(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("estadosPago");
  if (!puedeAprobarAvance(ctx.role)) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.estadoPago.updateMany({
    where: { id, obraId: ctx.obra.id, estado: "BORRADOR" },
    data: { estado: "APROBADO", aprobadoById: ctx.user.id },
  });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "EstadoPago",
    entityId: id,
    summary: "Aprobó un estado de pago.",
  });
  revalidatePath("/obras/estados-pago");
}

/** Factura el EP: crea la Sale en Facturas y la vincula (saleId UNIQUE). */
export async function facturarEstadoPago(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("estadosPago");
  if (!obraCanWrite(ctx, "estadosPago")) return { error: "Tu rol no permite facturar estados de pago." };

  const id = String(formData.get("id") ?? "");
  const activeMembership = await membership();
  if (!activeMembership) return { error: "No tienes una empresa activa para facturar." };
  const company = await db.company.findUnique({
    where: { id: activeMembership.company.id },
    select: { id: true, ivaRate: true, organizationId: true },
  });
  if (!company) return { error: "No tienes una empresa activa para facturar." };

  const ep = await db.estadoPago.findFirst({
    where: { id, obraId: ctx.obra.id, estado: "APROBADO" },
    include: { detalle: true, obra: true },
  });
  if (!ep) return { error: "El estado de pago no existe o no está aprobado." };
  if (ep.saleId) return { error: "Este estado de pago ya fue facturado." };

  // El mandante es el receptor: lo buscamos por RUT o creamos uno genérico.
  const rut = ep.obra.rutMandante ? normalizeRut(ep.obra.rutMandante) : "";
  let partner = rut
    ? await db.partner.findFirst({ where: { companyId: company.id, rut }, select: { id: true } })
    : null;
  if (!partner) {
    partner = await db.partner.create({
      data: {
        companyId: company.id,
        name: ep.obra.mandante || ep.obra.name,
        rut: rut || null,
        type: "CUSTOMER",
      },
      select: { id: true },
    });
  }

  // Folio propio de la obra: EP-0001. Único por empresa en Sale.
  const documentNumber = `EP-${String(ep.numero).padStart(4, "0")}-${ep.obra.code ?? ctx.obra.id.slice(-4)}`;
  const existente = await db.sale.findFirst({
    where: { companyId: company.id, documentNumber },
    select: { id: true },
  });
  if (existente) {
    await db.estadoPago.update({ where: { id: ep.id }, data: { saleId: existente.id, estado: "FACTURADO", facturadoAt: new Date() } });
    revalidatePath("/obras/estados-pago");
    return { ok: true, message: "Ya estaba facturado; se vinculó la venta existente." };
  }

  const tasa = Number(company.ivaRate ?? 19) / 100;
  const neto = Math.round(ep.total / (1 + tasa));
  const iva = Math.round(ep.total - neto);
  const fecha = new Date(`${ep.periodo}-01T12:00:00.000Z`);

  const partidasDelDetalle = new Map(
    (
      await db.partida.findMany({
        where: { id: { in: ep.detalle.map((d) => d.partidaId) } },
        select: { id: true, descripcion: true },
      })
    ).map((p) => [p.id, p]),
  );

  const resultado = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        companyId: company.id,
        createdById: ctx.user.id,
        partnerId: partner!.id,
        documentType: "INVOICE",
        documentNumber,
        date: fecha,
        netAmount: neto,
        ivaAmount: iva,
        totalAmount: computeTotal(neto, iva),
        retentionAmount: 0,
        status: "PENDING",
        notes: `Estado de pago EP-${String(ep.numero).padStart(4, "0")} de la obra ${ep.obra.name}.`,
      },
      select: { id: true },
    });

    const items = ep.detalle.map((d, index) => {
      const p = partidasDelDetalle.get(d.partidaId);
      return {
        saleId: sale.id,
        companyId: company.id,
        name: p?.descripcion ?? `Partida ${d.partidaId}`,
        quantity: d.cantidad,
        unitPrice: d.precioUnitario,
        amount: d.total,
        position: index,
      };
    });
    if (items.length > 0) await tx.saleItem.createMany({ data: items });

    // Marcar el EP como facturado en la misma transacción: evita doble facturación.
    const marcado = await tx.estadoPago.updateMany({
      where: { id: ep.id, saleId: null },
      data: { saleId: sale.id, estado: "FACTURADO", facturadoAt: new Date() },
    });
    if (marcado.count === 0) throw new Error("El estado de pago ya fue facturado por otra solicitud.");
    return { saleId: sale.id };
  });

  // El contador de documentos del mes (la venta entra al libro de Facturas).
  if (company.organizationId) await incrementUsage(company.organizationId, { documents: 1 });

  await recordAudit(
    { company: { id: company.id }, user: { id: ctx.user.id, name: ctx.user.name } },
    {
      action: "CREATE",
      entityType: "Sale",
      entityId: resultado.saleId,
      summary: `Facturó el estado de pago EP-${String(ep.numero).padStart(4, "0")} de «${ep.obra.name}».`,
    },
  );

  revalidatePath("/obras/estados-pago");
  revalidatePath("/facturas/ventas");
  revalidatePath("/facturas");
  return { ok: true, message: `Facturado como ${documentNumber}. Disponible en Ventas y su PDF.` };
}
