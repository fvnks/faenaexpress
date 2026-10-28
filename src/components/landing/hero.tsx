"use client";

import Link from "next/link";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-soft bg-primary-soft text-primary text-xs font-medium uppercase tracking-wider">
            ERP para empresas chilenas
          </span>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Deja de perseguir facturas en Excel.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Registra compras, ventas y gastos en minutos, concilia el banco sin abrir cinco
            pestañas y ten siempre claro quién pagó cada gasto. Montos en pesos, IVA al 19 %,
            todo en español.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-start">
            <Link
              href="/login"
              className="btn-liquid btn-liquid-primary rounded-[10px] border px-6 py-3 text-base font-semibold"
            >
              Entrar a mi cuenta
            </Link>
            <Link
              href="#que-hace"
              className="btn-liquid btn-liquid-secondary rounded-[10px] border px-6 py-3 text-base font-medium"
            >
              Ver de qué se trata
            </Link>
          </div>
        </div>
        <div className="mt-12 lg:mt-0 flex justify-center">
          <div className="max-w-sm">
            <LandingMockupPanel />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Representación del panel. Los datos son de ejemplo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingMockupPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex border-b border-border bg-background">
        <div className="flex w-24 shrink-0 flex-col gap-1.5 border-r border-border p-3">
          <span className="h-2.5 w-14 rounded-full bg-primary-soft" aria-hidden="true" />
          <span className="h-2 w-10 rounded-full bg-border" aria-hidden="true" />
          <span className="h-2 w-12 rounded-full bg-border" aria-hidden="true" />
          <span className="h-2 w-9 rounded-full bg-border" aria-hidden="true" />
        </div>
        <div className="flex-1 p-3">
          <span className="block h-2.5 w-24 rounded-full bg-border" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          ["Por cobrar", "$2.480.000"],
          ["Por pagar", "$890.000"],
          ["Por conciliar", "12 movimientos"],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {etiqueta}
            </p>
            <p className="tabular mt-1 text-sm font-semibold text-foreground">{valor}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border bg-background px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex-1">Documento</span>
            <span className="hidden flex-1 sm:block">Proveedor</span>
            <span className="w-24 text-right">Monto</span>
            <span className="w-20 text-right">Estado</span>
          </div>
          {[
            ["Factura 872263", "Comercial del Sur", "$446.375", "Pagada"],
            ["Factura 1031", "Insumos Andes", "$119.000", "Pendiente"],
            ["Factura 5502", "Transportes Río", "$238.000", "Pagada"],
          ].map(([doc, prov, monto, estado]) => (
            <div
              key={String(doc)}
              className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs last:border-b-0"
            >
              <span className="flex-1 truncate font-medium text-foreground">{doc}</span>
              <span className="hidden flex-1 truncate text-muted-foreground sm:block">{prov}</span>
              <span className="tabular w-24 text-right text-foreground">{monto}</span>
              <span className="w-20 text-right">
                <span
                  className={
                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium " +
                    (estado === "Pagada"
                      ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-400/20 dark:text-yellow-300"
                      : "bg-border text-muted-foreground")
                  }
                >
                  {estado}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
