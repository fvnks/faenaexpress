"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

type SlideId = "ventas" | "banco" | "iva" | "gastos";

const SLIDES: Array<{ id: SlideId; label: string; title: string; period: string }> = [
  { id: "ventas", label: "Libro de ventas", title: "Libro de ventas", period: "2026-11" },
  { id: "banco", label: "Conciliación", title: "Banco · por conciliar", period: "2026-11" },
  { id: "iva", label: "Reporte IVA", title: "Resumen de IVA", period: "2026-11" },
  { id: "gastos", label: "Gastos", title: "Control de gastos", period: "2026-11" },
];

const CYCLE_MS = 3600;

function VentasView() {
  return (
    <>
      <div className="overflow-hidden rounded-[8px] border border-border bg-background/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-primary/5 transition-colors">
              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00872</td>
              <td className="px-4 py-3 text-foreground">Constructora del Sur</td>
              <td className="px-4 py-3 text-right text-foreground">$1.250.000</td>
              <td className="px-4 py-3"><Badge variant="success" size="sm">Pagada</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00873</td>
              <td className="px-4 py-3 text-foreground">Retail Mayorista S.A.</td>
              <td className="px-4 py-3 text-right text-foreground">$2.100.000</td>
              <td className="px-4 py-3"><Badge variant="warning" size="sm">Pendiente</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00874</td>
              <td className="px-4 py-3 text-foreground">Distribuciones ABC</td>
              <td className="px-4 py-3 text-right text-foreground">$680.000</td>
              <td className="px-4 py-3"><Badge variant="warning" size="sm">Parcial</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00875</td>
              <td className="px-4 py-3 text-foreground">Servicios Integrales</td>
              <td className="px-4 py-3 text-right text-foreground">$890.000</td>
              <td className="px-4 py-3"><Badge variant="success" size="sm">Pagada</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-background/50 px-5 py-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total del período</span>
        <div className="text-right">
          <span className="text-xl font-bold tabular text-foreground">$4.920.000</span>
          <span className="text-xs text-muted-foreground"> IVA incluido</span>
        </div>
      </div>
    </>
  );
}

function BancoView() {
  return (
    <>
      <div className="overflow-hidden rounded-[8px] border border-border bg-background/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
              <th className="px-4 py-3">Glosa</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-right">Sugerencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-primary/5 transition-colors">
              <td className="px-4 py-3 text-foreground">Pago proveedor · Constructora del Sur</td>
              <td className="px-4 py-3 text-right font-mono tabular text-xs text-foreground">-$1.250.000</td>
              <td className="px-4 py-3"><Badge variant="success" size="sm">Conciliado</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">Abono cliente · Retail Mayorista</td>
              <td className="px-4 py-3 text-right font-mono tabular text-xs text-foreground">+$680.000</td>
              <td className="px-4 py-3"><Badge variant="warning" size="sm">Por revisar</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">Comisión bancaria</td>
              <td className="px-4 py-3 text-right font-mono tabular text-xs text-foreground">-$4.900</td>
              <td className="px-4 py-3"><Badge variant="secondary" size="sm">Interno</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-background/50 px-5 py-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conciliados este mes</span>
        <div className="text-right">
          <span className="text-xl font-bold tabular text-foreground">38</span>
          <span className="text-xs text-muted-foreground"> de 42 movimientos</span>
        </div>
      </div>
    </>
  );
}

function IvaView() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[8px] border border-border bg-background/50 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ventas</p>
          <p className="mt-2 text-lg font-bold tabular text-foreground">$4.920.000</p>
        </div>
        <div className="rounded-[8px] border border-border bg-background/50 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compras</p>
          <p className="mt-2 text-lg font-bold tabular text-foreground">$2.340.000</p>
        </div>
        <div className="rounded-[8px] border border-primary/40 bg-primary-soft/40 p-4">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">IVA a pagar</p>
          <p className="mt-2 text-lg font-bold tabular text-foreground">$489.600</p>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-[8px] border border-border bg-background/50">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cuadre libros ↔ IVA</span>
          <Badge variant="success" size="sm">$0 diferencias</Badge>
        </div>
        <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Período 2026-11</span>
          <span className="tabular font-mono">SII sincronizado</span>
        </div>
      </div>
    </>
  );
}

