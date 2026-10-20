"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { switchSchool } from "@/app/actions/schools";

// Selector de colegio. Mismo patrón que el de empresas, pero con su propia
// cookie: un usuario puede estar en un colegio y en una empresa a la vez.
export function SchoolSwitcher({
  schools,
  activeId,
}: {
  schools: { id: string; name: string }[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (schools.length === 0) return null;

  const cambiar = (id: string) => {
    if (id === activeId) return;
    startTransition(async () => {
      await switchSchool(id);
      router.refresh();
    });
  };

  if (schools.length === 1) {
    return (
      <span className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-medium">
        {schools[0].name}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Colegio</span>
      <select
        value={activeId ?? ""}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value)}
        className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground disabled:opacity-60"
      >
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
