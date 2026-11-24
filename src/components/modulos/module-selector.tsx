"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ModuleCard = {
  code: string;
  name: string;
  description: string;
  href: string;
  pendings: Array<{ label: string; value: string }>;
  suggested: boolean;
};

/** Categoría e icono por módulo. El número NO vive acá: es la posición del
 *  módulo en la lista visible, así cualquier módulo nuevo se numera solo. */
const META: Record<string, { category: string; icon: string }> = {
  facturas: {
    category: "FINANZAS",
    icon: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2ZM4 19.5A2.5 2.5 0 0 1 6.5 17H20M9 7h7M9 11h7M9 15h4",
  },
  colegios: {
    category: "EDUCACIÓN",
    icon: "M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5",
  },
  billing: {
    category: "PLATAFORMA",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
  },
  pos: {
    category: "VENTAS",
    icon: "M4 2h16v20H4zM8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01",
  },
};

/** Módulo con número de dos dígitos según su orden en la lista visible. */
function meta(code: string, index: number) {
  const base = META[code] ?? { category: "MÓDULO", icon: "M4 4h16v16H4zM8 8h8v8H8z" };
  return { ...base, code: `MÓD·${String(index + 1).padStart(2, "0")}` };
}

/** Número grande del índice (01, 02, 03…): sigue al módulo activo y se anima. */
function CatalogNumber({ index, total }: { index: number; total: number }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute -right-2 top-24 hidden select-none text-right lg:block">
      <span key={index} className="catalog-digit block text-[12rem] font-bold leading-none tracking-tighter text-foreground/[0.025]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="block pr-3 font-mono text-xs uppercase tracking-[0.18em] text-foreground/[0.05]">
        de {String(total).padStart(2, "0")}
      </span>
    </span>
  );
}

function ModuleIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** Contador del KPI: usa el dato real y cuenta hasta él, salvo texto no numérico. */
function CountUp({ value, reduced }: { value: string; reduced: boolean }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const match = value.match(/^\$?([\d.]+)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const target = Number(match[1].replace(/\./g, ""));
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }
    const money = value.startsWith("$");
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      setDisplay(money ? `$${current.toLocaleString("es-CL")}` : String(current));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <>{display}</>;
}

function RegistrationMarks() {
  const corner = "pointer-events-none absolute h-4 w-4 border-border/60";
  return (
    <span aria-hidden="true">
      <span className={`${corner} left-4 top-4 border-l border-t`} />
      <span className={`${corner} right-4 top-4 border-r border-t`} />
      <span className={`${corner} bottom-4 left-4 border-b border-l`} />
      <span className={`${corner} bottom-4 right-4 border-b border-r`} />
    </span>
  );
}

export function ModuleSelector({ cards }: { cards: ModuleCard[] }) {
  const router = useRouter();
  const defaultIndex = Math.max(
    0,
    cards.findIndex((card) => card.suggested),
  );
  const [active, setActive] = useState(defaultIndex);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) return;

      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < cards.length) {
          event.preventDefault();
          setActive(index);
        }
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setActive((current) => (current + 1) % cards.length);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setActive((current) => (current - 1 + cards.length) % cards.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        router.push(cards[active].href);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards, active, router]);

  const card = cards[active];
  const info = meta(card.code, active);
  const [headline, ...rest] = card.pendings;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background catalog-grid">
      <RegistrationMarks />
      <CatalogNumber index={active} total={cards.length} />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Índice / {String(active + 1).padStart(2, "0")} de {String(cards.length).padStart(2, "0")} — Selector
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">¿A dónde vamos?</h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground text-pretty">
              Elige el módulo en el que quieres trabajar. Cada ficha muestra el estado real de esa área en tu cuenta.
            </p>
          </div>
          <p className="hidden shrink-0 font-mono text-xs text-subtle sm:block">
            {String(cards.length).padStart(2, "0")} MÓDULOS DISPONIBLES
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Rail: índice del catálogo */}
          <div role="tablist" aria-label="Módulos disponibles" aria-orientation="vertical" className="flex flex-col gap-2">
            {cards.map((item, index) => {
              const itemMeta = meta(item.code, index);
              const isActive = index === active;
              return (
                <button
                  key={item.code}
                  id={`module-tab-${item.code}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls="module-detail"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActive(index)}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={`catalog-enter group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-4 text-left transition-[background-color,border-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:-translate-y-0.5 ${
                    isActive
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:border-primary/60 hover:bg-surface-elevated"
                  }`}
                >
                  {isActive ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" /> : null}
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ${
                    isActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground group-hover:text-foreground"
                  }`}>
                    <ModuleIcon path={itemMeta.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-subtle">{itemMeta.code}</span>
                    <span className={`block truncate font-medium ${isActive ? "text-foreground" : "text-foreground/80"}`}>{item.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {item.suggested ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">Último</span>
                    ) : null}
                    <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:inline">{index + 1}</kbd>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panel de detalle */}
          <div
            key={card.code}
            id="module-detail"
            role="tabpanel"
            aria-labelledby={`module-tab-${card.code}`}
            className="catalog-panel-in relative overflow-hidden rounded-lg border border-border bg-surface-elevated"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-primary" />
            <div className="p-7 sm:p-9">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{info.code} / {info.category}</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{card.name}</h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                </div>
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary sm:flex">
                  <ModuleIcon path={info.icon} className="h-7 w-7" />
                </div>
              </div>

              <div className="mt-9 border-t border-border pt-6">
                {headline ? (
                  <>
                    <p className="kpi-label">{headline.label}</p>
                    <p className="kpi-value mt-2">
                      <CountUp value={headline.value} reduced={reduced} />
                    </p>
                  </>
                ) : (
                  <>
                    <p className="kpi-label">Estado</p>
                    <p className="mt-2 text-xl font-medium text-foreground">Sin pendientes por ahora.</p>
                  </>
                )}

                {rest.length > 0 ? (
                  <dl className="mt-8 grid gap-x-8 gap-y-3 border-t border-border pt-6 sm:grid-cols-2">
                    {rest.map((item) => (
                      <div key={item.label} className="flex items-baseline justify-between gap-4">
                        <dt className="text-sm text-muted-foreground">{item.label}</dt>
                        <dd className="tabular text-sm font-medium text-foreground">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                <Link
                  href={card.href}
                  className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Entrar a {card.name}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </Link>
                <p className="font-mono text-xs text-subtle">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5">Enter</kbd> para entrar · <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↑↓</kbd> para navegar
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-subtle">
          ¿Te falta un módulo?{" "}
          <Link href="/contacto" className="link">Solicítalo</Link>
        </p>
      </div>
      <span className="sr-only" aria-live="polite">{card.name} seleccionado</span>
    </div>
  );
}
