"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import {
  bankName,
  isKnownBank,
  loadReconciliationBoard,
  parseBoardFilters,
  runBankSync,
  type BoardFilters,
} from "@/lib/banco";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP, formatDate } from "@/lib/money";

/**
 * Conciliación bancaria. Todas las acciones validan rol (solo
 * administración y contabilidad ven el banco) y alcance por empresa.
 *
 * El vínculo movimiento ↔ documento vive en `linkMovement`: lo usan la
 * conciliación de a uno y la de lote, así que las dos validan exactamente lo
 * mismo (monto, estado del documento, que no esté ya conciliado).
 */

const BANCO_PATH = "/dashboard/banco";

/**
 * A dónde volver tras una acción. Solo se acepta la propia bandeja: un
 * `returnTo` armado a mano no puede redirigir a otro sitio.
 */
function returnTo(formData: FormData): string {
  const raw = String(formData.get("returnTo") ?? "");
  return raw.startsWith(BANCO_PATH) ? raw : BANCO_PATH;
}

/** Los filtros de la bandeja viajan como campos ocultos del formulario. */
function filtersFromForm(formData: FormData): BoardFilters {
  const read = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return parseBoardFilters({
    estado: read("estado"),
    q: read("q"),
    desde: read("desde"),
    hasta: read("hasta"),
    montoMin: read("montoMin"),
    montoMax: read("montoMax"),
    pagina: read("pagina"),
  });
}

type MovementForLink = { id: string; date: Date; amount: number };

type LinkResult = { ok: true; kind: "purchase" | "sale"; label: string } | { ok: false; error: string };

/**
 * Marca el documento como pagado/cobrado con la fecha del movimiento y guarda
 * la conciliación. No toca `confirmingAt` de las ventas: eso es del módulo de
 * confirming, no del banco.
 */
async function linkMovement(
  ctx: Awaited<ReturnType<typeof requireContext>>,
  movement: MovementForLink,
  targetType: string,
  targetId: string,
): Promise<LinkResult> {
  const movementAmount = Math.abs(movement.amount);
  const movementDescription = `el movimiento del ${formatDate(movement.date)} por ${formatCLP(movementAmount)}`;

  if (targetType === "purchase") {
    const purchase = await db.purchase.findFirst({ where: { id: targetId, companyId: ctx.company.id } });
    if (!purchase) return { ok: false, error: "La compra ya no existe." };
    if (purchase.status !== "PENDING") {
      return { ok: false, error: `La compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}ya está pagada.` };
    }
    if (purchase.totalAmount !== movementAmount) {
      return { ok: false, error: "El monto del movimiento no coincide con el total de la compra." };
    }

    await db.$transaction([
      db.purchase.update({
        where: { id: purchase.id },
        data: { status: "PAID", paymentDate: movement.date, paymentMethod: "TRANSFER" },
      }),
      db.reconciliation.create({
        data: { companyId: ctx.company.id, movementId: movement.id, purchaseId: purchase.id, createdById: ctx.user.id },
      }),
    ]);

    const label = `compra ${purchase.documentNumber ? `N° ${purchase.documentNumber}` : "sin folio"}`;
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Purchase",
      entityId: purchase.id,
      summary: `Concilió ${movementDescription} con la ${label}.`,
      changes: { status: { before: purchase.status, after: "PAID" } },
    });
    revalidatePath("/dashboard/compras");
    revalidatePath("/dashboard/compras/[id]", "page");
    return { ok: true, kind: "purchase", label };
  }

  if (targetType === "sale") {
    const sale = await db.sale.findFirst({ where: { id: targetId, companyId: ctx.company.id } });
    if (!sale) return { ok: false, error: "La venta ya no existe." };
    if (sale.status !== "PENDING") {
      return { ok: false, error: `La venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}ya está cobrada.` };
    }
    if (sale.totalAmount !== movementAmount) {
      return { ok: false, error: "El monto del movimiento no coincide con el total de la venta." };
    }

    await db.$transaction([
      db.sale.update({
        where: { id: sale.id },
        data: { status: "PAID", paymentDate: movement.date },
      }),
      db.reconciliation.create({
        data: { companyId: ctx.company.id, movementId: movement.id, saleId: sale.id, createdById: ctx.user.id },
      }),
    ]);

    const label = `venta ${sale.documentNumber ? `N° ${sale.documentNumber}` : "sin folio"}`;
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: sale.id,
      summary: `Concilió ${movementDescription} con la ${label}.`,
      changes: { status: { before: sale.status, after: "PAID" } },
    });
    revalidatePath("/dashboard/ventas");
    revalidatePath("/dashboard/ventas/[id]", "page");
    return { ok: true, kind: "sale", label };
  }

  return { ok: false, error: "Tipo de conciliación desconocido." };
}

