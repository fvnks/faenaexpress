"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { switchObra } from "@/app/actions/obras";

// Selector de obra. Mismo patrón que el de colegios y el de empresas, con su
// propia cookie: un usuario puede estar en varios módulos a la vez.
export function ObraSwitcher({
  obras,
  activeId,
}: {
  obras: { id: string; name: string }[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (obras.length === 0) return null;

  const cambiar = (id: string) => {
    if (id === activeId) return;
    startTransition(async () => {
      await switchObra(id);
      router.refresh();
    });
  };

  if (obras.length === 1) {
    return (
      <span className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-medium">
        {obras[0].name}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Obra</span>
      <select
        value={activeId ?? ""}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value)}
        className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground disabled:opacity-60"
      >
        {obras.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
