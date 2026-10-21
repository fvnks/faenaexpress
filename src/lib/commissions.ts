import { db } from "@/lib/db";
import { documentSign, monthRange } from "@/lib/money";

/**
 * Motor de comisiones de vendedores.
 *
 * Tres ideas, en este orden:
 *
 * 1. LO AUTOMÁTICO. Las facturas del mes entran solas por su fecha, siguiendo
 *    la regla del vendedor: `INVOICE` suma todas, `GUIDE` solo las que traen
 *    guía de despacho.
 *
 * 2. LO MANUAL. Cualquier documento (una factura o una guía de meses
 *    anteriores) puede asignarse a un mes de comisión con
 *    `CommissionAssignment`. Eso es lo que resuelve las guías rezagadas.
 *
 * 3. NO SE CUENTA NUNCA DOS VECES. Si un documento tiene asignación, queda
 *    FUERA del cómputo automático en su mes de emisión y solo cuenta donde lo
 *    asignaste. Sin esta regla, arrastrar una factura de marzo a junio la
 *    sumaría en los dos meses.
 */

/** Tasa en centésimas de porcentaje: 250 = 2,50%. */
export function formatRateBps(rateBps: number): string {
  const value = rateBps / 100;
  return `${value.toLocaleString("es-CL", { maximumFractionDigits: 2 })}%`;
}

export function parseRateInput(raw: string): number | null {
  const normalized = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return 0;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100);
}

export type CommissionSourceKind = "AUTO" | "MANUAL";

export type CommissionLine = {
  saleId: string | null;
  dispatchGuideId: string | null;
  date: Date;
  documentType: string;
  documentNumber: string | null;
  guideNumber: string | null; // número de guía de despacho (para guías sin factura)
  partnerName: string;
  salespersonId: string;
  salespersonName: string;
  base: number; // neto con signo: las notas de crédito restan
  rateBps: number;
  commission: number;
  source: CommissionSourceKind;
  note: string | null;
};

export type CommissionTotals = {
  salespersonId: string;
  salespersonName: string;
  rateBps: number;
  base: number;
  commission: number;
  autoCount: number;
  manualCount: number;
};

/** Documento de meses anteriores que todavía no comisionó en ningún lado. */
export type PendingAssignment = {
  saleId: string;
  date: Date;
  documentType: string;
  documentNumber: string | null;
  dispatchGuide: string | null;
  partnerName: string;
  salespersonId: string | null;
  salespersonName: string | null;
  net: number;
};

export type CommissionPeriodReport = {
  period: string;
  closed: boolean;
  closedAt: Date | null;
  lines: CommissionLine[];
  totals: CommissionTotals[];
  /** Facturas sin vendedor en el mes: no comisionan hasta que alguien las asigne. */
  withoutSalesperson: number;
  pending: PendingAssignment[];
  pendingTotal: number;
};

// La comisión se redondea a pesos enteros, igual que todo lo demás en CLP.
function commissionOf(base: number, rateBps: number): number {
  const value = Math.round((base * rateBps) / 10_000);
  // Math.round(-0.4) devuelve -0, que se imprimirá como "$-0".
  return value === 0 ? 0 : value;
}

/**
 * Determina el signo que debe tener una venta para el cálculo de comisiones.
 *
 * Las notas de crédito/débito solo restan si hay una factura anulada con esa
 * nota de crédito/débito. Si no hay factura anulada asociada, se tratan como
 * ventas normales (signo positivo).
 */
async function commissionSignForSale(
  companyId: string,
  sale: { id: string; documentType: string; documentNumber: string | null; cancellationNoteNumber: string | null },
): Promise<1 | -1> {
  if (sale.documentType !== "CREDIT_NOTE" && sale.documentType !== "DEBIT_NOTE") {
    return 1;
  }

  if (sale.documentNumber) {
    const invoice = await db.sale.findFirst({
      where: {
        companyId,
        cancellationNoteNumber: sale.documentNumber,
        status: "CANCELLED",
      },
      select: { id: true },
    });
    if (invoice) return -1;
  }

  if (sale.cancellationNoteNumber) {
    const invoice = await db.sale.findFirst({
      where: {
        companyId,
        documentNumber: sale.cancellationNoteNumber,
        status: "CANCELLED",
      },
      select: { id: true },
    });
    if (invoice) return -1;
  }

  return 1;
}

