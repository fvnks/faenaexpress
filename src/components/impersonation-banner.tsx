"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { stopImpersonation } from "@/app/actions/platform";

// Banner de impersonación: está en toda la app mientras dura, con salida a un
// clic y la cuenta regresiva del tope duro. Nunca puede esconderse: si el
// operador se pierde en la cuenta del cliente, tiene que ver que está dentro.
//
// El restante se calcula en el SERVIDOR y se pasa como prop: si el cliente lo
// calculara al renderizar, el servidor y el navegador discreparían por un
// segundo y React abortaría la hidratación (el botón «Salir» dejaría de
// funcionar).
export function ImpersonationBanner({
  organizationName,
  targetName,
  reason,
  until,
}: {
  organizationName: string;
  targetName: string;
  reason: string | null;
  /** ISO string del fin del tope. */
  until: string;
}) {
  // El tiempo vivo se calcula solo en el cliente. Si el servidor lo calculara
  // también, el HTML y la carga útil llegarían con valores distintos (la
  // diferencia de un segundo entre una pasada y otra) y React abortaría la
  // hidratación: el botón «Salir» dejaré de funcionar. En el servidor se
  // muestra el tope, que es un dato fijo.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const ms = remainingMs(until);
      setRemaining(ms);
      if (ms <= 0) {
        toast.error("Se acabó el tiempo de la impersonación", {
          description: "Vuelve a entrar a la cuenta del cliente para seguir.",
        });
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [until]);

  const agotado = remaining !== null && remaining <= 0;
  const minutes = remaining === null ? null : Math.floor(remaining / 60000);
  const seconds = remaining === null ? null : Math.floor((remaining % 60000) / 1000);

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2 text-sm " +
        (agotado
          ? "border-danger bg-danger-soft text-danger"
          : "border-accent/40 bg-accent-soft text-foreground")
      }
    >
      <p className="min-w-0">
        <span className="font-semibold">Estás dentro de la cuenta de {organizationName}</span>
        <span className="text-muted-foreground"> · como {targetName}</span>
        {reason ? <span className="text-muted-foreground"> · {reason}</span> : null}
      </p>
      <div className="flex items-center gap-3">
        <span className="tabular font-medium">
          {minutes === null
            ? "máx. 30 min"
            : agotado
              ? "tiempo agotado"
              : `quedan ${minutes}:${String(seconds).padStart(2, "0")}`}
        </span>
        <form action={stopImpersonation}>
          <button
            type="submit"
            className="rounded-control border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground hover:bg-background"
          >
            Salir de la cuenta
          </button>
        </form>
      </div>
    </div>
  );
}

function remainingMs(until: string): number {
  return Math.max(0, new Date(until).getTime() - Date.now());
}
