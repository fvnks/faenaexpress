"use client";

import { useState } from "react";
import { toast } from "sonner";

import { dismissPendingInvite } from "@/app/actions/platform";
import { secondaryButtonClass } from "@/lib/ui";

// Enlace de invitación recién generado. Se pinta en el servidor (viene de una
// cookie corta) para que sobreviva a la revalidación de la página.
export function InviteLinkPanel({
  url,
  email,
}: {
  url: string;
  email: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-4 rounded-card border border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Invitación lista para {email}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Mándale este enlace al contacto. Vence en 72 horas y sirve por una sola vez.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-control border border-border bg-surface px-3 py-2 text-xs">
          {url}
        </code>
        <button
          type="button"
          className={secondaryButtonClass + " py-1.5 text-sm"}
          onClick={() => {
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              toast.success("Enlace copiado");
            });
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
        <form action={dismissPendingInvite}>
          <button type="submit" className={secondaryButtonClass + " py-1.5 text-sm"}>
            Cerrar
          </button>
        </form>
      </div>
    </div>
  );
}
