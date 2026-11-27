// PDF imprimible del estado de pago: documento interno de control del avance,
// NO un DTE. El cobro se emite como venta en Facturas cuando se factura el EP.
// El aislamiento es por obra y el corte de sección va en requireObraContext.

import { getActiveMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireObraContext } from "@/lib/obra-auth";
import { renderEstadoPagoPdf } from "@/lib/pdf/estado-pago-pdf";

export const runtime = "nodejs";

const ESTADOS: Record<string, string> = {
  BORRADOR: "Borrador",
  APROBADO: "Aprobado",
  FACTURADO: "Facturado",
  PAGADO: "Pagado",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const ctx = await requireObraContext("estadosPago");
  const { id } = await params;

  const [ep, active] = await Promise.all([
    db.estadoPago.findFirst({
      where: { id, obraId: ctx.obra.id },
      include: {
        detalle: {
          include: {
            partida: { select: { codigo: true, descripcion: true, unidad: true } },
          },
        },
      },
    }),
    getActiveMembership(),
  ]);
  if (!ep) return new Response("Estado de pago no encontrado", { status: 404 });

  const aprobado = ep.aprobadoById
    ? await db.user.findUnique({
        where: { id: ep.aprobadoById },
        select: { name: true },
      })
    : null;

  const pdf = await renderEstadoPagoPdf({
    numero: ep.numero,
    periodo: ep.periodo,
    estado: ep.estado,
    estadoLabel: ESTADOS[ep.estado] ?? ep.estado,
    total: ep.total,
    createdAt: ep.createdAt,
    facturadoAt: ep.facturadoAt,
    obra: ctx.obra,
    empresa: active
      ? {
          name: active.company.name,
          rut: active.company.rut,
          address: active.company.address,
          commune: active.company.commune,
        }
      : null,
    aprobadoPor: aprobado?.name ?? null,
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

  const nombre = `EP-${String(ep.numero).padStart(4, "0")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