async function loadSalespeople(companyId: string) {
  const people = await db.salesperson.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    active: person.active,
    rateBps: person.commissionRate,
    rule: person.commissionRule,
  }));
}

/**
 * Documentos de meses ANTERIORES que todavía no comisionaron: son los
 * candidatos a asignar a mano a este mes. Se descarta lo que ya tiene
 * asignación o entrada, para no ofrecer dos veces el mismo documento.
 */
export async function listPendingAssignments(
  companyId: string,
  period: string,
  limit = 100,
): Promise<{ rows: PendingAssignment[]; total: number }> {
  const range = monthRange(period);
  if (!range) return { rows: [], total: 0 };

  const [rows, total] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        date: { lt: range.from },
        commissionAssignment: null,
        commissionEntries: { none: {} },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        partner: { select: { name: true } },
        salesperson: { select: { name: true } },
      },
    }),
    db.sale.count({
      where: {
        companyId,
        date: { lt: range.from },
        commissionAssignment: null,
        commissionEntries: { none: {} },
      },
    }),
  ]);

  return {
    rows: rows.map((sale) => ({
      saleId: sale.id,
      date: sale.date,
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      dispatchGuide: sale.dispatchGuide,
      partnerName: sale.partner.name,
      salespersonId: sale.salespersonId,
      salespersonName: sale.salesperson?.name ?? null,
      net: documentSign(sale.documentType) * sale.netAmount,
    })),
    total,
  };
}

/**
 * Facturas DEL PERÍODO que no tienen vendedor. No comisionan hasta que alguien
 * las asigne. Se descarta lo que ya tiene asignación o entrada: una factura
 * arrastrada a otro mes ya tiene su dueño en otro lado.
 */
export async function listUnassignedInPeriod(
  companyId: string,
  period: string,
  limit = 100,
): Promise<{ rows: PendingAssignment[]; total: number; net: number }> {
  const range = monthRange(period);
  if (!range) return { rows: [], total: 0, net: 0 };

  const where = {
    companyId,
    date: { gte: range.from, lt: range.to },
    salespersonId: null,
    commissionAssignment: null,
    commissionEntries: { none: {} },
  };

  // El neto se suma con el signo del documento: una nota de crédito resta.
  const [rows, total, sums] = await Promise.all([
    db.sale.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { partner: { select: { name: true } } },
    }),
    db.sale.count({ where }),
    db.sale.groupBy({ by: ["documentType"], where, _sum: { netAmount: true } }),
  ]);

  const net = sums.reduce(
    (acc, group) => acc + documentSign(group.documentType) * (group._sum.netAmount ?? 0),
    0,
  );

  return {
    rows: rows.map((sale) => ({
      saleId: sale.id,
      date: sale.date,
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      dispatchGuide: sale.dispatchGuide,
      partnerName: sale.partner.name,
      salespersonId: null,
      salespersonName: null,
      net: documentSign(sale.documentType) * sale.netAmount,
    })),
    total,
    net,
  };
}

export type ActiveAssignment = {
  saleId: string;
  date: Date;
  documentType: string;
  documentNumber: string | null;
  dispatchGuide: string | null;
  partnerName: string;
  salespersonId: string;
  salespersonName: string;
  net: number;
  note: string | null;
  /** Mes al que quedó asignado. */
  targetPeriod: string;
};

const assignmentInclude = {
  sale: {
    include: {
      partner: { select: { name: true } },
      salesperson: { select: { name: true } },
    },
  },
  salesperson: { select: { name: true } },
} as const;