export async function syncBank(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "banco")) {
    redirect(BANCO_PATH);
  }

  const bankId = String(formData.get("bankId") ?? "").trim();
  const rut = String(formData.get("rut") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isKnownBank(bankId)) {
    await setFlash("error", "Elige un banco de la lista.");
    redirect(BANCO_PATH);
  }
  if (!rut || !password) {
    await setFlash("error", "Ingresa el RUT y la clave del banco.");
    redirect(BANCO_PATH);
  }

  // Larga: 1-3 minutos dentro del scraper. La clave vive solo en memoria y
  // en el entorno del proceso hijo.
  const outcome = await runBankSync(ctx, bankId, rut, password);

  if (outcome.ok) {
    await setFlash("success", "Sincronización lista", outcome.message);
  } else {
    await setFlash("error", "La sincronización falló", outcome.message);
  }
  revalidatePath(BANCO_PATH);
  revalidatePath("/dashboard");
  redirect(BANCO_PATH);
}

export async function conciliarMovimiento(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const back = returnTo(formData);
  if (!canWrite(ctx, "banco")) {
    redirect(back);
  }

  const movementId = String(formData.get("movementId") ?? "");
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");

  const movement = await db.bankMovement.findFirst({
    where: { id: movementId, companyId: ctx.company.id },
  });
  if (!movement || movement.ignoredAt) {
    await setFlash("error", "El movimiento ya no está disponible.");
    redirect(back);
  }
  const existing = await db.reconciliation.findUnique({ where: { movementId } });
  if (existing) {
    await setFlash("error", "Ese movimiento ya está conciliado.");
    redirect(back);
  }

  const result = await linkMovement(ctx, movement, targetType, targetId);
  if (!result.ok) {
    await setFlash("error", "No se pudo conciliar", result.error);
  } else {
    const movementAmount = Math.abs(movement.amount);
    await setFlash(
      "success",
      result.kind === "purchase" ? "Compra conciliada" : "Venta conciliada",
      `Marcada como ${result.kind === "purchase" ? "pagada" : "cobrada"} con el movimiento del ${formatDate(movement.date)} por ${formatCLP(movementAmount)}.`,
    );
  }

  revalidatePath(BANCO_PATH);
  revalidatePath("/dashboard");
  redirect(back);
}

/**
 * Conciliación en lote: cierra los movimientos cuya coincidencia es única (el
 * monto calza exacto con un solo documento). Con dos o más candidatos hay
 * ambigüedad y decide la persona.
 *
 * Los movimientos se recalculan acá con los mismos filtros que el usuario tenía
 * a la vista, así que lo que se concilia es lo que la pantalla mostró. Las
 * validaciones de cada vínculo son las mismas de la conciliación de a uno.
 */
