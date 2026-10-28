"use client";

import Link from "next/link";
import { useState } from "react";

import GradientASCIIRaw from "@/components/ui/GradientASCII.jsx";
import { primaryButtonClass } from "@/lib/ui";

const GradientASCII = GradientASCIIRaw as React.FC<Record<string, unknown>>;

export function HeroSection() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { href: "#que-hace", label: "Qué hace" },
    { href: "#plataforma", label: "Plataforma" },
    { href: "/contacto", label: "Contacto" },
  ];

  return (
    <section className="relative pb-24 overflow-hidden">
      {/* Fondo envolvente oscuro (estilo Wope) */}
      <div className="absolute inset-0 z-0 bg-background" />
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-soft rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-accent-soft rounded-full blur-[120px] opacity-40" />
      </div>
      {/* GradientASCII animado sobre el fondo */}
      <div className="absolute inset-0 z-20">
        <div className="w-full h-full">
          <GradientASCII
            colors={["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"]}
            shape="horizon"
            characters=" =+xX0S8#@"
            cellSize={22}
            density={0.6}
            glyphOpacity={0.4}
            glow={0.15}
            depthOfField={0}
            flicker={0.1}
            softness={0.6}
            scale={1.2}
            flow={0.4}
            speed={0.8}
            gradientOpacity={0.5}
            grain={0.03}
            variation={0.1}
            mouseInteraction
            scrambleRadius={0.08}
            clickEffect="wave"
            intro
            lightMode={false}
          />
        </div>
      </div>

      {/* Navbar */}
      <nav className="relative z-30 py-4 md:py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
              >
                Y
              </span>
              Yellow ERP
            </Link>
          </div>

          <div className="lg:hidden ml-2">
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

          <ul className="hidden lg:flex ml-8 lg:w-auto lg:space-x-8">
            {navLinks.map((link) => (
              <li key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className="inline-block text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block ml-auto flex items-center gap-6">
            <Link
              href="/login"
              className="relative group inline-block px-4 py-2 text-sm font-semibold text-muted-foreground border border-border bg-surface rounded-control overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary-soft transform translate-x-full group-hover:translate-x-0 transition duration-500" />
              <span className="relative">Entrar</span>
            </Link>
            <a
              href="/login"
              className="relative group inline-block px-4 py-2 text-sm font-semibold text-accent hover:text-white border border-accent overflow-hidden rounded-control"
            >
              <div className="absolute inset-0 bg-accent transform translate-x-full group-hover:translate-x-0 transition duration-500" />
              <span className="relative">Crear cuenta</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-30 mx-auto max-w-5xl px-6 pt-16 sm:pt-20 lg:pt-24">
        <div className="grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Texto a la izquierda */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-soft bg-primary-soft text-primary text-xs font-medium uppercase tracking-wider mb-6 block lg:inline-block">
              ERP para empresas chilenas
            </span>
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold text-foreground leading-tight mb-6 sm:mb-8">
              Deja de perseguir facturas en Excel.
            </h1>
            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed mb-10 sm:mb-12 max-w-2xl sm:max-w-none mx-auto lg:mx-0">
              Registra compras, ventas y gastos en minutos, concilia el banco y
              ten siempre claro quién pagó cada gasto. Montos en pesos, IVA al
              19 %, todo en español.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
              <Link
                href="/login"
                className="relative group inline-block w-full sm:w-auto py-4 px-8 text-white font-semibold rounded-control bg-accent overflow-hidden text-center sm:text-left"
              >
                <div className="absolute inset-0 bg-accent transform translate-x-full group-hover:translate-x-0 transition duration-500" />
                <div className="relative flex items-center justify-center gap-2">
                  <span>Entrar a mi cuenta</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.25 3.75L3.75 11.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.25 11.25L3.75 3.75"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
              <Link
                href="#que-hace"
                className="relative group inline-block w-full sm:w-auto py-4 px-8 text-sm font-semibold text-foreground border border-border bg-surface overflow-hidden text-center sm:text-left"
              >
                <div className="absolute inset-0 bg-primary-soft transform translate-x-full group-hover:translate-x-0 transition duration-500" />
                <div className="relative flex items-center justify-center gap-2">
                  <span>Ver de qué se trata</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Mockup a la derecha */}
          <div className="hidden lg:block flex justify-center">
            <div className="relative max-w-md">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-accent/40 rounded-2xl blur opacity-60" />
              <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-surface/90 backdrop-blur shadow-2xl">
                <div className="flex border-b border-white/10 bg-surface/80 p-3">
                  <div className="flex w-24 shrink-0 flex-col gap-1.5 p-1">
                    <span className="h-2 w-12 rounded-full bg-white/30" aria-hidden="true" />
                    <span className="h-1.5 w-8 rounded-full bg-white/20" aria-hidden="true" />
                    <span className="h-1.5 w-10 rounded-full bg-white/20" aria-hidden="true" />
                    <span className="h-1.5 w-7 rounded-full bg-white/20" aria-hidden="true" />
                  </div>
                  <div className="flex-1 p-3">
                    <span className="block h-2 w-20 rounded-full bg-white/20" aria-hidden="true" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-4">
                  {[
                    ["Por cobrar", "$2.480.000"],
                    ["Por pagar", "$890.000"],
                    ["Conciliar", "12"],
                  ].map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="rounded-lg border border-white/10 bg-surface/60 p-3">
                      <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">
                        {etiqueta}
                      </p>
                      <p className="tabular mt-1 text-sm font-semibold text-white">
                        {valor}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-surface/70">
                    <div className="flex items-center gap-2 border-b border-white/10 bg-surface/50 px-3 py-2 text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                      <span className="flex-1">Documento</span>
                      <span className="hidden sm:block flex-1">Proveedor</span>
                      <span className="w-20 text-right">Monto</span>
                      <span className="w-16 text-right">Estado</span>
                    </div>
                    {[
                      ["Factura 872263", "Comercial del Sur", "$446.375", "Pagada"],
                      ["Factura 1031", "Insumos Andes", "$119.000", "Pendiente"],
                      ["Factura 5502", "Transportes Río", "$238.000", "Pagada"],
                    ].map(([doc, prov, monto, estado]) => (
                      <div
                        key={String(doc)}
                        className="flex items-center gap-2 border-b border-white/5 px-3 py-2 text-xs last:border-b-0 hover:bg-white/5"
                      >
                        <span className="flex-1 truncate text-white/90">{doc}</span>
                        <span className="hidden sm:block truncate text-white/60">{prov}</span>
                        <span className="tabular w-20 text-right text-white/80">{monto}</span>
                        <span className="w-14 text-right">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/80"
                          >
                            {estado}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 ${mobileNavOpen ? "block" : "hidden"}`}
      >
        <div
          onClick={() => setMobileNavOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <nav className="absolute inset-y-0 left-0 z-30 w-full max-w-md bg-surface border-r border-border flex flex-col py-6 px-6 shadow-2xl">
          <div className="flex items-center justify-between mb-16">
            <Link href="/" className="mr-auto text-2xl font-medium leading-none">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black mr-2"
              >
                Y
              </span>
              Yellow ERP
            </Link>
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
          <div>
            <ul className="mb-2 space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="block py-4 px-5 rounded-control text-sm text-foreground hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="block py-4 px-5 rounded-control text-sm text-foreground hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  Entrar
                </Link>
              </li>
            </ul>
            <div className="py-8 px-6 mb-6 border-t border-b border-border">
              <a
                href="/contacto"
                className="flex items-center gap-3 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                <svg
                  width="18"
                  height="16"
                  viewBox="0 0 18 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-accent"
                >
                  <path
                    d="M17.3337 6.05833C17.2811 5.9059 17.1854 5.77202 17.0582 5.67292C16.931 5.57381 16.7777 5.51374 16.617 5.5L11.8754 4.80833L9.75038 0.499999C9.68215 0.359106 9.5756 0.240284 9.44296 0.157143C9.31031 0.074003 9.15693 0.0299072 9.00039 0.0299072C8.84384 0.0299072 8.69046 0.074003 8.55781 0.157143C8.42517 0.240284 8.31862 0.359106 8.25039 0.499999L6.12539 4.8L1.38372 5.5C1.22949 5.52192 1.08449 5.58663 0.96518 5.6868C0.845868 5.78696 0.757021 5.91856 0.708721 6.06666C0.664509 6.21139 0.660541 6.36543 0.697245 6.51224C0.733948 6.65905 0.809936 6.7931 0.917055 6.9L4.35872 10.2333L3.52539 14.9667C3.49564 15.1229 3.51121 15.2844 3.57028 15.432C3.62935 15.5797 3.72943 15.7074 3.85872 15.8C3.98474 15.8901 4.13337 15.9433 4.28793 15.9536C4.44249 15.9639 4.59686 15.9309 4.73372 15.8583L9.00039 13.6333L13.2504 15.8667C13.3673 15.9326 13.4994 15.9671 13.6337 15.9667C13.8102 15.9673 13.9824 15.9118 14.1254 15.8083C14.2547 15.7157 14.3548 15.588 14.4138 15.4404C14.4729 15.2927 14.4885 15.1312 14.4587 14.975L13.6254 10.2417L17.067 6.90833C17.1874 6.8064 17.2763 6.67242 17.3235 6.52195C17.3707 6.37149 17.3742 6.21073 17.3337 6.05833ZM12.2087 9.39166C12.111 9.48619 12.0379 9.6032 11.9957 9.73247C11.9536 9.86175 11.9438 9.99937 11.9671 10.1333L12.5671 13.625L9.43372 11.9583C9.31315 11.8941 9.17865 11.8605 9.04205 11.8605C8.90546 11.8605 8.77095 11.8941 8.65039 11.9583L5.51705 13.625L6.11705 10.1333C6.14033 9.99937 6.13048 9.86175 6.08836 9.73247C6.04623 9.6032 5.97312 9.48619 5.87539 9.39166L3.37539 6.89166L6.88372 6.38333C7.01872 6.36455 7.14705 6.31295 7.25747 6.23304C7.36789 6.15313 7.45702 6.04736 7.51705 5.925L9.00039 2.75L10.5671 5.93333C10.6271 6.0557 10.7162 6.16147 10.8266 6.24137C10.9371 6.32128 11.0654 6.37289 11.2004 6.39166L14.7087 6.9L12.2087 9.39166Z"
                    fill="currentColor"
                  />
                </svg>
                <span>Drop us a line</span>
              </a>
            </div>
            <div className="flex px-6 mb-16 items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <a
                href="/login"
                className="inline-block py-3 px-4 text-sm font-semibold text-accent hover:text-white border border-accent rounded-control transition duration-200"
              >
                Crear cuenta
              </a>
            </div>
          </div>
        </nav>
      </div>
    </section>
  );
}
