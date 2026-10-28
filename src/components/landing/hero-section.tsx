"use client";

import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function HeroSection() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { href: "#que-hace", label: "Qué hace" },
    { href: "#plataforma", label: "Plataforma" },
    { href: "/contacto", label: "Contacto" },
  ];

  return (
    <section className="relative pb-24 overflow-hidden">
      {/* Elementos decorativos (sin depender de imágenes externas) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-soft rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="absolute top-1/3 right-20 w-48 h-48 bg-accent-soft rounded-full blur-2xl -mr-8 opacity-60" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-soft rounded-full blur-3xl -ml-16 -mb-16" />

      {/* Navbar */}
      <nav className="relative z-10 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
            >
              Y
            </span>
            Yellow ERP
          </Link>

          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
            <Link
              href="/login"
              className={secondaryButtonClass}
            >
              Entrar
            </Link>
          </div>

          <div className="lg:hidden ml-4">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex w-10 h-10 items-center justify-center rounded-control border border-border bg-surface"
              aria-label="Abrir menú"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Menú móvil */}
      <div
        className={`fixed inset-0 z-20 ${mobileNavOpen ? "block" : "hidden"}`}
      >
        <div
          onClick={() => setMobileNavOpen(false)}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          aria-hidden="true"
        />
        <nav className="absolute inset-y-0 left-0 z-30 w-full max-w-md bg-surface border-r border-border flex flex-col py-6 px-6 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[12px] font-bold text-black"
              >
                Y
              </span>
              Yellow ERP
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="block py-3 px-4 rounded-control text-sm text-foreground hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8 space-y-3">
            <ThemeToggle />
            <Link
              href="/login"
              className={primaryButtonClass}
            >
              Entrar
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero content */}
      <div className="relative mx-auto max-w-5xl px-6 pt-16 sm:pt-24">
        <div className="grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-soft bg-primary-soft text-primary text-xs font-medium uppercase tracking-wider">
              ERP para empresas chilenas
            </span>
            <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Deja de perseguir facturas en Excel.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Registra compras, ventas y gastos en minutos, concilia el banco sin
              abrir cinco pestañas y ten siempre claro quién pagó cada gasto.
              Montos en pesos, IVA al 19 %, todo en español.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-start">
              <Link
                href="/login"
                className={primaryButtonClass + " px-6 py-3 text-base font-semibold"}
              >
                Entrar a mi cuenta
              </Link>
              <Link
                href="#que-hace"
                className={secondaryButtonClass + " px-6 py-3 text-base font-medium"}
              >
                Ver de qué se trata
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 mt-12 lg:mt-0 flex justify-center">
            <div className="max-w-sm">
              <MockupPanel />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Representación del panel. Los datos son de ejemplo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockupPanel() {
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