function toAssignment(row: {
  period: string;
  salespersonId: string;
  note: string | null;
  salesperson: { name: string } | null;
  sale: {
    id: string;
    date: Date;
    documentType: string;
    documentNumber: string | null;
    dispatchGuide: string | null;
    netAmount: number;
    partner: { name: string };
    salesperson: { name: string } | null;
  } | null;
}): ActiveAssignment | null {
  if (!row.sale) return null;
  return {
    saleId: row.sale.id,
    date: row.sale.date,
    documentType: row.sale.documentType,
    documentNumber: row.sale.documentNumber,
    dispatchGuide: row.sale.dispatchGuide,
    partnerName: row.sale.partner.name,
    salespersonId: row.salespersonId,
    salespersonName: row.salesperson?.name ?? "(sin nombre)",
    net: documentSign(row.sale.documentType) * row.sale.netAmount,
    note: row.note,
    targetPeriod: row.period,
  };
}

/**
 * Asignaciones manuales en dos direcciones, que es lo que hace entendible el
 * mes:
 *
 * - `intoPeriod`: documentos que quedaron asignados A ESTE MES (desde cualquier
 *   fecha). Son los que comisionan acá por decisión de alguien.
 * - `outOfPeriod`: documentos con fecha en ESTE MES que alguien arrastró A
 *   OTRO MES. Sin mostrarlos, desaparecen del resumen sin explicación, que es
 *   exactamente la regla anti-duplicado hecha invisible.
 */
export async function listAssignments(
  companyId: string,
  period: string,
): Promise<{ intoPeriod: ActiveAssignment[]; outOfPeriod: ActiveAssignment[] }> {
  const range = monthRange(period);
  if (!range) return { intoPeriod: [], outOfPeriod: [] };

  const [into, out] = await Promise.all([
    db.commissionAssignment.findMany({
      where: { companyId, period },
      orderBy: { createdAt: "desc" },
      include: assignmentInclude,
    }),
    db.commissionAssignment.findMany({
      where: {
        companyId,
        period: { not: period },
        sale: { date: { gte: range.from, lt: range.to } },
      },
      orderBy: { createdAt: "desc" },
      include: assignmentInclude,
    }),
  ]);

  return { intoPeriod: into.map(toAssignment).filter((a): a is ActiveAssignment => a !== null), outOfPeriod: out.map(toAssignment).filter((a): a is ActiveAssignment => a !== null) };
}

export type CommissionHistoryMonth = {
  period: string;
  closedAt: Date;
  closedByName: string;
  base: number;
  commission: number;
  lineCount: number;
  people: { salespersonName: string; base: number; commission: number; count: number }[];
};

/**
 * Historial de meses cerrados, con lo que se congeló en cada uno. Se lee de
 * `CommissionEntry`, no del motor en vivo: un mes cerrado ya no se recalcula.
 */
export async function listCommissionHistory(
  companyId: string,
  limit = 24,
): Promise<CommissionHistoryMonth[]> {
  const [closes, entries] = await Promise.all([
    db.commissionClose.findMany({
      where: { companyId },
      orderBy: { period: "desc" },
      take: limit,
      include: { closedBy: { select: { name: true } } },
    }),
    db.commissionEntry.findMany({
      where: { companyId },
      include: { salesperson: { select: { name: true } } },
    }),
  ]);

  const byPeriod = new Map<
    string,
    CommissionHistoryMonth & {
      people: Map<string, CommissionHistoryMonth["people"][number]>;
    }
  >();

  for (const entry of entries) {
    const month =
      byPeriod.get(entry.period) ??
      ({
        period: entry.period,
        closedAt: new Date(0),
        closedByName: "",
        base: 0,
        commission: 0,
        lineCount: 0,
        people: new Map(),
      } as CommissionHistoryMonth & {
        people: Map<string, CommissionHistoryMonth["people"][number]>;
      });

    month.base += entry.baseAmount;
    month.commission += entry.amount;
    month.lineCount += 1;

    const person =
      month.people.get(entry.salespersonId) ??
      { salespersonName: entry.salesperson.name, base: 0, commission: 0, count: 0 };
    person.base += entry.baseAmount;
    person.commission += entry.amount;
    person.count += 1;
    month.people.set(entry.salespersonId, person);

    byPeriod.set(entry.period, month);
  }

  return closes.map((close) => {
    const month = byPeriod.get(close.period);
    return {
      period: close.period,
      closedAt: close.closedAt,
      closedByName: close.closedBy.name,
      base: month?.base ?? 0,
      commission: month?.commission ?? 0,
      lineCount: month?.lineCount ?? 0,
      people: month ? [...month.people.values()] : [],
    };
  });
}