function GastosView() {
  return (
    <>
      <div className="overflow-hidden rounded-[8px] border border-border bg-background/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
              <th className="px-4 py-3">Gasto</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Pagó</th>
              <th className="px-4 py-3 text-right">Reembolso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-primary/5 transition-colors">
              <td className="px-4 py-3 text-foreground">Arriendo oficina</td>
              <td className="px-4 py-3 text-right font-mono tabular text-xs text-foreground">$850.000</td>
              <td className="px-4 py-3 text-foreground">María G.</td>
              <td className="px-4 py-3"><Badge variant="success" size="sm">Reembolsado</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">Materiales de obra</td>
              <td className="px-4 py-3 text-right font-mono tabular text-xs text-foreground">$320.000</td>
              <td className="px-4 py-3 text-foreground">Juan P.</td>
              <td className="px-4 py-3"><Badge variant="warning" size="sm">Pendiente</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">Combustible</td>
              <td className="px-4 py-3 text-right font-mono tabular text-xs text-foreground">$95.000</td>
              <td className="px-4 py-3 text-foreground">María G.</td>
              <td className="px-4 py-3"><Badge variant="success" size="sm">Reembolsado</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-background/50 px-5 py-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Siempre sabes quién pagó</span>
        <div className="text-right">
          <span className="text-xl font-bold tabular text-foreground">2</span>
          <span className="text-xs text-muted-foreground"> reembolsos pendientes</span>
        </div>
      </div>
    </>
  );
}

const VIEWS: Record<SlideId, () => React.JSX.Element> = {
  ventas: VentasView,
  banco: BancoView,
  iva: IvaView,
  gastos: GastosView,
};

export function HeroPanelCarousel() {
  const [active, setActive] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tablistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const paused = pausedByUser || hovered || reducedMotion;

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused, active]);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (active + delta + SLIDES.length) % SLIDES.length;
    setActive(next);
    tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  const slide = SLIDES[active];
  const View = VIEWS[slide.id];

  return (
    <div className="relative w-full max-w-[520px] mx-auto lg:ml-auto">
      {/* Auto-cycling tabs, like the reference hero's product carousel */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Vistas del panel de Facturas ERP"
          onKeyDown={onTabKeyDown}
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          {SLIDES.map((item, index) => {
            const isActive = index === active;
            return (
              <button
                key={item.id}
                id={`hero-tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls="hero-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(index)}
                className={`inline-flex items-center gap-1.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary" : "bg-border-strong"}`}
                />
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setPausedByUser((value) => !value)}
          aria-label={pausedByUser ? "Reanudar rotación del panel" : "Pausar rotación del panel"}
          title={pausedByUser ? "Reanudar rotación" : "Pausar rotación"}
          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          {pausedByUser ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
            </svg>
          )}
        </button>
      </div>

      <div
        role="tabpanel"
        id="hero-panel"
        aria-labelledby={`hero-tab-${slide.id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setHovered(false);
        }}
      >
        <div key={slide.id} className="card hero-swap overflow-hidden">
          {/* Chrome de la app: constante en todas las vistas */}
          <div className="flex items-center justify-between border-b border-border bg-background/50 px-5 py-4">
            <span className="text-xs font-semibold text-foreground">Facturas ERP</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>CHILE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span>ACTIVO</span>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{slide.title}</h3>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{slide.period}</span>
            </div>
            <View />
          </div>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {paused ? "Rotación del panel pausada" : `Mostrando ${slide.label}`}
      </span>
    </div>
  );
}