export async function conciliarSugerencias(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const back = returnTo(formData);
  if (!canWrite(ctx, "banco")) {
    redirect(back);
  }

  const filters = filtersFromForm(formData);
  const board = await loadReconciliationBoard(ctx.company.id, filters);
  const matches = board.batch.matches;

  if (matches.length === 0) {
    await setFlash("error", "No hay coincidencias únicas", "Ningún movimiento pendiente calza con un solo documento.");
    redirect(back);
  }

  const movements = await db.bankMovement.findMany({
    where: { id: { in: matches.map((match) => match.movementId) }, companyId: ctx.company.id },
  });
  const byId = new Map(movements.map((movement) => [movement.id, movement]));

  let linked = 0;
  let purchases = 0;
  let sales = 0;
  let failed = 0;

  for (const match of matches) {
    const movement = byId.get(match.movementId);
    if (!movement) {
      failed += 1;
      continue;
    }
    // Cada vínculo se valida solo: un documento que dejó de estar pendiente
    // (otra pestaña, otra persona) se salta sin botar el resto del lote.
    const result = await linkMovement(ctx, movement, match.targetType, match.targetId);
    if (!result.ok) {
      failed += 1;
      continue;
    }
    linked += 1;
    if (result.kind === "purchase") purchases += 1;
    else sales += 1;
  }

  const parts = [
    purchases > 0 ? `${purchases} ${purchases === 1 ? "compra" : "compras"}` : null,
    sales > 0 ? `${sales} ${sales === 1 ? "venta" : "ventas"}` : null,
  ].filter((part): part is string => part !== null);

  if (linked === 0) {
    await setFlash(
      "error",
      "No se concilió nada",
      failed > 0 ? "Los documentos cambiaron de estado mientras mirabas la bandeja." : "Revisa los movimientos e inténtalo de nuevo.",
    );
  } else {
    await setFlash(
      "success",
      `${linked} ${linked === 1 ? "movimiento conciliado" : "movimientos conciliados"}`,
      `Se marcaron ${parts.join(" y ")} como pagadas o cobradas con la fecha del movimiento.` +
        (failed > 0 ? ` ${failed} ${failed === 1 ? "quedó" : "quedaron"} fuera por cambios de estado.` : ""),
    );
  }

  revalidatePath(BANCO_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/compras");
  revalidatePath("/dashboard/ventas");
  redirect(back);
}

export async function toggleMovimientoIgnorado(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const back = returnTo(formData);
  if (!canWrite(ctx, "banco")) {
    redirect(back);
  }

  const movementId = String(formData.get("movementId") ?? "");
  const movement = await db.bankMovement.findFirst({
    where: { id: movementId, companyId: ctx.company.id },
  });
  if (!movement) {
    await setFlash("error", "El movimiento ya no existe.");
    redirect(back);
  }
  if (movement.ignoredAt) {
    await db.bankMovement.update({ where: { id: movement.id }, data: { ignoredAt: null } });
    await setFlash("success", "Movimiento restituido", "Vuelve a la lista por conciliar.");
  } else {
    await db.bankMovement.update({ where: { id: movement.id }, data: { ignoredAt: new Date() } });
    await setFlash("success", "Movimiento ignorado", "No se sugerirá para conciliar.");
  }
  revalidatePath(BANCO_PATH);
  redirect(back);
}

export async function eliminarCuenta(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const back = returnTo(formData);
  if (!canWrite(ctx, "banco")) {
    redirect(back);
  }

  const id = String(formData.get("id") ?? "");
  const account = await db.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!account) {
    await setFlash("error", "La cuenta ya no existe.");
    redirect(back);
  }

  // Cascada: borra movimientos y conciliaciones de la cuenta. Los documentos
  // ya marcados como pagados/cobrados conservan su estado.
  await db.bankAccount.delete({ where: { id } });
  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "BankAccount",
    entityId: account.id,
    summary: `Eliminó la cuenta "${account.label}" de ${bankName(account.bankId)} y sus movimientos.`,
  });
  await setFlash("success", "Cuenta eliminada", `Se borraron los movimientos de ${account.label}.`);
  revalidatePath(BANCO_PATH);
  redirect(BANCO_PATH);
}