/**
 * Cálculo en vivo de un mes. Es lo que se ve antes de cerrar; al cerrar, el
 * mismo cálculo se materializa en `CommissionEntry` y queda congelado.
 */
export async function computeCommission(
  companyId: string,
  period: string,
): Promise<CommissionPeriodReport> {
  const range = monthRange(period);
  if (!range) {
    throw new Error(`Período inválido: ${period}. Se espera formato AAAA-MM.`);
  }

  const [people, close, assignments] = await Promise.all([
    loadSalespeople(companyId),
    db.commissionClose.findUnique({
      where: { companyId_period: { companyId, period } },
    }),
    // Todo documento con asignación queda fuera del automático, en cualquier mes.
    // Incluye tanto ventas como guías de despacho sin facturar.
    db.commissionAssignment.findMany({
      where: { companyId },
      select: { saleId: true, dispatchGuideId: true },
    }),
  ]);

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const blockedSales = new Set(
    assignments.filter((a) => a.saleId !== null).map((a) => a.saleId!),
  );

  const [autoSales, manualAssignments] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        date: { gte: range.from, lt: range.to },
        // Ya congelada en un cierre: no se vuelve a tocar.
        commissionEntries: { none: {} },
      },
      include: {
        partner: { select: { name: true } },
        salesperson: { select: { name: true } },
      },
    }),
    db.commissionAssignment.findMany({
      where: { companyId, period },
      include: {
        sale: {
          include: {
            partner: { select: { name: true } },
            salesperson: { select: { name: true } },
          },
        },
        dispatchGuide: {
          include: {
            partner: { select: { name: true } },
            salesperson: { select: { name: true } },
          },
        },
        salesperson: { select: { name: true } },
      },
    }),
  ]);

  const lines: CommissionLine[] = [];
  let withoutSalesperson = 0;

  for (const sale of autoSales) {
    // Asignado a mano: ya cuenta en el mes que le corresponde, no aquí.
    // Se revisa antes de nada para no contarlo también como "sin vendedor".
    if (blockedSales.has(sale.id)) continue;

    if (!sale.salespersonId) {
      withoutSalesperson += 1;
      continue;
    }

    const person = peopleById.get(sale.salespersonId);
    if (!person) continue;

    // Regla del vendedor. Solo aplica a lo automático: lo asignado a mano
    // puede ser cualquier documento, haya guía o no.
    if (person.rule === "GUIDE" && !sale.dispatchGuide) continue;

    // La comisión se calcula sobre el NETO.
    const sign = await commissionSignForSale(companyId, sale);
    const base = sign * sale.netAmount;
    lines.push({
      saleId: sale.id,
      dispatchGuideId: null,
      date: sale.date,
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      guideNumber: null,
      partnerName: sale.partner.name,
      salespersonId: person.id,
      salespersonName: person.name,
      base,
      rateBps: person.rateBps,
      commission: commissionOf(base, person.rateBps),
      source: "AUTO",
      note: null,
    });
  }

  for (const assignment of manualAssignments) {
    if (assignment.sale) {
      const sale = assignment.sale;
      const person = peopleById.get(assignment.salespersonId);
      // La comisión se calcula sobre el NETO.
      const sign = await commissionSignForSale(companyId, sale);
      const base = sign * sale.netAmount;
      lines.push({
        saleId: sale.id,
        dispatchGuideId: null,
        date: sale.date,
        documentType: sale.documentType,
        documentNumber: sale.documentNumber,
        guideNumber: null,
        partnerName: sale.partner.name,
        salespersonId: assignment.salespersonId,
        salespersonName: person?.name ?? assignment.salesperson?.name ?? "(sin nombre)",
        base,
        rateBps: person?.rateBps ?? 0,
        commission: commissionOf(base, person?.rateBps ?? 0),
        source: "MANUAL",
        note: assignment.note,
      });
    } else if (assignment.dispatchGuide) {
      const guide = assignment.dispatchGuide;
      const person = peopleById.get(assignment.salespersonId);
      const base = guide.netAmount; // las guías siempre suman (no hay notas de crédito en guías)
      lines.push({
        saleId: null,
        dispatchGuideId: guide.id,
        date: guide.date,
        documentType: "INVOICE", // ficticio: las guías son siempre ingresos
        documentNumber: null,
        guideNumber: guide.guideNumber,
        partnerName: guide.partner.name,
        salespersonId: assignment.salespersonId,
        salespersonName: person?.name ?? assignment.salesperson?.name ?? "(sin nombre)",
        base,
        rateBps: person?.rateBps ?? 0,
        commission: commissionOf(base, person?.rateBps ?? 0),
        source: "MANUAL",
        note: assignment.note,
      });
    }
  }

  lines.sort((a, b) => {
    if (a.salespersonName !== b.salespersonName) {
      return a.salespersonName.localeCompare(b.salespersonName, "es");
    }
    return a.date.getTime() - b.date.getTime();
  });

  const totals = summarize(people, lines);
  const pending = await listPendingAssignments(companyId, period);

  return {
    period,
    closed: Boolean(close),
    closedAt: close?.closedAt ?? null,
    lines,
    totals,
    withoutSalesperson,
    pending: pending.rows,
    pendingTotal: pending.total,
  };
}

