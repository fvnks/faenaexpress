import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Prisma } from "@/generated/prisma/client";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { paginate, parsePage } from "@/lib/pagination";

/**
 * Conciliación bancaria.
 *
 * Los movimientos llegan del paquete open-banking-chile (scrapers MIT que
 * abren el portal del banco con el RUT y clave del usuario y devuelven JSON).
 * El scraper corre en un proceso hijo (scripts/bank-sync-worker.mjs): aísla
 * crashes y memoria, y mantiene Puppeteer fuera del bundle de Next.
 *
 * Seguridad: la clave del banco se pasa al hijo por variable de entorno,
 * nunca se guarda en la base de datos ni queda en logs. La sincronización no
 * la recuerda la app: se pide en cada corrida.
 */

export type BankInfo = { id: string; name: string; note?: string };

// Espejo de listBanks() de open-banking-chile 2.1.2. El worker valida contra
// el registro real en tiempo de ejecución, así que un banco que desaparezca
// falla con mensaje claro y no rompe la app.
export const BANKS: BankInfo[] = [
  { id: "santander", name: "Banco Santander" },
  { id: "bchile", name: "Banco de Chile" },
  { id: "edwards", name: "Banco Edwards" },
  { id: "bci", name: "BCI" },
  { id: "bice", name: "Banco BICE" },
  { id: "falabella", name: "Banco Falabella" },
  { id: "itau", name: "Itaú" },
  { id: "scotiabank", name: "Scotiabank Chile" },
  { id: "bestado", name: "Banco Estado", note: "Abre una ventana visible de Chrome: no funciona en servidores sin pantalla." },
  { id: "citi", name: "Citibank" },
  { id: "mercadopago", name: "MercadoPago" },
  { id: "fintual", name: "Fintual" },
  { id: "racional", name: "Racional" },
];

export function bankName(bankId: string): string {
  return BANKS.find((bank) => bank.id === bankId)?.name ?? bankId;
}

export const isKnownBank = (bankId: string) => BANKS.some((bank) => bank.id === bankId);

// ---------------------------------------------------------------------------
// Tipos del scraper (v2 usa movements plano; v3 próximo usa accounts[]).
// El ingest acepta ambos para que actualizar el paquete no rompa la app.
// ---------------------------------------------------------------------------

type ScraperMovement = {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  source?: string;
};

type ScraperResult = {
  success: boolean;
  bank: string;
  error?: string;
  debug?: string;
  balance?: number;
  movements?: ScraperMovement[];
  accounts?: Array<{ label?: string; balance?: number; movements?: ScraperMovement[] }>;
  creditCards?: Array<{ label?: string; movements?: ScraperMovement[] }>;
};

const SYNC_TIMEOUT_MS = 5 * 60 * 1000;

/** Resultado de una sincronización, para el flash y el registro BankSync. */
export type SyncOutcome = {
  ok: boolean;
  imported: number;
  message: string;
};

/**
 * Traduce el error del scraper a algo accionable: el aviso de Chrome viene con
 * instrucciones para desarrolladores (chromePath, brew, apt) que en la UI solo
 * confunden.
 */
function friendlySyncError(raw: string | undefined): string {
  if (!raw) return "El banco rechazó el acceso. Revisa el RUT y la clave.";
  if (/chrome/i.test(raw) && /encontr/i.test(raw)) {
    return "No se encontró Chrome/Chromium en el servidor. Instala Google Chrome o define la variable OB_CHROME_PATH con la ruta del ejecutable.";
  }
  return raw;
}

/**
 * Ejecuta el scraper del banco en un proceso hijo e importa los movimientos.
 * Bloquea hasta terminar (1-3 minutos en la práctica); el caller debe mostrar
 * un estado de carga.
 */
