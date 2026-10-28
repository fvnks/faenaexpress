"use server";

import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP } from "@/lib/money";
import { encryptForStorage } from "@/lib/sii-crypto";
import { checkPlanLimit, incrementUsage } from "@/lib/plans";
import { createTpvTransaction, confirmTpvTransaction, type TpvConfirmResult } from "@/lib/tpv";
import { revalidatePath } from "next/cache";

export type TpvActionState =
  | { error?: string; ok?: boolean; url?: string; tokenWs?: string }
  | undefined;

/**
 * Crea una venta POS con estado PENDING y un pago TPV pendiente, y luego crea
 * la transacción en Transbank para redirigir al usuario al banco.
 *
 * El flujo es:
 * 1. Se registra la venta POS con status PENDING y un pago TPV con el monto total
 * 2. Se crea la transacción en Transbank (obtiene url y token_ws)
 * 3. Se redirige al usuario a la URL de Webpay
 * 4. El usuario paga y regresa a /pos/tpv/retorno
 * 5. Se confirma la transacción y se marca la venta como COMPLETED
 */
export async function createPosSaleForTpv(
  _prev: TpvActionState,
  formData: FormData,
): Promise<TpvActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) {
    return { error: "No tienes permiso para vender en el punto de venta." };
  }

  const raw = String(formData.get("payload") ?? "");
  let payload: {
    partnerId?: string | null;
    items: Array<{ productId: string; quantity: number; discount: number }>;
    payments: Array<{ method: string; amount: number; reference?: string | null }>;
    notes?: string | null;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "No se pudo leer la venta. Recarga la página e intenta de nuevo." };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return { error: "Agrega al menos un producto." };

  const session = await db.posSession.findFirst({
    where: {
      companyId: ctx.company.id,
      openedById: ctx.user.id,
      status: "OPEN",
    },
  });
  if (!session) return { error: "Abre la caja antes de vender." };

  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "documents");
  if (bloqueado) return { error: bloqueado };

  // Calcular total desde los ítems (el servidor recalcula, no confía en el cliente)
  // Necesitamos los precios de los productos. Los traemos de la BD.
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, companyId: ctx.company.id, active: true },
    select: { id: true, name: true, priceNet: true, ivaAffected: true, tracksStock: true },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "Uno de los productos ya no está disponible." };
    if (product.priceNet === null) {
      return { error: `«${product.name}» no tiene precio de venta configurado.` };
    }
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `La cantidad de «${product.name}» no es válida.` };
    }
    const rawDiscount = Number(item.discount ?? 0);
    if (!Number.isFinite(rawDiscount) || rawDiscount < 0) {
      return { error: `El descuento de «${product.name}» no es válido.` };
    }
    const lineNet = Math.round(product.priceNet * quantity) - Math.round(rawDiscount);
    if (lineNet < 0) {
      return { error: `El descuento de «${product.name}» supera su valor.` };
    }
    subtotal += lineNet;
    tax += Math.round((lineNet * (product.ivaAffected ? ctx.company.ivaRate : 0)) / 100);
  }
  const total = subtotal + tax;

  // Buscar el pago TPV (debe haber uno con monto = total)
  const tpvPayment = payload.payments.find(
    (p) => p.method.toLowerCase().includes("tarjeta") && p.amount === total,
  );
  if (!tpvPayment) {
    return { error: "Debe agregar un pago con tarjeta por el monto total para usar TPV." };
  }

  let saleId = "";
  let saleNumber = "";
  try {
    const result = await db.$transaction(async (tx) => {
      // Crear la venta con estado PENDING (esperando pago TPV)
      const sn = await nextSaleNumber(tx, ctx.company.id);
      const sale = await tx.posSale.create({
        data: {
          companyId: ctx.company.id,
          sessionId: session.id,
          saleNumber: sn,
          partnerId: payload.partnerId || null,
          subtotal,
          tax,
          discount: items.reduce((sum, item) => sum + Number(item.discount ?? 0), 0),
          total,
          amountPaid: 0, // aún no se ha pagado
          balanceDue: total, // todo pendiente
          status: "PENDING",
          notes: String(payload.notes ?? "").trim() || null,
          userId: ctx.user.id,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                name: product.name,
                quantity: item.quantity,
                unitPrice: product.priceNet ?? 0,
                discount: Math.round(Number(item.discount ?? 0)),
                lineTotal:
                  Math.round((product.priceNet ?? 0) * item.quantity) -
                  Math.round(Number(item.discount ?? 0)),
              };
            }),
          },
          payments: {
            create: [
              {
                method: tpvPayment.method,
                amount: total, // se marcará como pagado al confirmar TPV
                reference: tpvPayment.reference,
              },
            ],
          },
        },
      });

      // Crear un registro de transacción TPV pendiente
      await tx.posTpvTransaction.create({
        data: {
          companyId: ctx.company.id,
          saleId: sale.id,
          buyOrder: `POS-${sn}`,
          sessionId: session.id,
          amount: total,
          status: "PENDING",
          tokenWs: null,
          authorizationCode: null,
          responseCode: null,
        },
      });

      return { saleId: sale.id, saleNumber: sn };
    });

    saleId = result.saleId;
    saleNumber = result.saleNumber;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo registrar la venta.";
    return { error: message };
  }

  if (!saleId) return { error: "No se pudo registrar la venta." };

  if (organizationId) {
    await incrementUsage(organizationId, { documents: 1 });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosSale",
    entityId: saleId,
    summary: `Registró una venta POS por ${formatCLP(total)} con pago TPV pendiente.`,
  });

  // Crear la transacción en Transbank para obtener la URL de pago
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pos/tpv/retorno`;
  const tpvResult = await createTpvTransaction(ctx.company.id, {
    buyOrder: `POS-${saleId}`,
    sessionId: session.id,
    amount: total,
    returnUrl,
  });

  if (!tpvResult.ok) {
    // Si falla la creación de TPV, marcar la venta como fallada para que se pueda reintentar
    await db.posSale.update({
      where: { id: saleId },
      data: { status: "VOIDED", notes: "Error al crear transacción TPV: " + tpvResult.error },
    });
    return { error: tpvResult.error };
  }

  // Guardar el token_ws en la transacción TPV
  await db.posTpvTransaction.update({
    where: { saleId },
    data: { tokenWs: tpvResult.tokenWs },
  });

  await setFlash("success", "Pago con tarjeta", "Serás redirigido a Transbank para completar el pago.");
  revalidatePath("/pos");
  revalidatePath("/pos/venta");
  revalidatePath("/pos/ventas");

  return {
    ok: true,
    url: tpvResult.url,
    tokenWs: tpvResult.tokenWs,
  };
}

async function nextSaleNumber(tx: any, companyId: string) {
  const last = await tx.posSale.findFirst({
    where: { companyId },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });
  const numeric = last ? Number(last.saleNumber.replace(/\D/g, "")) : 0;
  const next = Number.isFinite(numeric) ? numeric + 1 : 1;
  return `PV-${String(next).padStart(6, "0")}`;
}

/**
 * Confirma una transacción TPV después de que el usuario regrese del banco.
 * Si el pago fue aprobado, marca la venta POS como COMPLETED y registra el pago.
 */
export async function confirmTpvSale(
  saleId: string,
  tokenWs: string,
): Promise<{ ok: boolean; error?: string; status?: string }> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) {
    return { ok: false, error: "No tienes permiso para vender en el punto de venta." };
  }

  const sale = await db.posSale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    include: {
      session: true,
      posTpvTransaction: true,
    },
  });
  if (!sale) return { ok: false, error: "La venta no existe." };
  if (sale.status !== "PENDING") {
    return { ok: false, error: "Esa venta no está esperando pago TPV." };
  }

  const tpvTx = sale.posTpvTransaction[0];
  if (!tpvTx || tpvTx.tokenWs !== tokenWs) {
    return { ok: false, error: "Token de transacción no válido." };
  }

  // Confirmar con Transbank
  const confirmResult = await confirmTpvTransaction(ctx.company.id, tokenWs);

  if (!confirmResult.ok) {
    // Marcar la transacción TPV como fallida
    await db.posTpvTransaction.update({
      where: { saleId },
      data: {
        status: "ERROR",
        responseCode: 999,
      },
    });
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosSale",
      entityId: saleId,
      summary: `Pago TPV falló para venta ${sale.saleNumber}: ${confirmResult.error}`,
    });
    return { ok: false, error: confirmResult.error };
  }

  const isApproved = confirmResult.status === "APROBADO";

  // Actualizar la transacción TPV
  await db.posTpvTransaction.update({
    where: { saleId },
    data: {
      status: isApproved ? "APROBADO" : "RECHAZADO",
      authorizationCode: confirmResult.authorizationCode,
      responseCode: confirmResult.responseCode,
    },
  });

  if (isApproved) {
    // Marcar la venta como COMPLETED y registrar el pago
    await db.$transaction([
      db.posSale.update({
        where: { id: saleId },
        data: {
          status: "COMPLETED",
          amountPaid: sale.total,
          balanceDue: 0,
          notes: [
            sale.notes,
            `Pago TPV aprobado (autorización ${confirmResult.authorizationCode})`,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        },
      }),
      db.posPayment.updateMany({
        where: { saleId, method: { contains: "tarjeta", mode: "insensitive" } },
        data: {
          amount: confirmResult.amount,
          reference: confirmResult.authorizationCode,
        },
      }),
    ]);

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosSale",
      entityId: saleId,
      summary: `Pago TPV aprobado para venta ${sale.saleNumber} (autorización ${confirmResult.authorizationCode}).`,
    });

    revalidatePath("/pos");
    revalidatePath("/pos/ventas");
    revalidatePath(`/pos/ventas/${saleId}`);
    revalidatePath("/pos/caja");

    return { ok: true, status: confirmResult.status };
  } else {
    // Pago rechazado: marcar la venta como VOIDED (anulada)
    await db.posSale.update({
      where: { id: saleId },
      data: {
        status: "VOIDED",
        notes: [
          sale.notes,
          `Pago TPV rechazado (código ${confirmResult.responseCode})`,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      },
    });

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosSale",
      entityId: saleId,
      summary: `Pago TPV rechazado para venta ${sale.saleNumber} (código ${confirmResult.responseCode}).`,
    });

    revalidatePath("/pos");
    revalidatePath("/pos/ventas");

    return { ok: false, error: `El pago fue rechazado por el banco (código ${confirmResult.responseCode}).`, status: confirmResult.status };
  }
}

/**
 * Server Action wrapper para crear una venta con pago TPV desde un form.
 */
export async function createPosSaleForTpvAction(
  _prev: TpvActionState,
  formData: FormData,
): Promise<TpvActionState> {
  return createPosSaleForTpv(_prev, formData);
}

/**
 * Server Action wrapper para confirmar un pago TPV desde un form (retorno del banco).
 */
export async function confirmTpvSaleAction(
  _prev: { error?: string; ok?: boolean; status?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; status?: string } | undefined> {
  const saleId = String(formData.get("saleId") ?? "");
  const tokenWs = String(formData.get("token_ws") ?? "");
  return confirmTpvSale(saleId, tokenWs);
}

// ---------------------------------------------------------------------------
// Configuración TPV (credenciales de Transbank Webpay Plus)
// ---------------------------------------------------------------------------

export type TpvConfigState = {
  comercioId: string | null;
  apiKey: string | null;
  ambiente: "integracion" | "produccion";
  habilitado: boolean;
};

export type TpvConfigActionState =
  | { error?: string; ok?: boolean; config?: TpvConfigState }
  | undefined;

/**
 * Obtiene la configuración TPV actual de la empresa (sin mostrar las credenciales
 * cifradas en texto plano).
 */
export async function getTpvConfigAction(
  _prev: TpvConfigActionState | undefined,
): Promise<TpvConfigActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el TPV." };
  }

  const config = await db.posTpvConfig.findFirst({
    where: { companyId: ctx.company.id },
  });
  if (!config) {
    return {
      ok: true,
      config: {
        comercioId: null,
        apiKey: null,
        ambiente: "integracion",
        habilitado: false,
      },
    };
  }

  return {
    ok: true,
    config: {
      comercioId: config.comercioId ?? null,
      apiKey: config.apiKey ? "***configurada***" : null,
      ambiente: config.ambiente as "integracion" | "produccion",
      habilitado: config.habilitado,
    },
  };
}

/**
 * Guarda o actualiza la configuración TPV de la empresa. Las credenciales se
 * cifran antes de guardarlas en la base de datos.
 */
export async function saveTpvConfigAction(
  _prev: TpvConfigActionState | undefined,
  formData: FormData,
): Promise<TpvConfigActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el TPV." };
  }

  const comercioId = String(formData.get("comercioId") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const ambiente = String(formData.get("ambiente") ?? "integracion");
  const habilitado = formData.get("habilitado") === "on";

  if (!comercioId || !apiKey) {
    return { error: "Comercio ID y API Key son requeridos." };
  }
  if (ambiente !== "integracion" && ambiente !== "produccion") {
    return { error: "El ambiente debe ser 'integracion' o 'produccion'." };
  }

  try {
    const comercioIdEncrypted = encryptForStorage(comercioId);
    const apiKeyEncrypted = encryptForStorage(apiKey);

    const existing = await db.posTpvConfig.findFirst({
      where: { companyId: ctx.company.id },
    });

    if (existing) {
      await db.posTpvConfig.update({
        where: { id: existing.id },
        data: {
          comercioId: comercioIdEncrypted,
          apiKey: apiKeyEncrypted,
          ambiente,
          habilitado,
        },
      });
    } else {
      await db.posTpvConfig.create({
        data: {
          companyId: ctx.company.id,
          comercioId: comercioIdEncrypted,
          apiKey: apiKeyEncrypted,
          ambiente,
          habilitado,
        },
      });
    }

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosTpvConfig",
      entityId: ctx.company.id,
      summary: `Configuró TPV (Transbank Webpay Plus) ambiente=${ambiente}, habilitado=${habilitado}.`,
    });

    revalidatePath("/pos/tpv/config");
    revalidatePath("/pos/venta");

    return {
      ok: true,
      config: {
        comercioId,
        apiKey: "***configurada***",
        ambiente,
        habilitado,
      },
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { error: `No se pudo guardar la configuración TPV: ${message}` };
  }
}

/**
 * Elimina la configuración TPV de la empresa.
 */
export async function deleteTpvConfigAction(
  _prev: TpvConfigActionState | undefined,
): Promise<TpvConfigActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) {
    return { error: "No tienes permiso para configurar el TPV." };
  }

  await db.posTpvConfig.deleteMany({
    where: { companyId: ctx.company.id },
  });

  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "PosTpvConfig",
    entityId: ctx.company.id,
    summary: "Eliminó la configuración TPV (Transbank Webpay Plus).",
  });

  revalidatePath("/pos/tpv/config");
  revalidatePath("/pos/venta");

  return { ok: true };
}

