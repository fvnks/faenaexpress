"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  deleteSavedView,
  saveSavedView,
  setDefaultSavedView,
  type SavedViewItem,
} from "@/app/actions/saved-views";
import { secondaryButtonClass } from "@/lib/ui";

/** Selector de vistas guardadas: aplica la querystring de una vista a la URL. */
export function SavedViewsMenu({
  section,
  views,
  canSave = true,
}: {
  section: string;
  views: SavedViewItem[];
  canSave?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const apply = (query: string) => {
    setOpen(false);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const save = () => {
    if (!name.trim()) return;
    const data = new FormData();
    data.set("section", section);
    data.set("name", name.trim());
    data.set("query", params.toString());
    startTransition(async () => {
      await saveSavedView(data);
      setName("");
      setOpen(false);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    const data = new FormData();
    data.set("id", id);
    startTransition(async () => {
      await deleteSavedView(data);
      router.refresh();
    });
  };

  const makeDefault = (id: string) => {
    const data = new FormData();
    data.set("id", id);
    data.set("section", section);
    startTransition(async () => {
      await setDefaultSavedView(data);
      router.refresh();
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={secondaryButtonClass + " inline-flex items-center gap-2"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        Vistas
        {views.length > 0 ? (
          <span className="rounded-full bg-primary-soft px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {views.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="user-menu-pop absolute left-0 top-full z-40 mt-2 w-72 rounded-card border border-border bg-surface p-1 shadow-lg">
          <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-subtle">
            Vistas guardadas / {section}
          </p>
          {views.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Aún no guardaste ninguna vista. Filtra la lista y guárdala para volver después.
            </p>
          ) : (
            <ul className="flex flex-col">
              {views.map((view) => (
                <li key={view.id} className="group flex items-center gap-1 rounded-control hover:bg-background">
                  <button
                    type="button"
                    onClick={() => apply(view.query)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm text-foreground"
                  >
                    {view.isDefault ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true">
                        <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
                      </svg>
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{view.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => makeDefault(view.id)}
                    title="Marcar como predeterminada"
                    aria-label={`Marcar ${view.name} como predeterminada`}
                    className="hidden rounded p-1 text-muted-foreground hover:text-primary group-hover:block"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(view.id)}
                    title="Eliminar vista"
                    aria-label={`Eliminar ${view.name}`}
                    className="hidden rounded p-1 text-muted-foreground hover:text-danger group-hover:block"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {canSave ? (
            <div className="mt-1 border-t border-border px-2 py-2">
              <p className="mb-1.5 text-xs text-muted-foreground">Guardar filtros actuales</p>
              <div className="flex gap-1.5">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      save();
                    }
                  }}
                  placeholder="Nombre de la vista"
                  maxLength={40}
                  className="input min-w-0 flex-1 px-2 py-1 text-xs"
                  aria-label="Nombre de la vista"
                />
                <button type="button" onClick={save} disabled={pending || !name.trim()} className="rounded-control bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  Guardar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
