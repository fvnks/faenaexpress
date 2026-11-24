"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";

type ViewId = "ventas" | "banco" | "iva" | "gastos";

const VIEWS: Array<{ id: ViewId; label: string; cursor: { x: number; y: number } }> = [
  { id: "ventas", label: "Libro de ventas", cursor: { x: 706, y: 292 } },
  { id: "banco", label: "Conciliación", cursor: { x: 742, y: 236 } },
  { id: "iva", label: "Reporte IVA", cursor: { x: 604, y: 214 } },
  { id: "gastos", label: "Control de gastos", cursor: { x: 690, y: 318 } },
];

const CYCLE_MS = 3200;

const RailIcon = ({ active, path }: { active?: boolean; path: string }) => (
  <div
    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-300 ${
      active ? "bg-primary-soft text-primary" : "text-muted-foreground"
    }`}
  >
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  </div>
);

function VentasView() {
  return (
    <div className="mt-5 flex flex-col overflow-hidden rounded-xl border border-border bg-background/40">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="rounded-md bg-primary-soft px-3.5 py-2 text-sm font-medium text-primary">Emitidas</span>
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Buscar ventas...
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Folio</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3 text-right">Monto</th>
            <th className="px-4 py-3 text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["F-00872", "Constructora del Sur", "$1.250.000", "success", "Pagada"],
            ["F-00873", "Retail Mayorista S.A.", "$2.100.000", "warning", "Pendiente"],
            ["F-00874", "Distribuciones ABC", "$680.000", "warning", "Parcial"],
            ["F-00875", "Servicios Integrales", "$890.000", "success", "Pagada"],
            ["F-00876", "Inversiones Norte", "$1.480.000", "success", "Pagada"],
          ].map(([folio, cliente, monto, variant, estado]) => (
            <tr key={folio} className="border-b border-border last:border-0">
              <td className="px-4 py-4 font-mono text-xs text-foreground">{folio}</td>
              <td className="px-4 py-4 text-foreground">{cliente}</td>
              <td className="px-4 py-4 text-right font-mono tabular text-foreground">{monto}</td>
              <td className="px-4 py-4 text-right">
                <Badge variant={variant as "success" | "warning"} size="sm">{estado}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BancoView() {
  return (
    <div className="mt-5 flex flex-col overflow-hidden rounded-xl border border-border bg-background/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="rounded-md bg-primary-soft px-3.5 py-2 text-sm font-medium text-primary">Por conciliar</span>
        <span className="ml-auto text-sm text-muted-foreground">4 movimientos</span>
      </div>
      {[
        ["Pago proveedor · Constructora del Sur", "-$1.250.000", "success", "Conciliado"],
        ["Abono cliente · Retail Mayorista", "+$680.000", "warning", "Por revisar"],
        ["Traspaso entre cuentas propias", "-$450.000", "secondary", "Interno"],
        ["Comisión bancaria", "-$4.900", "secondary", "Interno"],
      ].map(([glosa, monto, variant, estado]) => (
        <div key={glosa} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-muted-foreground">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
          </div>
          <span className="min-w-0 flex-1 truncate text-foreground">{glosa}</span>
          <span className="font-mono tabular text-sm text-foreground">{monto}</span>
          <Badge variant={variant as "success" | "warning" | "secondary"} size="sm">{estado}</Badge>
        </div>
      ))}
    </div>
  );
}

function IvaView() {
  return (
    <>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          ["Ventas", "$4.920.000", false],
          ["Compras", "$2.340.000", false],
          ["IVA a pagar", "$489.600", true],
        ].map(([label, value, highlight]) => (
          <div key={label as string} className={`rounded-xl border p-4 ${highlight ? "border-primary/40 bg-primary-soft/40" : "border-border bg-background/40"}`}>
            <p className={`text-xs font-medium uppercase tracking-wider ${highlight ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
            <p className="mt-2 font-mono text-lg font-bold tabular text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background/40">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <span className="text-sm text-foreground">Cuadre libros ↔ IVA</span>
          <Badge variant="success" size="sm">$0 diferencias</Badge>
        </div>
        <div className="flex items-center justify-between px-4 py-4 text-sm text-muted-foreground">
          <span>Período 2026-11</span>
          <span className="font-mono">SII sincronizado</span>
        </div>
      </div>
    </>
  );
}

