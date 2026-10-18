"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import {
  bankName,
  isKnownBank,
  loadReconciliationBoard,
  parseBoardFilters,
  parseMovementMark,
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

type LinkResult =
  | { ok: true; kind: "purchase" | "sale" | "expense"; label: string }
  | { ok: false; error: string };

/**
 * Marca el documento como pagado/cobrado con la fecha del movimiento y guarda
 * la conciliación. No toca `confirmingAt` de las ventas: eso es del módulo de
 * confirming, no del banco.
 *
 * Un gasto se cierra igual, pero lo que se marca es el reembolso: el movimiento
 * es la plata que salió para devolverle a quien pagó. Por eso solo se ofrecen
 * gastos pendientes de reembolso.
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

  if (targetType === "expense") {
    if (movement.amount > 0) {
      return { ok: false, error: "Un abono no puede ser el reembolso de un gasto." };
    }
    const expense = await db.expense.findFirst({ where: { id: targetId, companyId: ctx.company.id } });
    if (!expense) return { ok: false, error: "El gasto ya no existe." };
    if (expense.reimbursed) {
      return { ok: false, error: `El gasto «${expense.description}» ya está reembolsado.` };
    }
    if (expense.totalAmount !== movementAmount) {
      return { ok: false, error: "El monto del movimiento no coincide con el total del gasto." };
    }

    await db.$transaction([
      db.expense.update({
        where: { id: expense.id },
        data: { reimbursed: true, reimbursedAt: movement.date },
      }),
      db.reconciliation.create({
        data: {
          companyId: ctx.company.id,
          movementId: movement.id,
          expenseId: expense.id,
          createdById: ctx.user.id,
        },
      }),
    ]);

    const label = `gasto «${expense.description}»`;
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Expense",
      entityId: expense.id,
      summary: `Concilió ${movementDescription} con el ${label}: queda reembolsado.`,
      changes: { reimbursed: { before: expense.reimbursed, after: true } },
    });
    revalidatePath("/dashboard/gastos");
    revalidatePath("/dashboard/gastos/[id]", "page");
    revalidatePath("/dashboard");
    return { ok: true, kind: "expense", label };
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
    const when = `con el movimiento del ${formatDate(movement.date)} por ${formatCLP(movementAmount)}`;
    if (result.kind === "expense") {
      await setFlash("success", "Gasto conciliado", `Queda reembolsado ${when}.`);
    } else {
      await setFlash(
        "success",
        result.kind === "purchase" ? "Compra conciliada" : "Venta conciliada",
        `Marcada como ${result.kind === "purchase" ? "pagada" : "cobrada"} ${when}.`,
      );
    }
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
    else if (result.kind === "sale") sales += 1;
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
  // Un traspaso entre cuentas propias sale de la bandeja por su propio motivo:
  // no es un cobro ni un pago, y el historial lo muestra distinto de un
  // descarte cualquiera.
  const mark = parseMovementMark(formData.get("marca")) ?? "noise";

  const movement = await db.bankMovement.findFirst({
    where: { id: movementId, companyId: ctx.company.id },
  });
  if (!movement) {
    await setFlash("error", "El movimiento ya no existe.");
    redirect(back);
  }
  if (movement.ignoredAt) {
    await db.bankMovement.update({
      where: { id: movement.id },
      data: { ignoredAt: null, ignoredReason: null },
    });
    await setFlash("success", "Movimiento restituido", "Vuelve a la lista por conciliar.");
  } else if (mark === "internal_transfer") {
    await db.bankMovement.update({
      where: { id: movement.id },
      data: { ignoredAt: new Date(), ignoredReason: mark },
    });
    await setFlash(
      "success",
      "Marcado como traspaso interno",
      "Es plata que se movió entre cuentas propias: no se sugerirá para conciliar.",
    );
  } else {
    await db.bankMovement.update({
      where: { id: movement.id },
      data: { ignoredAt: new Date(), ignoredReason: mark },
    });
    await setFlash("success", "Movimiento ignorado", "No se sugerirá para conciliar.");
  }
  revalidatePath(BANCO_PATH);
  redirect(back);
}

/**
 * Marca en lote los movimientos que parecen traspasos entre cuentas propias.
 * Se recalculan con los mismos filtros que el usuario tenía a la vista, así que
 * lo que se marca es lo que la pantalla mostró, y solo si sigue pendiente.
 */
