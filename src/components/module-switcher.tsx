"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { switchModule } from "@/app/actions/modules";

/**
 * Dropdown de módulos para la barra superior, con el mismo patrón del selector
 * de empresas: trigger de contorno con chevron y menú de tarjeta.
 *
 * Solo lo renderiza el layout cuando hay más de un módulo visible: con un solo
 * módulo no existe el cambio y el control sería adorno.
 */
export function ModuleSwitcher({
  modules,
  activeCode,
}: {
  modules: { code: string; name: string }[];
  activeCode: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = modules.find((m) => m.code === activeCode) ?? modules[0];
  const otros = modules.filter((m) => m.code !== activeCode);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (modules.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-background"
      >
        <span className="max-w-[9rem] truncate font-medium text-foreground">{active?.name}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 opacity-60" aria-hidden="true">
          <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-52 rounded-card border border-border bg-surface p-1 shadow-lg">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Módulos
          </div>
          <ul className="flex flex-col">
            {otros.map((module) => (
              <li key={module.code}>
                <form action={switchModule}>
                  <input type="hidden" name="code" value={module.code} />
                  <button
                    type="submit"
                    className="flex w-full items-center rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background"
                  >
                    <span className="flex-1 truncate font-medium text-foreground">
                      {module.name}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <div className="mx-1 my-1 border-t border-border" />
          <Link
            href="/modulos"
            onClick={() => setOpen(false)}
            className="flex items-center rounded-control px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            Todos los módulos
          </Link>
        </div>
      ) : null}
    </div>
  );
}
