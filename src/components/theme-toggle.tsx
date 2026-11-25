"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";

import { Button } from "@/components/ui/button";

type Mode = "auto" | "light" | "dark" | "high-contrast";
type Palette = "cobre" | "arena" | "bosque" | "acero" | "vino";
type Appearance = { mode: Mode; palette: Palette };

const MODOS: Array<{ value: Mode; label: string; nota: string }> = [
  { value: "auto", label: "Automático", nota: "Claro de 07:00 a 19:00 · oscuro de noche" },
  { value: "light", label: "Claro", nota: "Siempre claro" },
  { value: "dark", label: "Oscuro", nota: "Siempre oscuro" },
  { value: "high-contrast", label: "Alto contraste", nota: "Negro y blanco, máximo contraste" },
];

const PALETAS: Array<{ value: Palette; label: string; color: string; fondo: string }> = [
  { value: "cobre", label: "Cobre", color: "#C45A2A", fondo: "#FAFAFA" },
  { value: "arena", label: "Arena cálida", color: "#B4552F", fondo: "#FBF7F1" },
  { value: "bosque", label: "Bosque", color: "#2E6B4F", fondo: "#F6F8F5" },
  { value: "acero", label: "Acero", color: "#2E5E8C", fondo: "#F7F9FC" },
  { value: "vino", label: "Vino", color: "#8C3A52", fondo: "#FBF7F8" },
];

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-mode", "data-palette"],
  });
  return () => observer.disconnect();
}

// useSyncExternalStore exige snapshots estables: un objeto nuevo en cada llamada
// provoca un bucle infinito de renderizados. Se reutiliza el mismo objeto salvo
// que cambie realmente la preferencia guardada en el DOM.
let cachedSnapshot: Appearance = { mode: "auto", palette: "cobre" };

function getSnapshot(): Appearance {
  const root = document.documentElement;
  const modoAttr = root.getAttribute("data-mode") as Mode | null;
  const paletaAttr = root.getAttribute("data-palette") as Palette | null;
  const mode = modoAttr && MODOS.some((m) => m.value === modoAttr) ? modoAttr : "auto";
  const palette = paletaAttr && PALETAS.some((p) => p.value === paletaAttr) ? paletaAttr : "cobre";
  if (cachedSnapshot.mode !== mode || cachedSnapshot.palette !== palette) {
    cachedSnapshot = { mode, palette };
  }
  return cachedSnapshot;
}

const SERVER_SNAPSHOT: Appearance = { mode: "auto", palette: "cobre" };

function getServerSnapshot(): Appearance {
  return SERVER_SNAPSHOT;
}

function resolvedMode(mode: Mode): "light" | "dark" | "high-contrast" {
  if (mode === "light" || mode === "dark" || mode === "high-contrast") return mode;
  const hora = new Date().getHours();
  return hora >= 7 && hora < 19 ? "light" : "dark";
}

/** Aplica la apariencia al DOM. La llama el picker y el relevo automático de hora. */
function paint(mode: Mode, palette: Palette) {
  const root = document.documentElement;
  const resuelta = resolvedMode(mode);
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-palette", palette);
  root.classList.remove("light", "dark", "high-contrast");
  if (resuelta !== "light") root.classList.add(resuelta);
}

function save(mode: Mode, palette: Palette) {
  paint(mode, palette);
  try {
    localStorage.setItem("theme", mode);
    localStorage.setItem("palette", palette);
  } catch {
    // Sin localStorage el cambio rige solo durante la sesión.
  }
}

function Icon({ mode, className = "theme-icon" }: { mode: Mode | "light" | "dark" | "high-contrast"; className?: string }) {
  if (mode === "auto") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg viewBox="0 0 384 512" height="1em" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" aria-hidden="true">
        <path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
      </svg>
    );
  }
  if (mode === "high-contrast") {
    return (
      <svg viewBox="0 0 384 512" height="1em" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" aria-hidden="true">
        <path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 512 512" height="1em" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" aria-hidden="true">
      <path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.6 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-5 3.1-10.7 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 0 1-192 0zm224 0a128 128 0 1 0-256 0 128 128 0 0 0 256 0z" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-primary" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, palette } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // En modo automático, cambia al cruzar las 07:00 / 19:00 sin recargar.
  useEffect(() => {
    if (mode !== "auto") return;
    const revisar = () => {
      const actual = document.documentElement.classList.contains("dark")
        ? "dark"
        : document.documentElement.classList.contains("high-contrast")
          ? "high-contrast"
          : "light";
      const esperado = resolvedMode("auto");
      if (actual !== esperado) paint("auto", palette);
    };
    const timer = window.setInterval(revisar, 60_000);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, [mode, palette]);

  useEffect(() => {
    if (!open) return;
    const fuera = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [open]);

  const elegir = useCallback((nuevo: Partial<Appearance>) => {
    save(nuevo.mode ?? mode, nuevo.palette ?? palette);
  }, [mode, palette]);

  const resuelta = resolvedMode(mode);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={className}
        onClick={() => setOpen((v) => !v)}
        aria-label="Apariencia: modo y paleta de colores"
        aria-expanded={open}
        aria-haspopup="true"
        title="Modo y paleta de colores"
      >
        <Icon mode={mode === "auto" ? resuelta : mode} />
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-border bg-surface p-2 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modo</p>
          <ul className="flex flex-col gap-0.5">
            {MODOS.map((m) => (
              <li key={m.value}>
                <button
                  type="button"
                  onClick={() => elegir({ mode: m.value })}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background",
                    mode === m.value && "bg-primary-soft",
                  )}
                >
                  <Icon mode={m.value} className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    <span className="block font-medium">{m.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{m.nota}</span>
                  </span>
                  {mode === m.value ? <Check /> : null}
                </button>
              </li>
            ))}
          </ul>

          <div className="mx-1 my-2 border-t border-border" />
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paleta de colores</p>
          <ul className="flex flex-col gap-0.5">
            {PALETAS.map((p) => (
              <li key={p.value}>
                <button
                  type="button"
                  onClick={() => elegir({ palette: p.value })}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background",
                    palette === p.value && "bg-primary-soft",
                  )}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-border"
                    style={{ background: `linear-gradient(135deg, ${p.color} 50%, ${p.fondo} 50%)` }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 font-medium">{p.label}</span>
                  {palette === p.value ? <Check /> : null}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-2 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground">
            El modo automático usa claro de día y oscuro de noche. Puedes fijar otro modo cuando quieras.
          </p>
        </div>
      ) : null}
    </div>
  );
}