export async function runBankSync(
  ctx: AuthContext,
  bankId: string,
  rut: string,
  password: string,
): Promise<SyncOutcome> {
  const sync = await db.bankSync.create({
    data: {
      companyId: ctx.company.id,
      bankId,
      status: "running",
      userId: ctx.user.id,
    },
  });

  let outDir: string | null = null;
  try {
    outDir = mkdtempSync(join(tmpdir(), "banco-"));
    const outPath = join(outDir, "result.json");

    const child = spawn(
      process.execPath,
      [join(process.cwd(), "scripts", "bank-sync-worker.mjs"), outPath],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OB_BANK: bankId,
          OB_RUT: rut,
          OB_PASS: password,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stderr = "";
    let lastProgress = "";
    child.stdout.on("data", (chunk) => {
      const line = String(chunk).trim();
      if (!line) return;
      lastProgress = line.replace(/^\[progreso\]\s*/, "");
      void db.bankSync
        .update({ where: { id: sync.id }, data: { message: lastProgress.slice(0, 200) } })
        .catch(() => {});
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    const timeout = setTimeout(() => child.kill("SIGKILL"), SYNC_TIMEOUT_MS);
    const code = await new Promise<number | null>((resolve) => {
      child.on("close", (exitCode) => resolve(exitCode));
      child.on("error", () => resolve(-1));
    }).finally(() => clearTimeout(timeout));

    if (!existsSync(outPath)) {
      const detail = stderr.trim().split("\n").slice(-3).join(" ").slice(0, 300);
      throw new Error(
        code === null
          ? `La sincronización no terminó a tiempo (${Math.round(SYNC_TIMEOUT_MS / 60000)} min). Reintenta o usa otro banco.`
          : `El scraper no devolvió resultado${detail ? `: ${detail}` : ""}.`,
      );
    }

    const result = JSON.parse(readFileSync(outPath, "utf8")) as ScraperResult;
    if (!result.success) {
      throw new Error(friendlySyncError(result.error));
    }

    const imported = await ingestResult(ctx.company.id, bankId, result);
    const message = `${imported} movimientos importados de ${bankName(bankId)}.`;
    await db.bankSync.update({
      where: { id: sync.id },
      data: { status: "success", message, imported, finishedAt: new Date() },
    });
    return { ok: true, imported, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.bankSync
      .update({
        where: { id: sync.id },
        data: {
          status: "error",
          message: message.slice(0, 500),
          finishedAt: new Date(),
        },
      })
      .catch(() => {});
    return { ok: false, imported: 0, message };
  } finally {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  }
}

/** Fecha DD-MM-YYYY del scraper a medianoche UTC (días de calendario, como el resto del dominio). */
function parseMovementDate(raw: string): Date | null {
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function fingerprintOf(date: Date, amount: number, description: string, source: string): string {
  return createHash("sha1")
    .update(`${date.toISOString().slice(0, 10)}|${amount}|${description.trim().toUpperCase()}|${source}`)
    .digest("hex");
}

/** Inserta cuentas y movimientos, sin duplicar (fingerprint por cuenta). */
async function ingestResult(companyId: string, bankId: string, result: ScraperResult): Promise<number> {
  const groups: Array<{ label: string; kind: "account" | "credit_card"; balance?: number; movements: ScraperMovement[] }> = [];

  if (result.accounts?.length) {
    for (const account of result.accounts) {
      groups.push({
        label: account.label || "Cuenta principal",
        kind: "account",
        balance: account.balance,
        movements: account.movements ?? [],
      });
    }
  } else if (result.movements?.length || typeof result.balance === "number") {
    groups.push({ label: "Cuenta principal", kind: "account", balance: result.balance, movements: result.movements ?? [] });
  }
  for (const card of result.creditCards ?? []) {
    groups.push({ label: card.label || "Tarjeta de crédito", kind: "credit_card", movements: card.movements ?? [] });
  }

  let imported = 0;
  for (const group of groups) {
    const account = await db.bankAccount.upsert({
      where: {
        companyId_bankId_label: { companyId, bankId, label: group.label },
      },
      create: { companyId, bankId, label: group.label, kind: group.kind, balance: group.balance ?? null, lastSyncAt: new Date() },
      update: { balance: group.balance ?? undefined, lastSyncAt: new Date() },
    });

    const rows = group.movements
      .map((movement) => {
        const date = parseMovementDate(movement.date);
        if (!date) return null;
        const amount = Math.round(movement.amount);
        const description = movement.description.trim().slice(0, 300);
        const source = movement.source ?? "account";
        return {
          companyId,
          accountId: account.id,
          date,
          description,
          amount,
          balance: typeof movement.balance === "number" ? Math.round(movement.balance) : null,
          source,
          fingerprint: fingerprintOf(date, amount, description, source),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) continue;
    const before = await db.bankMovement.count({ where: { accountId: account.id } });
    // skipDuplicates: un resync de la misma cartola no crea filas repetidas.
    await db.bankMovement.createMany({ data: rows, skipDuplicates: true });
    const after = await db.bankMovement.count({ where: { accountId: account.id } });
    imported += after - before;
  }

  return imported;
}

// ---------------------------------------------------------------------------
// Sugerencias de conciliación
// ---------------------------------------------------------------------------

export type Suggestion = {
  targetType: "purchase" | "sale";
  targetId: string;
  folio: string;
  partner: string;
  amount: number;
  date: Date;
  daysDiff: number;
  score: number;
};

/** Documento con el que quedó conciliado un movimiento. */
export type MovementReconciliation = {
  saleId: string | null;
  purchaseId: string | null;
  saleFolio: string | null;
  purchaseFolio: string | null;
  partner: string;
  createdAt: Date;
};

// Por qué un movimiento salió de la bandeja sin conciliarse. Un traspaso
// interno es plata que se movió entre cuentas propias: no es un cobro ni un
// pago. `noise` es lo que la persona descarta a mano.
export const MOVEMENT_MARKS = ["internal_transfer", "noise"] as const;
export type MovementMark = (typeof MOVEMENT_MARKS)[number];

export const MOVEMENT_MARK_LABELS: Record<MovementMark, string> = {
  internal_transfer: "Traspaso interno",
  noise: "Ignorado",
};

export function parseMovementMark(value: unknown): MovementMark | null {
  return (MOVEMENT_MARKS as readonly unknown[]).includes(value) ? (value as MovementMark) : null;
}

export type MovementWithMatch = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  balance: number | null;
  source: string;
  accountLabel: string;
  bankId: string;
  ignoredAt: Date | null;
  ignoredReason: MovementMark | null;
  reconciliation: MovementReconciliation | null;
  suggestions: Suggestion[];
};

// Vistas de la bandeja. "pendientes" es la vista de trabajo: sin conciliar y
// sin ignorar. "conciliados" e "ignorados" son el historial.
export const BOARD_STATES = ["pendientes", "sugeridos", "sin_sugerencia", "ignorados", "conciliados"] as const;
export type BoardState = (typeof BOARD_STATES)[number];

export const BOARD_STATE_LABELS: Record<BoardState, string> = {
  pendientes: "Pendientes",
  sugeridos: "Con coincidencia",
  sin_sugerencia: "Sin coincidencia",
  ignorados: "Ignorados",
  conciliados: "Conciliados",
};

export type BoardFilters = {
  estado: BoardState;
  q: string;
  desde: string;
  hasta: string;
  montoMin: string;
  montoMax: string;
  /** Id de un movimiento a destacar arriba (llega desde compras o ventas). */
  movimiento: string;
  pagina: string;
};

export const EMPTY_BOARD_FILTERS: BoardFilters = {
  estado: "pendientes",
  q: "",
  desde: "",
  hasta: "",
  montoMin: "",
  montoMax: "",
  movimiento: "",
  pagina: "",
};

const isoDay = (raw: string | undefined) => {
  const value = (raw ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
};

export function parseBoardFilters(raw: {
  estado?: string;
  q?: string;
  desde?: string;
  hasta?: string;
  montoMin?: string;
  montoMax?: string;
  movimiento?: string;
  pagina?: string;
}): BoardFilters {
  const estado = (BOARD_STATES as readonly string[]).includes(raw.estado ?? "")
    ? (raw.estado as BoardState)
    : "pendientes";
  return {
    estado,
    q: (raw.q ?? "").trim(),
    desde: isoDay(raw.desde),
    hasta: isoDay(raw.hasta),
    montoMin: (raw.montoMin ?? "").trim(),
    montoMax: (raw.montoMax ?? "").trim(),
    movimiento: (raw.movimiento ?? "").trim(),
    pagina: (raw.pagina ?? "").trim(),
  };
}

/** "379.972", "379972" o "$379.972" → 379972. Vacío o basura → null. */
function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

const CANDIDATE_WINDOW_DAYS = 370;
const CANDIDATE_FUTURE_DAYS = 45;
const DAY_MS = 86_400_000;

function scoreCandidate(
  movement: { amount: number; date: Date; description: string },
  candidate: { documentNumber: string | null; partnerName: string; date: Date },
): number {
  const description = movement.description.toUpperCase();
  let score = 10; // el monto ya coincide exacto: base
  const folio = candidate.documentNumber?.trim();
  if (folio && description.includes(folio)) score += 60;
  const partnerToken = candidate.partnerName.toUpperCase().split(/\s+/)[0];
  if (partnerToken.length >= 4 && description.includes(partnerToken)) score += 30;
  const days = Math.abs(Math.round((movement.date.getTime() - candidate.date.getTime()) / DAY_MS));
  score += Math.max(0, 20 - Math.floor(days / 3));
  return score;
}

type Candidate = {
  id: string;
  documentNumber: string | null;
  totalAmount: number;
  date: Date;
  partnerName: string;
};

type CandidateIndex = {
  purchases: Map<number, Candidate[]>;
  sales: Map<number, Candidate[]>;
};

function indexByAmount(rows: Candidate[]): Map<number, Candidate[]> {
  const index = new Map<number, Candidate[]>();
  for (const row of rows) {
    const bucket = index.get(row.totalAmount);
    if (bucket) bucket.push(row);
    else index.set(row.totalAmount, [row]);
  }
  return index;
}

/**
 * Documentos por pagar y por cobrar. Se indexan por monto porque la
 * coincidencia exacta de monto es el filtro duro: así un movimiento se compara
 * solo contra los documentos de su monto, no contra toda la cartera.
 */
async function loadCandidates(companyId: string): Promise<CandidateIndex> {
  const [purchases, sales] = await Promise.all([
    db.purchase.findMany({
      where: { companyId, status: "PENDING", totalAmount: { gt: 0 } },
      select: {
        id: true,
        documentNumber: true,
        totalAmount: true,
        date: true,
        partner: { select: { name: true } },
      },
    }),
    db.sale.findMany({
      where: { companyId, status: "PENDING", totalAmount: { gt: 0 } },
      select: {
        id: true,
        documentNumber: true,
        totalAmount: true,
        date: true,
        partner: { select: { name: true } },
      },
    }),
  ]);

  const toCandidate = (row: {
    id: string;
    documentNumber: string | null;
    totalAmount: number;
    date: Date;
    partner: { name: string };
  }): Candidate => ({
    id: row.id,
    documentNumber: row.documentNumber,
    totalAmount: row.totalAmount,
    date: row.date,
    partnerName: row.partner.name,
  });

  return {
    purchases: indexByAmount(purchases.map(toCandidate)),
    sales: indexByAmount(sales.map(toCandidate)),
  };
}

type MovementLike = { amount: number; date: Date; description: string };

/**
 * Mejores coincidencias de un movimiento: abonos contra ventas por cobrar y
 * cargos contra compras por pagar, por monto exacto y ventana de fechas. La
 * ventana deja 45 días hacia adelante (el pago puede ser posterior al documento)
 * y 370 hacia atrás.
 */
function suggestionsFor(movement: MovementLike, index: CandidateIndex): Suggestion[] {
  if (movement.amount === 0) return [];
  const target = Math.abs(movement.amount);
  const isInflow = movement.amount > 0;
  const pool = isInflow ? index.sales : index.purchases;
  const inWindow = (pool.get(target) ?? []).filter(
    (candidate) =>
      candidate.date.getTime() <= movement.date.getTime() + CANDIDATE_FUTURE_DAYS * DAY_MS &&
      candidate.date.getTime() >= movement.date.getTime() - CANDIDATE_WINDOW_DAYS * DAY_MS,
  );

  return inWindow
    .map((candidate) => ({
      targetType: isInflow ? ("sale" as const) : ("purchase" as const),
      targetId: candidate.id,
      folio: candidate.documentNumber ?? "sin folio",
      partner: candidate.partnerName,
      amount: candidate.totalAmount,
      date: candidate.date,
      daysDiff: Math.round((movement.date.getTime() - candidate.date.getTime()) / DAY_MS),
      score: scoreCandidate(movement, {
        documentNumber: candidate.documentNumber,
        partnerName: candidate.partnerName,
        date: candidate.date,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

const MOVEMENT_INCLUDE = {
  account: { select: { label: true, bankId: true } },
  reconciliations: {
    select: {
      createdAt: true,
      purchase: { select: { id: true, documentNumber: true, partner: { select: { name: true } } } },
      sale: { select: { id: true, documentNumber: true, partner: { select: { name: true } } } },
    },
  },
} satisfies Prisma.BankMovementInclude;

type MovementRow = Prisma.BankMovementGetPayload<{ include: typeof MOVEMENT_INCLUDE }>;

function reconciliationOf(link: MovementRow["reconciliations"][number] | undefined): MovementReconciliation | null {
  if (!link) return null;
  const counterpart = link.sale?.partner.name ?? link.purchase?.partner.name ?? "Sin contraparte";
  return {
    saleId: link.sale?.id ?? null,
    purchaseId: link.purchase?.id ?? null,
    saleFolio: link.sale?.documentNumber ?? null,
    purchaseFolio: link.purchase?.documentNumber ?? null,
    partner: counterpart,
    createdAt: link.createdAt,
  };
}

function toMovement(row: MovementRow, index: CandidateIndex | null): MovementWithMatch {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    balance: row.balance,
    source: row.source,
    accountLabel: row.account.label,
    bankId: row.account.bankId,
    ignoredAt: row.ignoredAt,
    ignoredReason: parseMovementMark(row.ignoredReason),
    reconciliation: reconciliationOf(row.reconciliations[0]),
    suggestions: index ? suggestionsFor(row, index) : [],
  };
}

/** Filtros que la base resuelve sola: empresa, estado, fechas y glosa. */
function movementWhere(companyId: string, filters: BoardFilters): Prisma.BankMovementWhereInput {
  const where: Prisma.BankMovementWhereInput = { companyId };

  if (filters.estado === "conciliados") {
    where.reconciliations = { some: {} };
  } else if (filters.estado === "ignorados") {
    where.ignoredAt = { not: null };
    where.reconciliations = { none: {} };
  } else {
    where.ignoredAt = null;
    where.reconciliations = { none: {} };
  }

  if (filters.desde || filters.hasta) {
    where.date = {
      ...(filters.desde ? { gte: new Date(`${filters.desde}T00:00:00.000Z`) } : {}),
      ...(filters.hasta ? { lte: new Date(`${filters.hasta}T23:59:59.999Z`) } : {}),
    };
  }

  if (filters.q) {
    const text: Prisma.StringFilter = { contains: filters.q, mode: "insensitive" };
    // En el historial también se busca por folio y contraparte del documento.
    where.OR =
      filters.estado === "conciliados"
        ? [
            { description: text },
            { reconciliations: { some: { purchase: { documentNumber: text } } } },
            { reconciliations: { some: { sale: { documentNumber: text } } } },
            { reconciliations: { some: { purchase: { partner: { name: text } } } } },
            { reconciliations: { some: { sale: { partner: { name: text } } } } },
          ]
        : [{ description: text }];
  }

  return where;
}

/** Filtros que quedan en memoria: monto (siempre en valor absoluto) y coincidencia. */
function matchesAmount(movement: MovementLike, min: number | null, max: number | null): boolean {
  const amount = Math.abs(movement.amount);
  return (min === null || amount >= min) && (max === null || amount <= max);
}

/**
 * Glosa de un traspaso entre cuentas: "Traspaso A Cuenta:008178288402". El
 * número de cuenta es lo que separa un traspaso propio de un pago a un
 * tercero ("Traspaso A:Servipag ltda"): sin él, el movimiento no se toca.
 */
const ACCOUNT_TRANSFER_RE =
  /\b(?:traspaso|transferencia)\s+(?:a|de|desde|hacia)\s+(?:la\s+)?cuenta\s*:?\s*\d{5,}/i;

export function looksLikeAccountTransfer(description: string): boolean {
  return ACCOUNT_TRANSFER_RE.test(description);
}

const TRANSFER_COUNTERPART_DAYS = 5;

/**
 * Movimientos que parecen un traspaso entre cuentas propias: la glosa nombra una
 * cuenta y el mismo monto aparece con el signo opuesto a pocos días. Es una
 * pista para marcar en lote, no una certeza: la persona la confirma desde la
 * bandeja, y siempre se puede restituir.
 */
export function internalTransferCandidates(movements: MovementWithMatch[]): MovementWithMatch[] {
  const window = TRANSFER_COUNTERPART_DAYS * DAY_MS;
  return movements.filter(
    (movement) =>
      looksLikeAccountTransfer(movement.description) &&
      movements.some(
        (other) =>
          other.id !== movement.id &&
          other.amount === -movement.amount &&
          Math.abs(other.date.getTime() - movement.date.getTime()) <= window,
      ),
  );
}

export type BatchMatch = {
  movementId: string;
  movementDate: Date;
  targetType: "purchase" | "sale";
  targetId: string;
  amount: number;
  folio: string;
  partner: string;
};

export type BoardBatch = {
  matches: BatchMatch[];
  purchases: { count: number; total: number };
  sales: { count: number; total: number };
};

/**
 * Coincidencia única: el monto calza exacto con un solo documento. Con dos o
 * más candidatos hay ambigüedad y decide la persona, no la app.
 */
function uniqueMatchOf(movement: MovementWithMatch): BatchMatch | null {
  if (movement.suggestions.length !== 1) return null;
  const [only] = movement.suggestions;
  return {
    movementId: movement.id,
    movementDate: movement.date,
    targetType: only.targetType,
    targetId: only.targetId,
    amount: only.amount,
    folio: only.folio,
    partner: only.partner,
  };
}

function buildBatch(movements: MovementWithMatch[], min: number | null, max: number | null): BoardBatch {
  const matches: BatchMatch[] = [];
  for (const movement of movements) {
    if (!matchesAmount(movement, min, max)) continue;
    const match = uniqueMatchOf(movement);
    if (match) matches.push(match);
  }

  const sum = (type: "purchase" | "sale") =>
    matches.filter((match) => match.targetType === type).reduce((acc, match) => acc + match.amount, 0);

  return {
    matches,
    purchases: { count: matches.filter((match) => match.targetType === "purchase").length, total: sum("purchase") },
    sales: { count: matches.filter((match) => match.targetType === "sale").length, total: sum("sale") },
  };
}

export type ReconciliationBoard = {
  accounts: Array<{ id: string; bankId: string; label: string; kind: string; balance: number | null; lastSyncAt: Date | null; movements: number }>;
  movements: MovementWithMatch[];
  /** Movimiento pedido explícitamente desde una compra o venta. */
  highlight: MovementWithMatch | null;
  lastSyncs: Array<{ id: string; bankId: string; status: string; message: string | null; startedAt: Date; imported: number }>;
  totals: { unlinked: number; ignored: number; linked: number; page: number; pageCount: number; filtered: number };
  batch: BoardBatch;
  /** Pendientes que parecen traspasos entre cuentas propias (para marcar en lote). */
  internalTransfers: MovementWithMatch[];
};

/**
 * Bandeja de conciliación: movimientos con sus mejores coincidencias, ya
 * filtrados y paginados.
 *
 * Los pendientes se cargan siempre (no solo cuando la vista los pide) porque de
 * ahí sale el contador de coincidencias únicas del botón de conciliación en
 * lote, que actúa sobre todo lo pendiente que calce con los filtros activos.
 */
export async function loadReconciliationBoard(
  companyId: string,
  filters: BoardFilters,
): Promise<ReconciliationBoard> {
  const pendingScope: BoardFilters = { ...filters, estado: "pendientes", pagina: "" };
  const min = parseAmount(filters.montoMin);
  const max = parseAmount(filters.montoMax);

  const [accounts, lastSyncs, pendingRows, index] = await Promise.all([
    db.bankAccount.findMany({
      where: { companyId },
      orderBy: [{ bankId: "asc" }, { label: "asc" }],
      include: { _count: { select: { movements: true } } },
    }),
    db.bankSync.findMany({ where: { companyId }, orderBy: { startedAt: "desc" }, take: 5 }),
    db.bankMovement.findMany({
      where: movementWhere(companyId, pendingScope),
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: MOVEMENT_INCLUDE,
    }),
    loadCandidates(companyId),
  ]);

  const pendingItems = pendingRows.map((row) => toMovement(row, index));
  const batch = buildBatch(pendingItems, min, max);
  const internalTransfers = internalTransferCandidates(pendingItems).filter((movement) =>
    matchesAmount(movement, min, max),
  );

  // Vista pedida: la de trabajo ya está cargada; el historial de conciliados se
  // consulta aparte (ahí no hay nada que sugerir, ya está vinculado).
  let items: MovementWithMatch[];
  if (filters.estado === "conciliados") {
    const rows = await db.bankMovement.findMany({
      where: movementWhere(companyId, filters),
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: MOVEMENT_INCLUDE,
    });
    items = rows.map((row) => toMovement(row, null));
  } else if (filters.estado === "ignorados") {
    const rows = await db.bankMovement.findMany({
      where: movementWhere(companyId, filters),
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: MOVEMENT_INCLUDE,
    });
    // Los ignorados igual muestran coincidencias: sirve para decidir si se
    // restituyen y se concilian.
    items = rows.map((row) => toMovement(row, index));
  } else {
    items = pendingItems;
  }

  if (min !== null || max !== null) {
    items = items.filter((movement) => matchesAmount(movement, min, max));
  }
  if (filters.estado === "sugeridos") items = items.filter((movement) => movement.suggestions.length > 0);
  if (filters.estado === "sin_sugerencia") items = items.filter((movement) => movement.suggestions.length === 0);

  const highlight = filters.movimiento
    ? await loadHighlight(companyId, filters.movimiento, filters.estado)
    : null;

  const { items: pageItems, page, pageCount } = paginate(items, parsePage(filters.pagina));

  const [unlinked, ignored, linked] = await Promise.all([
    db.bankMovement.count({ where: { companyId, ignoredAt: null, reconciliations: { none: {} } } }),
    db.bankMovement.count({ where: { companyId, ignoredAt: { not: null }, reconciliations: { none: {} } } }),
    db.reconciliation.count({ where: { companyId } }),
  ]);

  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      bankId: account.bankId,
      label: account.label,
      kind: account.kind,
      balance: account.balance,
      lastSyncAt: account.lastSyncAt,
      movements: account._count.movements,
    })),
    movements: pageItems,
    highlight,
    lastSyncs: lastSyncs.map((sync) => ({
      id: sync.id,
      bankId: sync.bankId,
      status: sync.status,
      message: sync.message,
      startedAt: sync.startedAt,
      imported: sync.imported,
    })),
    totals: { unlinked, ignored, linked, page, pageCount, filtered: items.length },
    batch,
    internalTransfers,
  };
}

/** Un movimiento puntual, para el enlace que llega desde compras o ventas. */
async function loadHighlight(
  companyId: string,
  movementId: string,
  estado: BoardState,
): Promise<MovementWithMatch | null> {
  const row = await db.bankMovement.findFirst({
    where: { id: movementId, companyId },
    include: MOVEMENT_INCLUDE,
  });
  if (!row) return null;
  const needsSuggestions = estado !== "conciliados" && row.reconciliations.length === 0;
  return toMovement(row, needsSuggestions ? await loadCandidates(companyId) : null);
}

/** Cuántos movimientos esperan conciliación: aviso del sidebar. */
export async function countPendingMovements(companyId: string): Promise<number> {
  return db.bankMovement.count({
    where: { companyId, ignoredAt: null, reconciliations: { none: {} } },
  });
}

