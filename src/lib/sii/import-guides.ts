// Importación de las guías de despacho que trae el SII (RCV).
//
// La guía de despacho (tipo 50) es un documento propio: no es una factura ni
// una compra, así que va a su propia tabla (`DispatchGuide`). Lo que la hace
// útil es que se puede relacionar con la factura de venta que despacha: así se
// ve qué se despachó de qué venta, sin duplicar montos.
//
// El SII entrega la guía con el tipo y el folio del documento que se está
// despachando. Con ese folio se busca la venta: si ya está importada, la guía
// queda ligada a ella y toma su cliente, que es el mismo. Si todavía no está,
// la guía queda suelta y se puede relacionar después desde la ficha de la
// venta.

import { db } from "@/lib/db";
import type { PartnerType } from "@/generated/prisma/client";
import { formatRut, normalizeRut } from "@/lib/rut";

export type PartnerInfo = { id: string; type: PartnerType; salespersonId: string | null };

export type GuiaRcv = {
  folio: string;
  /** El receptor: con quién se despacha. */
  receptorRut?: string | null;
  receptorNombre?: string | null;
  /** El documento que la guía despacha. */
  documentoRelacionadoFolio?: string | null;
  documentoRelacionadoTipo?: number | null;
  neto: number;
  evento: string | null;
};

export async function importarGuiaSii(params: {
  companyId: string;
  userId: string;
  row: GuiaRcv;
  folio: string;
  fecha: Date;
  periodo: string;
  partnerPorRut: Map<string, PartnerInfo>;
  partnerPorNombre: Map<string, PartnerInfo>;
}): Promise<{ partnerId: string; saleId: string | null }> {
  const { row } = params;

  // La venta que despacha la guía.
  const venta = row.documentoRelacionadoFolio
    ? await db.sale.findFirst({
        where: {
          companyId: params.companyId,
          documentNumber: row.documentoRelacionadoFolio,
          documentType: { in: ["INVOICE", "RECEIPT"] },
        },
        select: { id: true, partnerId: true },
      })
    : null;

  // El cliente: el de la factura cuando se encontró; si no, el receptor que
  // trae el RCV (en una guía la empresa emite y el cliente recibe).
  let partnerId = venta?.partnerId ?? null;
  if (!partnerId) {
    const rut = String(row.receptorRut ?? "").trim();
    const nombre = String(row.receptorNombre ?? "").trim() || "(sin razón social)";
    const rutNormalizado = rut ? normalizeRut(rut) : "";
    const partner = rutNormalizado
      ? params.partnerPorRut.get(rutNormalizado)
      : params.partnerPorNombre.get(nombre.toLowerCase());

    if (partner) {
      partnerId = partner.id;
    } else {
      // El mapa de terceros se armó al empezar la importación: un cliente
      // creado en otra parte (o en otro proceso) puede no estar. Se pregunta
      // antes de crear, porque el RUT es único por empresa. La consulta va por
      // el RUT formateado, que es como se guarda: (companyId, rut) es único,
      // así que a lo más hay una fila.
      const existente = rutNormalizado
        ? await db.partner.findFirst({
            where: { companyId: params.companyId, rut: formatRut(rutNormalizado) },
            select: { id: true, type: true, salespersonId: true },
          })
        : null;

      if (existente) {
        partnerId = existente.id;
        params.partnerPorRut.set(rutNormalizado, existente);
      } else {
        const creado = await db.partner.create({
          data: {
            companyId: params.companyId,
            type: "CUSTOMER",
            name: nombre,
            rut: rutNormalizado ? formatRut(rutNormalizado) : null,
          },
        });
        partnerId = creado.id;
        const info: PartnerInfo = { id: creado.id, type: "CUSTOMER", salespersonId: null };
        if (rutNormalizado) params.partnerPorRut.set(rutNormalizado, info);
        params.partnerPorNombre.set(nombre.toLowerCase(), info);
      }
    }
  }

  await db.dispatchGuide.create({
    data: {
      companyId: params.companyId,
      guideNumber: params.folio,
      date: params.fecha,
      partnerId,
      netAmount: Math.max(0, Math.round(Number(row.neto) || 0)),
      note: row.evento ? `RCV SII: ${row.evento}` : `RCV SII ${params.periodo}`,
      createdById: params.userId,
      saleId: venta?.id ?? null,
    },
  });

  return { partnerId, saleId: venta?.id ?? null };
}