function GastosView() {
  return (
    <div className="mt-5 flex flex-col overflow-hidden rounded-xl border border-border bg-background/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Gasto</th>
            <th className="px-4 py-3 text-right">Monto</th>
            <th className="px-4 py-3">Pagó</th>
            <th className="px-4 py-3 text-right">Reembolso</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Arriendo oficina", "$850.000", "María G.", "success", "Reembolsado"],
            ["Materiales de obra", "$320.000", "Juan P.", "warning", "Pendiente"],
            ["Combustible", "$95.000", "María G.", "success", "Reembolsado"],
            ["Honorarios contador", "$210.000", "Juan P.", "success", "Reembolsado"],
          ].map(([gasto, monto, pago, variant, estado]) => (
            <tr key={gasto} className="border-b border-border last:border-0">
              <td className="px-4 py-4 text-foreground">{gasto}</td>
              <td className="px-4 py-4 text-right font-mono tabular text-foreground">{monto}</td>
              <td className="px-4 py-4 text-foreground">{pago}</td>
              <td className="px-4 py-4 text-right"><Badge variant={variant as "success" | "warning"} size="sm">{estado}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VIEW_CONTENT: Record<ViewId, () => React.JSX.Element> = {
  ventas: VentasView,
  banco: BancoView,
  iva: IvaView,
  gastos: GastosView,
};

const TITLES: Record<ViewId, string> = {
  ventas: "Facturas emitidas",
  banco: "Conciliación bancaria",
  iva: "Resumen de IVA",
  gastos: "Control de gastos",
};

export function HeroPanelCarousel() {
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % VIEWS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion, active]);

  const view = VIEWS[active];
  const Content = VIEW_CONTENT[view.id];
  const cursor = view.cursor;

  return (
    <div className="@container w-full overflow-hidden select-none" aria-hidden="true">
      {/* Stepper: puntos unidos por líneas, con escala y color animados (300ms) */}
      <div className="mb-3 flex items-center gap-2 px-1">
        {VIEWS.map((item, index) => {
          const isActive = index === active;
          return (
            <div key={item.id} className="contents">
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-md transition-all duration-300 ${isActive ? "bg-primary" : "bg-border-strong"}`}
                  style={{ transform: isActive ? "none" : "scale(0.65)" }}
                />
                <span
                  className={`text-xs whitespace-nowrap transition-all duration-300 hidden @lg:inline ${
                    isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                  style={{ opacity: isActive ? 1 : 0.4 }}
                >
                  {item.label}
                </span>
              </div>
              {index < VIEWS.length - 1 ? <div className="h-px flex-1 bg-border" /> : null}
            </div>
          );
        })}
      </div>

      {/* Mockup a tamaño fijo escalado con container queries, como una captura real */}
      <div className="relative w-full" style={{ aspectRatio: "900 / 730" }}>
        <div
          className="absolute top-0 left-0 origin-top-left overflow-hidden rounded-2xl border border-border bg-surface"
          style={{ width: "900px", height: "730px", transform: "scale(calc(100cqw / 900px))" }}
        >
          <div className="relative flex h-full">
            {/* Rail */}
            <div className="flex w-14 flex-shrink-0 flex-col items-center gap-2 border-r border-border bg-background/40 py-6">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">Y</div>
              <RailIcon active path="M21 21l-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
              <RailIcon path="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              <RailIcon path="M3 3v18h18M7 16l4-5 4 3 5-7" />
              <RailIcon path="M3 7h18M3 12h18M3 17h18" />
              <RailIcon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.88 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
            </div>

            {/* Contenido */}
            <div className="min-w-0 flex-1 px-6 pt-6">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <span className="text-base font-semibold text-foreground">{TITLES[view.id]}</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                    Filtro
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" /></svg>
                    Exportar
                  </span>
                </div>
              </div>
              <div key={view.id} className="hero-view-enter h-full overflow-hidden">
                <Content />
              </div>
            </div>

            {/* Cursor falso que se mueve entre elementos */}
            <div
              className="hero-cursor pointer-events-none absolute top-0 left-0 z-50"
              style={{ transform: `translateX(${cursor.x}px) translateY(${cursor.y}px)` }}
            >
              <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" className="text-foreground" aria-hidden="true">
                <path d="M220.49,207.8,207.8,220.49a12,12,0,0,1-17,0l-56.57-56.57L115,214.08l-.13.33A15.84,15.84,0,0,1,100.26,224l-.78,0a15.82,15.82,0,0,1-14.41-11L32.8,52.92A15.95,15.95,0,0,1,52.92,32.8L213,85.07a16,16,0,0,1,1.41,29.8l-.33.13-50.16,19.27,56.57,56.56A12,12,0,0,1,220.49,207.8Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
