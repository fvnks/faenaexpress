// Las reglas de qué documentos cuentan y cómo se suman.
//
// Están en un solo lugar porque el panel, las listas de ventas y compras y los
// reportes tienen que decir lo mismo. Cuando cada pantalla suma a su manera,
// los números se contradicen entre sí (una dice que por cobrar son $32
// millones y otra $35) y el usuario termina desconfiando de todos.
//
// La identidad que se cumple, documento por documento:
//
//   total = movido + pendiente
//
// - Una cotización no cuenta: no es una venta, no genera deuda ni IVA.
// - Un documento anulado no cuenta: no se facturó.
// - Una nota de crédito resta. Y si es la contrapartida de una factura
//   anulada, no cuenta: la factura anulada ya quedó fuera y la nota es la otra
//   cara de la misma operación. Si se contaran las dos, el mismo hecho
//   aparecería dos veces con signo contrario.
// - El saldo es el total menos la retención (lo retenido no se le cobra al
//   cliente) menos lo ya abonado.

import { documentSign } from "@/lib/money";

export type DocumentoContable = {
  documentType: string;
  documentNumber: string | null;
  status: string;
  totalAmount: number;
  /** Lo que ya se abonó (pagos aplicados al documento). */
  abonado: number;
  /** Retención: en ventas, lo que no se le cobra al cliente. */
  retentionAmount?: number;
  /** El documento está en confirming: el dinero ya entró por otra vía. */
  confirming?: boolean;
  /** Es la nota de crédito que dejó sin efecto a un documento anulado. */
  contrapartidaAnulada?: boolean;
};

export type TotalesContables = {
  /** El valor de los documentos, neto de notas de crédito. */
  total: number;
  /** El dinero que se movió. */
  movido: number;
  /** La parte del dinero que se movió por confirming (la empresa lo adelantó). */
  confirming: number;
  /** Lo que queda por cobrar o por pagar. */
  pendiente: number;
  /** Las notas de crédito que restan (con signo). */
  notasCredito: number;
  /** Cuántas notas de crédito hay. */
  notasCreditoCantidad: number;
  /** Retenciones: lo que se retuvo y por eso no se cobró. */
  retenciones: number;
  /** Documentos anulados, que no cuentan para nada. */
  anulados: number;
  /** El monto de los documentos anulados. */
  anuladosMonto: number;
};

export function calcularTotales(documentos: DocumentoContable[]): TotalesContables {
  const totales: TotalesContables = {
    total: 0,
    movido: 0,
    confirming: 0,
    pendiente: 0,
    notasCredito: 0,
    notasCreditoCantidad: 0,
    retenciones: 0,
    anulados: 0,
    anuladosMonto: 0,
  };

  for (const doc of documentos) {
    if (doc.documentType === "QUOTATION") continue;

    if (doc.status === "CANCELLED") {
      totales.anulados += 1;
      totales.anuladosMonto += doc.totalAmount;
      continue;
    }

    if (doc.contrapartidaAnulada) continue;

    const signo = documentSign(doc.documentType);
    const retencion = doc.retentionAmount ?? 0;
    // Lo que la empresa queda por cobrar o por pagar de este documento.
    const neto = Math.max(doc.totalAmount - retencion, 0);

    totales.total += signo * neto;
    totales.retenciones += signo * retencion;

    if (doc.documentType === "CREDIT_NOTE") {
      totales.notasCredito += signo * neto;
      totales.notasCreditoCantidad += 1;
    }

    const enConfirming = doc.confirming === true;
    const estaPendiente =
      !enConfirming &&
      (doc.status === "PENDING" || doc.status === "PARTIAL" || doc.status === "OVERDUE");

    // El dinero que se movió: un documento pagado está saldado (y puede no
    // tener abonos registrados: el RCV lo marca pagado sin anotar el pago), en
    // confirming lo adelantó la empresa, y en los demás es lo abonado.
    const movido =
      doc.status === "PAID" || enConfirming ? neto : Math.min(doc.abonado, neto);
    if (doc.status === "PAID" || enConfirming || doc.abonado > 0) {
      totales.movido += signo * movido;
      if (enConfirming && doc.status !== "PAID") {
        totales.confirming += signo * movido;
      }
    }

    if (estaPendiente) {
      totales.pendiente += signo * Math.max(neto - doc.abonado, 0);
    }
  }

  return totales;
}
