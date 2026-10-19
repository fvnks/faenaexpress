"use client";

import { useFormStatus } from "react-dom";

import { syncBank } from "@/app/actions/banco";
import { controlClass, labelClass, primaryButtonClass } from "@/lib/ui";

type BankOption = { id: string; name: string; note?: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButtonClass + " sm:w-48"}>
      {pending ? "Sincronizando…" : "Sincronizar"}
    </button>
  );
}

/**
 * Credenciales del banco para una corrida: no se guardan, no se autocompletan
 * y no viajan a ningún otro lugar que el proceso del scraper.
 */
export function SyncForm({ banks }: { banks: BankOption[] }) {
  return (
    <form action={syncBank} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bankId" className={labelClass}>
          Banco
        </label>
        <select id="bankId" name="bankId" className={controlClass} defaultValue="santander">
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rut" className={labelClass}>
          RUT del titular
        </label>
        <input
          id="rut"
          name="rut"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="12.345.678-9"
          className={controlClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          Clave del banco
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="off"
          placeholder="••••••••"
          className={controlClass}
        />
      </div>
      <SubmitButton />
      <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
        Las credenciales no se guardan: se usan solo para esta corrida y se borran al
        terminar. El scraper abre un navegador en el servidor y puede tardar entre 1 y 3
        minutos; si el banco pide un segundo factor, la corrida falla y hay que reintentar.
      </p>
    </form>
  );
}
