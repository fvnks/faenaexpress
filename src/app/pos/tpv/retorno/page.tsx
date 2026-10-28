"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { confirmTpvSaleAction } from "@/app/actions/tpv";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";

export default function PosTpvRetornoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error" | null>(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // Leer token_ws y buy_order de la URL
    const searchParams = new URLSearchParams(window.location.search);
    const tokenWs = searchParams.get("token_ws") ?? "";
    const buyOrder = searchParams.get("buy_order") ?? "";

    // Extraer saleId del buy_order (formato: POS-PV-XXXXXX)
    const saleIdMatch = buyOrder.match(/POS-(PV-\d+)/);
    const extractedSaleId = saleIdMatch ? saleIdMatch[1] : null;

    if (!tokenWs || !extractedSaleId) {
      setStatus("error");
      setMessage("Parámetros de pago incompletos.");
      return;
    }

    setSaleId(extractedSaleId);

    // Llamar a la acción de confirmación
    const formData = new FormData();
    formData.append("saleId", extractedSaleId);
    formData.append("token_ws", tokenWs);

    confirmTpvSaleAction(undefined, formData).then((result) => {
      if (result?.ok) {
        setStatus("ok");
        setMessage(
          `Pago aprobado. Autorización: ${result.status ?? "N/A"}`,
        );
      } else {
        setStatus("error");
        setMessage(result?.error ?? "Error desconocido al confirmar el pago.");
      }
    });
  }, []);

  if (status === "loading") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="flex h-12 w-12 rounded-full bg-primary-soft items-center justify-center">
          <svg className="h-6 w-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Procesando pago…</h2>
        <p className="text-sm text-muted-foreground">
          Esperando la respuesta del banco. No cierre esta página.
        </p>
      </div>
    );
  }

  const isOk = status === "ok";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-10">
      <div className="flex h-16 w-16 rounded-full items-center justify-center">
        <svg
          className={`h-8 w-8 ${isOk ? "text-success" : "text-danger"}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          {isOk ? (
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              d="M5 13l4 4L19 7"
            />
          ) : (
            <g>
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 6l12 12" />
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M18 6l-12 12" />
            </g>
          )}
        </svg>
      </div>

      <h2 className="text-xl font-bold tracking-tight">
        {isOk ? "Pago aprobado" : "Pago rechazado"}
      </h2>

      <p className="text-sm text-muted-foreground">{message}</p>

      {saleId && amount !== null && authorizationCode && isOk ? (
        <section className={cardClass + " p-4"}>
          <h3 className="text-sm font-semibold mb-2">Detalle del pago</h3>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Venta</dt>
              <dd className="tabular font-mono text-xs">{saleId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Monto</dt>
              <dd className="tabular">{formatCLP(amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Autorización</dt>
              <dd className="tabular font-mono text-xs">{authorizationCode}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {saleId ? (
          <Link
            href={`/pos/ventas/${saleId}`}
            className={primaryButtonClass}
          >
            Ver venta
          </Link>
        ) : null}
        <Link href="/pos/venta" className={secondaryButtonClass}>
          Nueva venta
        </Link>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
