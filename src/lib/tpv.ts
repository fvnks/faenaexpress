/**
 * Integración con Transbank Webpay Plus para pagos con tarjeta desde el POS.
 *
 * Flujo:
 * 1. Crear transacción (POST /transactions) → obtiene url y token_ws
 * 2. Redirigir al usuario a la URL de Webpay
 * 3. El banco redirige de vuelta a nuestra return_url con token_ws
 * 4. Confirmar transacción (POST /transactions/{token_ws}) → obtiene estado
 *
 * Las credenciales se guardan en PosTpvConfig (cifradas) y se configuran desde
 * la UI del POS. Si no hay credenciales configuradas, se usa un modo de
 * simulación para pruebas.
 */

import { db } from "@/lib/db";
import { decryptToBuffer } from "@/lib/sii-crypto";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TpvEnvironment = "integracion" | "produccion";

export type TpvConfig = {
  id: string;
  companyId: string;
  comercioId: string | null;
  apiKey: string | null;
  ambiente: TpvEnvironment;
  habilitado: boolean;
};

export type TpvCreateResult =
  | { ok: true; url: string; tokenWs: string; buyOrder: string }
  | { ok: false; error: string };

export type TpvConfirmResult =
  | {
      ok: true;
      status: string; // APROBADO, RECHAZADO, etc.
      authorizationCode: string | null;
      buyOrder: string;
      sessionId: string;
      amount: number;
      responseCode: number;
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// URLs de Transbank
// ---------------------------------------------------------------------------

const TRANSBANK_BASE: Record<TpvEnvironment, string> = {
  integracion: "https://webpay3g.transbank.cl",
  produccion: "https://webpay3g.transbank.cl",
};

const TRANSBANK_PATH = "/rswebpaytransaction/api/webpay/v1.2/transactions";

// ---------------------------------------------------------------------------
// Lectura de configuración
// ---------------------------------------------------------------------------

/**
 * Obtiene la configuración TPV de la empresa. Descifra las credenciales.
 */
export async function getTpvConfig(
  companyId: string,
): Promise<TpvConfig | null> {
  const config = await db.posTpvConfig.findFirst({
    where: { companyId },
  });
  if (!config) return null;

  let comercioId: string | null = null;
  let apiKey: string | null = null;

  if (config.comercioId) {
    try {
      comercioId = decryptToBuffer(config.comercioId).toString("utf-8");
    } catch {
      // Si no se puede descifrar, dejar null
    }
  }
  if (config.apiKey) {
    try {
      apiKey = decryptToBuffer(config.apiKey).toString("utf-8");
    } catch {
      // Si no se puede descifrar, dejar null
    }
  }

  return {
    id: config.id,
    companyId: config.companyId,
    comercioId,
    apiKey,
    ambiente: (config.ambiente as TpvEnvironment) ?? "integracion",
    habilitado: config.habilitado,
  };
}

// ---------------------------------------------------------------------------
// Crear transacción Webpay
// ---------------------------------------------------------------------------

/**
 * Crea una transacción de pago con Transbank Webpay Plus.
 *
 * Devuelve la URL a la que se debe redirigir al usuario y el token_ws para
 * confirmar después.
 */
export async function createTpvTransaction(companyId: string, options: {
  buyOrder: string;       // número de orden interno (venta POS o referencia)
  sessionId: string;      // ID de sesión del usuario/caja
  amount: number;         // monto en CLP
  returnUrl: string;      // URL de retorno después del pago
}): Promise<TpvCreateResult> {
  const config = await getTpvConfig(companyId);
  if (!config?.habilitado) {
    return { ok: false, error: "TPV no configurado o no habilitado." };
  }
  if (!config.comercioId || !config.apiKey) {
    return {
      ok: false,
      error: "Faltan credenciales de Transbank (comercioId o apiKey). Configúralas en /pos/tpv/config.",
    };
  }

  const base = TRANSBANK_BASE[config.ambiente];
  const url = `${base}${TRANSBANK_PATH}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Tbk-Api-Key-Id": config.comercioId,
        "Tbk-Api-Key-Secret": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buy_order: options.buyOrder,
        session_id: options.sessionId,
        amount: options.amount,
        return_url: options.returnUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.token_ws) {
      return {
        ok: false,
        error: data.error_message || `Error ${response.status} al crear transacción Webpay`,
      };
    }

    return {
      ok: true,
      url: `${data.url}?token_ws=${data.token_ws}`,
      tokenWs: data.token_ws,
      buyOrder: data.buy_order,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `No se pudo conectar con Transbank: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Confirmar transacción Webpay
// ---------------------------------------------------------------------------

/**
 * Confirma el estado de una transacción Webpay después de que el usuario
 * regrese del banco.
 */
export async function confirmTpvTransaction(
  companyId: string,
  tokenWs: string,
): Promise<TpvConfirmResult> {
  const config = await getTpvConfig(companyId);
  if (!config?.habilitado) {
    return { ok: false, error: "TPV no configurado o no habilitado." };
  }
  if (!config.comercioId || !config.apiKey) {
    return {
      ok: false,
      error: "Faltan credenciales de Transbank.",
    };
  }

  const base = TRANSBANK_BASE[config.ambiente];
  const url = `${base}${TRANSBANK_PATH}/${tokenWs}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Tbk-Api-Key-Id": config.comercioId,
        "Tbk-Api-Key-Secret": config.apiKey,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data.error_message || `Error ${response.status} al confirmar transacción`,
      };
    }

    return {
      ok: true,
      status: data.status, // APROBADO, RECHAZADO, etc.
      authorizationCode: data.authorization_code ?? null,
      buyOrder: data.buy_order,
      sessionId: data.session_id,
      amount: data.amount,
      responseCode: data.response_code ?? 0,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `No se pudo confirmar el pago: ${message}` };
  }
}