function summarize(
  people: { id: string; name: string; active: boolean; rateBps: number }[],
  lines: CommissionLine[],
): CommissionTotals[] {
  const byPerson = new Map<string, CommissionTotals>();

  // Se listan también los vendedores sin movimiento, para que un mes vacío se
  // vea como vacío y no como una fila que faltó.
  for (const person of people) {
    byPerson.set(person.id, {
      salespersonId: person.id,
      salespersonName: person.name,
      rateBps: person.rateBps,
      base: 0,
      commission: 0,
      autoCount: 0,
      manualCount: 0,
    });
  }

  for (const line of lines) {
    const row = byPerson.get(line.salespersonId) ?? {
      salespersonId: line.salespersonId,
      salespersonName: line.salespersonName,
      rateBps: line.rateBps,
      base: 0,
      commission: 0,
      autoCount: 0,
      manualCount: 0,
    };
    row.base += line.base;
    row.commission += line.commission;
    if (line.source === "AUTO") row.autoCount += 1;
    else row.manualCount += 1;
    byPerson.set(line.salespersonId, row);
  }

  return [...byPerson.values()].sort((a, b) =>
    a.salespersonName.localeCompare(b.salespersonName, "es"),
  );
}

/**
 * Congela un mes: copia el cálculo a `CommissionEntry` con la tasa vigente en
 * este momento y sella el período. De ahí en adelante el motor lo ignora, así
 * que una anulación posterior no descuadra una comisión ya pagada.
 */
export async function closeCommissionMonth(
  companyId: string,
  period: string,
  userId: string,
): Promise<{ entries: number }> {
  const report = await computeCommission(companyId, period);
  if (report.closed) {
    throw new Error(`El período ${period} ya está cerrado.`);
  }

  await db.$transaction(async (tx) => {
    const yaCerrado = await tx.commissionClose.findUnique({
      where: { companyId_period: { companyId, period } },
    });
    if (yaCerrado) throw new Error(`El período ${period} ya está cerrado.`);

    if (report.lines.length > 0) {
      await tx.commissionEntry.createMany({
        data: report.lines.map((line) => ({
          companyId,
          period,
          salespersonId: line.salespersonId,
          saleId: line.saleId,
          dispatchGuideId: line.dispatchGuideId,
          source: line.source,
          baseAmount: line.base,
          rateBps: line.rateBps,
          amount: line.commission,
        })),
      });
    }

    await tx.commissionClose.create({
      data: { companyId, period, closedById: userId },
    });
  });

  return { entries: report.lines.length };
}