export async function marcarTraspasosInternos(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const back = returnTo(formData);
  if (!canWrite(ctx, "banco")) {
    redirect(back);
  }

  const board = await loadReconciliationBoard(ctx.company.id, filtersFromForm(formData));
  const candidates = board.internalTransfers;

  if (candidates.length === 0) {
    await setFlash(
      "error",
      "No hay traspasos que marcar",
      "Ningún movimiento pendiente con estos filtros parece un traspaso entre cuentas propias.",
    );
    redirect(back);
  }

  const total = candidates.reduce((acc, movement) => acc + Math.abs(movement.amount), 0);
  const marked = await db.bankMovement.updateMany({
    where: {
      id: { in: candidates.map((movement) => movement.id) },
      companyId: ctx.company.id,
      ignoredAt: null,
    },
    data: { ignoredAt: new Date(), ignoredReason: "internal_transfer" },
  });

  await setFlash(
    "success",
    `${marked.count} ${marked.count === 1 ? "traspaso interno" : "traspasos internos"} marcados`,
    `Por ${formatCLP(total)}. Salen de la bandeja: son movimientos entre cuentas propias, no cobros ni pagos.`,
  );
  revalidatePath(BANCO_PATH);
  redirect(back);
}

/**
 * Deshace una conciliación: borra el vínculo y devuelve el documento al estado
 * en que el banco no participaba. La venta cobrada por Confirming se queda como
 * está: eso lo decide el módulo de confirming, no el banco.
 */
export async function deshacerConciliacion(formData: FormData): Promise<void> {
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

  const link = await db.reconciliation.findUnique({
    where: { movementId: movement.id },
    include: {
      purchase: { select: { id: true, documentNumber: true, status: true } },
      sale: { select: { id: true, documentNumber: true, status: true, confirmingAt: true } },
      expense: { select: { id: true, description: true, reimbursed: true } },
    },
  });
  if (!link) {
    await setFlash("error", "Ese movimiento no está conciliado.");
    redirect(back);
  }

  const revertPurchase = link.purchase !== null && link.purchase.status === "PAID";
  const revertSale =
    link.sale !== null && link.sale.status === "PAID" && link.sale.confirmingAt === null;
  // Un gasto solo entra a la conciliación cuando estaba pendiente de reembolso,
  // así que deshacerlo lo devuelve a pendiente sin ambigüedad.
  const revertExpense = link.expense !== null && link.expense.reimbursed;

  await db.$transaction(async (tx) => {
    await tx.reconciliation.delete({ where: { id: link.id } });
    if (revertPurchase && link.purchase) {
      await tx.purchase.update({
        where: { id: link.purchase.id },
        data: { status: "PENDING", paymentDate: null, paymentMethod: null },
      });
    }
    if (revertSale && link.sale) {
      await tx.sale.update({
        where: { id: link.sale.id },
        data: { status: "PENDING", paymentDate: null },
      });
    }
    if (revertExpense && link.expense) {
      await tx.expense.update({
        where: { id: link.expense.id },
        data: { reimbursed: false, reimbursedAt: null },
      });
    }
  });

  const reverted = revertPurchase || revertSale || revertExpense;
  const isExpense = link.expense !== null;
  const entityType = link.purchase ? "Purchase" : link.sale ? "Sale" : "Expense";
  const documentId = link.purchase?.id ?? link.sale?.id ?? link.expense?.id ?? null;
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType,
    entityId: documentId,
    summary:
      `Deshizo la conciliación del movimiento del ${formatDate(movement.date)} por ${formatCLP(Math.abs(movement.amount))}` +
      (reverted
        ? isExpense
          ? ": el gasto vuelve a estar pendiente de reembolso."
          : ": el documento vuelve a estar pendiente."
        : ": el documento queda como estaba."),
    changes: reverted
      ? isExpense
        ? { reimbursed: { before: true, after: false } }
        : { status: { before: "PAID", after: "PENDING" } }
      : undefined,
  });

  await setFlash(
    "success",
    "Conciliación deshecha",
    reverted
      ? isExpense
        ? "El movimiento vuelve a la bandeja y el gasto queda pendiente de reembolso."
        : "El movimiento vuelve a la bandeja y el documento queda pendiente."
      : "El movimiento vuelve a la bandeja. La venta sigue cobrada por Confirming.",
  );
  revalidatePath(BANCO_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/compras");
  revalidatePath("/dashboard/compras/[id]", "page");
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard/ventas/[id]", "page");
  revalidatePath("/dashboard/gastos");
  revalidatePath("/dashboard/gastos/[id]", "page");
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
