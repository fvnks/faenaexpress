import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";

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
  reconciliation: { saleFolio: string | null; purchaseFolio: string | null } | null;
  suggestions: Suggestion[];
};

const CANDIDATE_WINDOW_DAYS = 370;

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
  const days = Math.abs(Math.round((movement.date.getTime() - candidate.date.getTime()) / 86_400_000));
  score += Math.max(0, 20 - Math.floor(days / 3));
  return score;
}

/**
 * Movimientos sin conciliar con sus mejores coincidencias: abonos contra
 * ventas por cobrar y cargos contra compras por pagar, por monto exacto y
 * ventana de fechas. Un movimiento ya conciliado o ignorado no se sugiere.
 */
export async function loadReconciliationBoard(companyId: string): Promise<{
  accounts: Array<{ id: string; bankId: string; label: string; kind: string; balance: number | null; lastSyncAt: Date | null; movements: number }>;
  movements: MovementWithMatch[];
  lastSyncs: Array<{ id: string; bankId: string; status: string; message: string | null; startedAt: Date; imported: number }>;
  totals: { unlinked: number; ignored: number; linked: number };
}> {
  const [accounts, lastSyncs, movementRows] = await Promise.all([
    db.bankAccount.findMany({
      where: { companyId },
      orderBy: [{ bankId: "asc" }, { label: "asc" }],
      include: { _count: { select: { movements: true } } },
    }),
    db.bankSync.findMany({ where: { companyId }, orderBy: { startedAt: "desc" }, take: 5 }),
    db.bankMovement.findMany({
      where: { companyId, reconciliations: { none: {} } },
      orderBy: { date: "desc" },
      take: 120,
      include: { account: { select: { label: true, bankId: true } } },
    }),
  ]);

  const visible = movementRows.filter((movement) => movement.ignoredAt === null);
  const needsMatch = visible.filter((movement) => movement.amount !== 0);

  const [purchases, sales] = await Promise.all([
    needsMatch.some((movement) => movement.amount < 0)
      ? db.purchase.findMany({
          where: { companyId, status: "PENDING", totalAmount: { gt: 0 } },
          select: { id: true, documentNumber: true, totalAmount: true, date: true, partner: { select: { name: true } } },
        })
      : Promise.resolve([]),
    needsMatch.some((movement) => movement.amount > 0)
      ? db.sale.findMany({
          where: { companyId, status: "PENDING", totalAmount: { gt: 0 } },
          select: { id: true, documentNumber: true, totalAmount: true, date: true, partner: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const movements: MovementWithMatch[] = visible.map((movement) => {
    const targetAmount = Math.abs(movement.amount);
    const pool = movement.amount > 0 ? sales : purchases;
    const inWindow = pool.filter(
      (candidate) =>
        candidate.totalAmount === targetAmount &&
        candidate.date.getTime() <= movement.date.getTime() + 45 * 86_400_000 &&
        candidate.date.getTime() >= movement.date.getTime() - CANDIDATE_WINDOW_DAYS * 86_400_000,
    );
    const suggestions: Suggestion[] = inWindow
      .map((candidate) => ({
        targetType: movement.amount > 0 ? ("sale" as const) : ("purchase" as const),
        targetId: candidate.id,
        folio: candidate.documentNumber ?? "sin folio",
        partner: candidate.partner.name,
        amount: candidate.totalAmount,
        date: candidate.date,
        daysDiff: Math.round((movement.date.getTime() - candidate.date.getTime()) / 86_400_000),
        score: scoreCandidate(movement, {
          documentNumber: candidate.documentNumber,
          partnerName: candidate.partner.name,
          date: candidate.date,
        }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      id: movement.id,
      date: movement.date,
      description: movement.description,
      amount: movement.amount,
      balance: movement.balance,
      source: movement.source,
      accountLabel: movement.account.label,
      bankId: movement.account.bankId,
      ignoredAt: movement.ignoredAt,
      reconciliation: null,
      suggestions,
    };
  });

  const [ignored, linked] = await Promise.all([
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
    movements,
    lastSyncs: lastSyncs.map((sync) => ({
      id: sync.id,
      bankId: sync.bankId,
      status: sync.status,
      message: sync.message,
      startedAt: sync.startedAt,
      imported: sync.imported,
    })),
    totals: { unlinked: visible.length, ignored, linked },
  };
}