/**
 * Comisión de un mes YA CERRADO, leída de las entradas congeladas. No se puede
 * usar `computeCommission` acá: al cerrar, las facturas quedan marcadas y el
 * motor en vivo deja de verlas, así que devolvería un mes casi vacío.
 */
export async function closedCommissionReport(
  companyId: string,
  period: string,
): Promise<{
  closedAt: Date | null;
  lines: CommissionLine[];
  totals: CommissionTotals[];
}> {
  const close = await db.commissionClose.findUnique({
    where: { companyId_period: { companyId, period } },
  });

  const entries = await db.commissionEntry.findMany({
    where: { companyId, period },
    include: {
      sale: {
        include: {
          partner: { select: { name: true } },
          salesperson: { select: { name: true } },
          // El motivo vive en la asignación, que persiste después del cierre.
          commissionAssignment: { select: { note: true } },
        },
      },
      dispatchGuide: {
        include: {
          partner: { select: { name: true } },
          // El motivo vive en `assignment`, no en `commissionAssignment`.
          assignment: { select: { note: true } },
        },
      },
      salesperson: { select: { name: true } },
    },
  });

  const lines: CommissionLine[] = entries.map((entry) => {
    if (entry.sale) {
      return {
        saleId: entry.saleId,
        dispatchGuideId: null,
        date: entry.sale.date,
        documentType: entry.sale.documentType,
        documentNumber: entry.sale.documentNumber,
        guideNumber: null,
        partnerName: entry.sale.partner.name,
        salespersonId: entry.salespersonId,
        salespersonName: entry.salesperson.name,
        base: entry.baseAmount,
        rateBps: entry.rateBps,
        commission: entry.amount,
        source: entry.source,
        note: entry.sale.commissionAssignment?.note ?? null,
      };
    }
    // Entrada proveniente de una guía de despacho sin factura.
    if (entry.dispatchGuide) {
      return {
        saleId: null,
        dispatchGuideId: entry.dispatchGuideId,
        date: entry.dispatchGuide.date,
        documentType: "INVOICE",
        documentNumber: null,
        guideNumber: entry.dispatchGuide.guideNumber,
        partnerName: entry.dispatchGuide.partner.name,
        salespersonId: entry.salespersonId,
        salespersonName: entry.salesperson.name,
        base: entry.baseAmount,
        rateBps: entry.rateBps,
        commission: entry.amount,
        source: entry.source,
        note: entry.dispatchGuide.assignment?.note ?? null,
      };
    }
    // Caso borde: entrada huérfana (no debería pasar).
    return {
      saleId: entry.saleId,
      dispatchGuideId: entry.dispatchGuideId,
      date: new Date(0),
      documentType: "INVOICE",
      documentNumber: null,
      guideNumber: null,
      partnerName: "(documento eliminado)",
      salespersonId: entry.salespersonId,
      salespersonName: entry.salesperson.name,
      base: entry.baseAmount,
      rateBps: entry.rateBps,
      commission: entry.amount,
      source: entry.source,
      note: null,
    };
  });

  lines.sort((a, b) => {
    if (a.salespersonName !== b.salespersonName) {
      return a.salespersonName.localeCompare(b.salespersonName, "es");
    }
    return a.date.getTime() - b.date.getTime();
  });

  const byPerson = new Map<string, CommissionTotals>();
  for (const line of lines) {
    const row = byPerson.get(line.salespersonId) ?? {
      salespersonId: line.salespersonId,
      salespersonName: line.salespersonName,
      rateBps: line.rateBps,
      base: 0,
      commission: 0,
      autoCount: 0,
      manualCount: 0,
    };
    row.base += line.base;
    row.commission += line.commission;
    if (line.source === "AUTO") row.autoCount += 1;
    else row.manualCount += 1;
    byPerson.set(line.salespersonId, row);
  }

  return {
    closedAt: close?.closedAt ?? null,
    lines,
    totals: [...byPerson.values()].sort((a, b) =>
      a.salespersonName.localeCompare(b.salespersonName, "es"),
    ),
  };
}

