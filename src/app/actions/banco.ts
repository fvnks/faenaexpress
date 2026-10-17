"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { bankName, isKnownBank, runBankSync } from "@/lib/banco";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP, formatDate } from "@/lib/money";

/**
 * Conciliación bancaria. Todas las acciones validan rol (solo
 * administración y contabilidad ven el banco) y alcance por empresa.
 */

export async function syncBank(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "banco")) {
    redirect("/dashboard/banco");
  }

  const bankId = String(formData.get("bankId") ?? "").trim();
  const rut = String(formData.get("rut") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isKnownBank(bankId)) {
    await setFlash("error", "Elige un banco de la lista.");
    redirect("/dashboard/banco");
  }
  if (!rut || !password) {
    await setFlash("error", "Ingresa el RUT y la clave del banco.");
    redirect("/dashboard/banco");
  }

  // Larga: 1-3 minutos dentro del scraper. La clave vive solo en memoria y
  // en el entorno del proceso hijo.
  const outcome = await runBankSync(ctx, bankId, rut, password);

  if (outcome.ok) {
    await setFlash("success", "Sincronización lista", outcome.message);
  } else {
    await setFlash("error", "La sincronización falló", outcome.message);
  }
  revalidatePath("/dashboard/banco");
  revalidatePath("/dashboard");
  redirect("/dashboard/banco");
}

export async function conciliarMovimiento(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "banco")) {
    redirect("/dashboard/banco");
  }

  const movementId = String(formData.get("movementId") ?? "");
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");

  const movement = await db.bankMovement.findFirst({
    where: { id: movementId, companyId: ctx.company.id },
  });
  if (!movement || movement.ignoredAt) {
    await setFlash("error", "El movimiento ya no está disponible.");
    redirect("/dashboard/banco");
  }
  const existing = await db.reconciliation.findUnique({ where: { movementId } });
  if (existing) {
    await setFlash("error", "Ese movimiento ya está conciliado.");
    redirect("/dashboard/banco");
  }

  const movementAmount = Math.abs(movement.amount);
  const movementDescription = `el movimiento del ${formatDate(movement.date)} por ${formatCLP(movementAmount)}`;

  if (targetType === "purchase") {
    const purchase = await db.purchase.findFirst({ where: { id: targetId, companyId: ctx.company.id } });
    if (!purchase) {
      await setFlash("error", "La compra ya no existe.");
      redirect("/dashboard/banco");
    }
    if (purchase.status !== "PENDING") {
      await setFlash("error", `La compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}ya está pagada.`);
      redirect("/dashboard/banco");
    }
    if (purchase.totalAmount !== movementAmount) {
      await setFlash("error", "El monto del movimiento no coincide con el total de la compra.");
      redirect("/dashboard/banco");
    }

    await db.$transaction([
      db.purchase.update({
        where: { id: purchase.id },
        data: { status: "PAID", paymentDate: movement.date, paymentMethod: "TRANSFER" },
      }),
      db.reconciliation.create({
        data: { companyId: ctx.company.id, movementId, purchaseId: purchase.id, createdById: ctx.user.id },
      }),
    ]);

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Purchase",
      entityId: purchase.id,
      summary: `Concilió ${movementDescription} con la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber}` : "sin folio"}.`,
      changes: { status: { before: purchase.status, after: "PAID" } },
    });
    await setFlash("success", "Compra conciliada", `Marcada como pagada con ${movementDescription}.`);
    revalidatePath("/dashboard/compras");
  } else if (targetType === "sale") {
    const sale = await db.sale.findFirst({ where: { id: targetId, companyId: ctx.company.id } });
    if (!sale) {
      await setFlash("error", "La venta ya no existe.");
      redirect("/dashboard/banco");
    }
    if (sale.status !== "PENDING") {
      await setFlash("error", `La venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}ya está cobrada.`);
      redirect("/dashboard/banco");
    }
    if (sale.totalAmount !== movementAmount) {
      await setFlash("error", "El monto del movimiento no coincide con el total de la venta.");
      redirect("/dashboard/banco");
    }

    await db.$transaction([
      db.sale.update({
        where: { id: sale.id },
        data: { status: "PAID", paymentDate: movement.date },
      }),
      db.reconciliation.create({
        data: { companyId: ctx.company.id, movementId, saleId: sale.id, createdById: ctx.user.id },
      }),
    ]);

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: sale.id,
      summary: `Concilió ${movementDescription} con la venta ${sale.documentNumber ? `N° ${sale.documentNumber}` : "sin folio"}.`,
      changes: { status: { before: sale.status, after: "PAID" } },
    });
    await setFlash("success", "Venta conciliada", `Marcada como cobrada con ${movementDescription}.`);
    revalidatePath("/dashboard/ventas");
  } else {
    await setFlash("error", "Tipo de conciliación desconocido.");
    redirect("/dashboard/banco");
  }

  revalidatePath("/dashboard/banco");
  revalidatePath("/dashboard");
  redirect("/dashboard/banco");
}

export async function toggleMovimientoIgnorado(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "banco")) {
    redirect("/dashboard/banco");
  }

  const movementId = String(formData.get("movementId") ?? "");
  const movement = await db.bankMovement.findFirst({
    where: { id: movementId, companyId: ctx.company.id },
  });
  if (!movement) {
    await setFlash("error", "El movimiento ya no existe.");
    redirect("/dashboard/banco");
  }
  if (movement.ignoredAt) {
    await db.bankMovement.update({ where: { id: movement.id }, data: { ignoredAt: null } });
    await setFlash("success", "Movimiento restituido", "Vuelve a la lista por conciliar.");
  } else {
    await db.bankMovement.update({ where: { id: movement.id }, data: { ignoredAt: new Date() } });
    await setFlash("success", "Movimiento ignorado", "No se sugerirá para conciliar.");
  }
  revalidatePath("/dashboard/banco");
  redirect("/dashboard/banco");
}

export async function eliminarCuenta(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "banco")) {
    redirect("/dashboard/banco");
  }

  const id = String(formData.get("id") ?? "");
  const account = await db.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!account) {
    await setFlash("error", "La cuenta ya no existe.");
    redirect("/dashboard/banco");
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
  revalidatePath("/dashboard/banco");
  redirect("/dashboard/banco");
}
