// Cómo se vinculan las notas de crédito/débito de COMPRAS con la factura que
// ajustan, para el árbol desplegable de la lista de compras.
//
// A diferencia de las notas de venta (`sale-notes.ts`), una nota de compra no
// guarda el vínculo: solo trae el folio del documento original tal como vino
// del SII (`facturaOriginal` o `referenceDocumentNumber`). El vínculo se
// DERIVA por folio al leer la lista, de la misma forma en que
// `vincularNotasConDocumentos` cruza folio + cliente:
//
// - El folio se normaliza (sin puntos ni espacios), porque el mismo número
//   llega escrito distinto según de dónde salió.
// - El match exige el MISMO proveedor: el folio no identifica un documento
//   solo (dos proveedores distintos pueden tener folio 1182).
// - Si la factura que ajusta no está en la página que se está viendo, la nota
//   simplemente no aparece en su árbol: no hay cruz de clientes tampoco.
//
// Es derivado a propósito: no toca datos, así que las listas siguen siendo de
// solo lectura y las notas siguen mostrándose como filas propias.

import { db } from "@/lib/db";
import { noteKinds, claveFolio } from "@/lib/sale-notes";
import type { NotaArbol } from "@/components/notes-tree";

/** Lo mínimo que la lista ya tiene de cada compra para poder cruzar. */
export type CompraParaCruce = {
  id: string;
  documentType: string;
  documentNumber: string | null;
  partnerId: string;
};

/**
 * Map de compra (factura de compra) → notas que la ajustan, con lo que el
 * árbol de la lista despliega. Solo cruza notas de compra que traen un folio
 * de referencia; las que no lo traen siguen siendo filas sueltas como siempre.
 */
export async function notasPorCompras(
  companyId: string,
  compras: CompraParaCruce[],
): Promise<Map<string, NotaArbol[]>> {
  const mapa = new Map<string, NotaArbol[]>();
  const facturas = compras.filter(
    (compra) =>
      (compra.documentType === "INVOICE" || compra.documentType === "RECEIPT") &&
      compra.documentNumber !== null,
  );
  if (facturas.length === 0) return mapa;

  const notas = await db.purchase.findMany({
    where: {
      companyId,
      documentType: { in: noteKinds },
      OR: [{ facturaOriginal: { not: null } }, { referenceDocumentNumber: { not: null } }],
    },
    select: {
      id: true,
      documentType: true,
      documentNumber: true,
      date: true,
      totalAmount: true,
      status: true,
      partnerId: true,
      facturaOriginal: true,
      referenceDocumentNumber: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  if (notas.length === 0) return mapa;

  // Clave del documento ajustado: folio normalizado + proveedor.
  const compraPorClave = new Map(
    facturas.map((compra) => [`${claveFolio(compra.documentNumber!)}|${compra.partnerId}`, compra.id]),
  );

  for (const nota of notas) {
    const folio = nota.facturaOriginal ?? nota.referenceDocumentNumber ?? "";
    const compraId = compraPorClave.get(`${claveFolio(folio)}|${nota.partnerId}`);
    if (!compraId || compraId === nota.id) continue;

    const item = mapa.get(compraId) ?? [];
    item.push({
      id: nota.id,
      documentType: nota.documentType,
      documentNumber: nota.documentNumber,
      date: nota.date,
      totalAmount: nota.totalAmount,
      status: nota.status,
      href: `/facturas/compras/${nota.id}`,
    });
    mapa.set(compraId, item);
  }

  // Más reciente arriba, como todo el resto de la app.
  for (const item of mapa.values()) item.reverse();

  return mapa;
}