/** Meses cerrados, para pintar el historial y bloquear los botones. */
export async function listCommissionCloses(companyId: string, limit = 24) {
  return db.commissionClose.findMany({
    where: { companyId },
    orderBy: { period: "desc" },
    take: limit,
    include: { closedBy: { select: { name: true } } },
  });
}

/** Comisión congelada de un mes ya cerrado, agrupada por vendedor. */
export async function closedCommissionTotals(companyId: string, period: string) {
  const entries = await db.commissionEntry.findMany({
    where: { companyId, period },
    include: { salesperson: { select: { name: true } } },
  });

  const byPerson = new Map<
    string,
    { salespersonId: string; salespersonName: string; base: number; commission: number; count: number }
  >();

  for (const entry of entries) {
    const row = byPerson.get(entry.salespersonId) ?? {
      salespersonId: entry.salespersonId,
      salespersonName: entry.salesperson.name,
      base: 0,
      commission: 0,
      count: 0,
    };
    row.base += entry.baseAmount;
    row.commission += entry.amount;
    row.count += 1;
    byPerson.set(entry.salespersonId, row);
  }

  return [...byPerson.values()].sort((a, b) =>
    a.salespersonName.localeCompare(b.salespersonName, "es"),
  );
}

// ---------------------------------------------------------------------------
// Guías de despacho sin facturar
//
// Una guía de despacho es un documento de envío que todavía no se ha convertido
// en factura. El vendedor quiere comisionarlas igual porque ya despachó la
// mercancía; la factura puede llegar en cualquier momento posterior.
// ---------------------------------------------------------------------------

export type UnassignedDispatchGuide = {
  id: string;
  guideNumber: string;
  date: Date;
  partnerName: string;
  salespersonId: string | null;
  salespersonName: string;
  net: number;
};

/**
 * Guías de despacho registradas pero sin asignar a ningún mes de comisión.
 * Sirven para que el usuario las vea y decida a qué mes llevarlas.
 */
export async function listUnassignedDispatchGuides(
  companyId: string,
  limit = 100,
): Promise<{ rows: UnassignedDispatchGuide[]; total: number }> {
  const [rows, total] = await Promise.all([
    db.dispatchGuide.findMany({
      where: { companyId, assignment: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { partner: { select: { name: true } }, salesperson: { select: { name: true } } },
    }),
    db.dispatchGuide.count({ where: { companyId, assignment: null } }),
  ]);

  return {
    rows: rows.map((guide) => ({
      id: guide.id,
      guideNumber: guide.guideNumber,
      date: guide.date,
      partnerName: guide.partner.name,
      salespersonId: guide.salespersonId,
      salespersonName: guide.salesperson?.name ?? "(sin vendedor)",
      net: guide.netAmount,
    })),
    total,
  };
}

export type DispatchGuideRow = {
  id: string;
  guideNumber: string;
  date: Date;
  partnerName: string;
  salespersonId: string | null;
  salespersonName: string;
  net: number;
  period: string | null;
};

/**
 * Todas las guías de despacho de la empresa, con su estado (asignada o no).
 * Se usa en el panel de registro para que el usuario pueda ver lo que ya tiene.
 */
export async function listAllDispatchGuides(
  companyId: string,
  limit = 200,
): Promise<{ rows: DispatchGuideRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    db.dispatchGuide.findMany({
      where: { companyId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        partner: { select: { name: true } },
        salesperson: { select: { name: true } },
        assignment: { select: { period: true } },
      },
    }),
    db.dispatchGuide.count({ where: { companyId } }),
  ]);

  return {
    rows: rows.map((guide) => ({
      id: guide.id,
      guideNumber: guide.guideNumber,
      date: guide.date,
      partnerName: guide.partner.name,
      salespersonId: guide.salespersonId,
      salespersonName: guide.salesperson?.name ?? "(sin vendedor)",
      net: guide.netAmount,
      period: guide.assignment?.period ?? null,
    })),
    total,
  };
}
