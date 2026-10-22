// Trae las guías de despacho desde Defontana.
//
// El SII no sirve para esto: las guías de despacho no están en el Registro de
// Compras y Ventas (que es el libro del IVA y la guía no genera IVA), sino en un
// libro aparte que la librería no lee. Como la empresa emite sus DTE desde
// Defontana, ahí están sus guías: el ERP las lista como cualquier otro documento
// y entrega su XML, que es donde vienen el neto y la factura que despachan.
//
// El listado de Defontana no trae neto ni documento relacionado, solo el total
// (con IVA), así que por cada guía nueva se baja su XML: de ahí sale el neto,
// que es la base de comisión, y la factura que la guía despacha.

import { db } from "@/lib/db";
import { decodeDteXml, parseDteXml } from "@/lib/dte";
import { dteTipoLabel } from "@/lib/labels";
import { formatRut, normalizeRut } from "@/lib/rut";
import type { PartnerInfo } from "@/lib/sii/import-guides";
import { downloadXml, getMasterData, listSaleDocuments } from "./client";
import { withDefontanaSession } from "./credentials";

// El código SII de la guía de despacho electrónica.
const TIPO_GUIA = "50";

// Defontana se consulta por rango de fechas y el ERP no pagina para adelante,
// así que un mes muy cargado no puede bajarse entero de una. Además cada guía
// necesita su XML, que tarda más que la lista: con un tope la acción no se
// pasa del tiempo del servidor y se puede volver a ejecutar para el resto.
const MAX_GUIAS_POR_CORRIDA = 60;

/** Los folios vienen con ceros a la izquierda ("0000123"): el sistema guarda sin ellos. */
const sinCeros = (value: string) => value.trim().replace(/^0+/, "");

export type GuiasDefontanaResultado = {
  periodo: string;
  /** Documentos que devolvió Defontana para el rango, de todos los tipos. */
  documentosEnPeriodo: number;
  /** "116 factura electrónica (33), 2 guía de despacho (50)". */
  desglose: string;
  /** Cuántas de esos documentos son guías de despacho. */
  guiasEncontradas: number;
  importadas: number;
  yaRegistradas: number;
  fallos: string[];
  /** Guías que quedaron para la próxima corrida por el tope de XML. */
  pendientes: number;
};

