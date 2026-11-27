// PDF del estado de pago de un subcontrato: documento interno de control,
// con el desglose de anticipo y retención. No es un DTE ni una factura.

import { getActiveMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireObraContext } from "@/lib/obra-auth";
import { renderEstadoPagoPdf } from "@/lib/pdf/estado-pago-pdf";

export const runtime = "nodejs";

const ESTADOS: Record<string, string> = {
  BORRADOR: "Borrador",
  APROBADO: "Aprobado",
  PAGADO: "Pagado",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; epId: string }> },
): Promise<Response> {
  const ctx = await requireObraContext("subcontratos");
  const { id, epId } = await params;

  const [ep, active] = await Promise.all([
    db.estadoPagoSubcontrato.findFirst({
      where: { id: epId, subcontrato: { id, obraId: ctx.obra.id } },
      include: {
        detalle: {
          include: { partida: { select: { codigo: true, descripcion: true, unidad: true } } },
        },
        subcontrato: {
          include: { partner: { select: { name: true } } },
        },
      },
    }),
    getActiveMembership(),
  ]);
  if (!ep) return new Response("Estado de pago no encontrado", { status: 404 });

  const pdf = await renderEstadoPagoPdf({
    numero: ep.numero,
    periodo: ep.periodo,
    estado: ep.estado,
    estadoLabel: ESTADOS[ep.estado] ?? ep.estado,
    subtitulo: `Subcontrato SC-${String(ep.subcontrato.numero).padStart(4, "0")} · ${ep.subcontrato.partner.name}`,
    total: ep.total,
    anticipo: ep.anticipo,
    retencion: ep.retencion,
    createdAt: ep.createdAt,
    facturadoAt: null,
    obra: ctx.obra,
    empresa: active
      ? {
          name: active.company.name,
          rut: active.company.rut,
          address: active.company.address,
          commune: active.company.commune,
        }
      : null,
    aprobadoPor: null,
    items: [...ep.detalle]
      .sort((a, b) => a.partida.codigo.localeCompare(b.partida.codigo))
      .map((detalle) => ({
        codigo: detalle.partida.codigo,
        descripcion: detalle.partida.descripcion,
        unidad: detalle.partida.unidad,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario,
      })),
  });

  const nombre = `EP-SC-${String(ep.numero).padStart(4, "0")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