export async function traerGuiasDefontana(input: {
  companyId: string;
  userId: string;
  /** Fechas simples, AAAA-MM-DD. */
  desde: string;
  hasta: string;
}): Promise<GuiasDefontanaResultado> {
  const { companyId, userId, desde, hasta } = input;
  const periodo = desde.slice(0, 7);

  return withDefontanaSession(companyId, async (session) => {
    const masterData = await getMasterData(session.token);
    const documentos = await listSaleDocuments(session.token, masterData, {
      desde,
      hasta,
      limite: 1000,
    });

    // El desglose por tipo no se pierde al quedarse solo con las guías: si el
    // ERP no trae ninguna, la persona tiene que poder ver que sí trajo facturas.
    const cuenta = new Map<string, number>();
    for (const doc of documentos) cuenta.set(doc.tipoSii, (cuenta.get(doc.tipoSii) ?? 0) + 1);
    const desglose =
      [...cuenta.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, n]) => `${n} ${dteTipoLabel(Number(tipo))} (${tipo})`)
        .join(", ") || "ninguno";

    const guias = documentos.filter((doc) => doc.tipoSii === TIPO_GUIA);

    const registradas = await db.dispatchGuide.findMany({
      where: { companyId },
      select: { guideNumber: true },
    });
    const guiasExistentes = new Set(registradas.map((g) => sinCeros(g.guideNumber)));

    const partners = await db.partner.findMany({
      where: { companyId },
      select: { id: true, name: true, rut: true, type: true, salespersonId: true },
    });
    const partnerPorRut = new Map<string, PartnerInfo>();
    const partnerPorNombre = new Map<string, PartnerInfo>();
    for (const partner of partners) {
      const info: PartnerInfo = {
        id: partner.id,
        type: partner.type,
        salespersonId: partner.salespersonId,
      };
      if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), info);
      partnerPorNombre.set(partner.name.trim().toLowerCase(), info);
    }

    let importadas = 0;
    let yaRegistradas = 0;
    const fallos: string[] = [];
    let procesadas = 0;

    for (const guia of guias) {
      const folio = String(guia.folio ?? "").trim();
      if (!folio) {
        fallos.push("Vino una guía sin folio; no se pudo registrar.");
        continue;
      }
      if (guiasExistentes.has(sinCeros(folio))) {
        yaRegistradas++;
        continue;
      }
      if (procesadas >= MAX_GUIAS_POR_CORRIDA) break;
      procesadas++;

      try {
        // El XML viene codificado en ISO-8859-1: sin decodificarlo, los acentos
        // de la razón social se guardan corruptos.
        const xml = decodeDteXml(await downloadXml(session.token, guia.platformId));
        const doc = parseDteXml(xml).documentos[0];
        if (!doc) throw new Error("el XML no trae el documento");

        // Si el XML no trae fecha, se usa el primer día del rango pedido: una
        // guía con fecha aproximada sirve y se corrige a mano; sin registrar,
        // no.
        const fechaIso = /^\d{4}-\d{2}-\d{2}/.exec(doc.fecha)?.[0] ?? desde;
        const fecha = new Date(`${fechaIso}T00:00:00.000Z`);

        // El neto es la base de comisión: sale del XML, no del total del
        // listado, que incluye IVA. El exento entra al neto igual que en el RCV
        // (no da crédito fiscal, pero es parte del costo de la operación).
        const neto = Math.max(0, Math.round(doc.neto + doc.exento));

        const rutNormalizado = doc.rutReceptor ? normalizeRut(doc.rutReceptor) : "";
        const nombre =
          doc.razonSocialReceptor.trim() || guia.nombreTercero.trim() || "(sin razón social)";
        let partner = rutNormalizado ? partnerPorRut.get(rutNormalizado) : undefined;
        if (!partner) partner = partnerPorNombre.get(nombre.toLowerCase());
        if (!partner) {
          const creado = await db.partner.create({
            data: {
              companyId,
              type: "CUSTOMER",
              name: nombre,
              rut: rutNormalizado ? formatRut(rutNormalizado) : null,
            },
          });
          partner = { id: creado.id, type: "CUSTOMER", salespersonId: null };
          if (rutNormalizado) partnerPorRut.set(rutNormalizado, partner);
          partnerPorNombre.set(nombre.toLowerCase(), partner);
        }

        // La factura que la guía despacha: el XML la trae como referencia
        // (TpoDocRef 33/34). Si esa factura todavía no está importada, la guía
        // queda suelta y se puede relacionar a mano desde la lista.
        const folioFactura = doc.facturaOriginal ? sinCeros(doc.facturaOriginal) : "";
        const venta = folioFactura
          ? await db.sale.findFirst({
              where: {
                companyId,
                documentNumber: folioFactura,
                documentType: { in: ["INVOICE", "RECEIPT"] },
              },
              select: { id: true },
            })
          : null;

        await db.dispatchGuide.create({
          data: {
            companyId,
            guideNumber: folio,
            date: fecha,
            partnerId: partner.id,
            netAmount: neto,
            note: `Defontana ${periodo}${
              venta ? "" : folioFactura ? ` · factura ${folioFactura} sin importar` : ""
            }`,
            createdById: userId,
            saleId: venta?.id ?? null,
          },
        });

        guiasExistentes.add(sinCeros(folio));
        importadas++;
      } catch (error) {
        const detalle = error instanceof Error ? error.message.split("\n")[0] : String(error);
        fallos.push(`Guía ${folio}: no se pudo guardar. ${detalle}`);
      }
    }

    return {
      periodo,
      documentosEnPeriodo: documentos.length,
      desglose,
      guiasEncontradas: guias.length,
      importadas,
      yaRegistradas,
      fallos,
      pendientes: Math.max(0, guias.length - yaRegistradas - importadas - fallos.length),
    };
  });
}
