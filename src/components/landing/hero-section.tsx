"use client";

import Link from "next/link";
import { useState } from "react";

import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function HeroSection() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { href: "#que-hace", label: "Qué hace" },
    { href: "#plataforma", label: "Plataforma" },
    { href: "/contacto", label: "Contacto" },
  ];

  return (
    <section className="relative pb-20 overflow-hidden">
      {/* Decorative blobs (reemplazan las imágenes de Saturn) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-soft rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="absolute top-0 right-0 mt-10 mr-10 w-32 h-32 bg-accent-soft rounded-full blur-2xl opacity-60" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-soft rounded-full blur-3xl -ml-16 -mb-16" />

      {/* Navbar */}
      <nav className="relative z-10 py-6 mb-12 md:mb-20 bg-transparent">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="inline-block text-lg font-bold tracking-tight">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
                >
                  Y
                </span>
                Yellow ERP
              </Link>
            </div>

            <div className="lg:hidden ml-auto">
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="flex w-12 h-12 items-center justify-center rounded-control border border-border bg-surface"
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

            <ul className="hidden lg:flex ml-14 lg:w-auto lg:space-x-12">
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

            <div className="hidden lg:block ml-auto flex items-center gap-4">
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Entrar
              </Link>
              <a
                href="/login"
                className="relative group inline-block px-4 py-2 text-sm font-semibold text-accent hover:text-white border border-accent overflow-hidden transition duration-300 rounded-control"
              >
                <div className="absolute top-0 right-full w-full h-full bg-accent transform group-hover:translate-x-full group-hover:scale-102 transition duration-500" />
                <span className="relative">Crear cuenta</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative container px-4 mx-auto">
        <div className="max-w-xl xl:max-w-4xl">
          <h1 className="font-bold text-5xl xs:text-6xl md:text-8xl xl:text-10xl text-foreground mb-8 sm:mb-14 leading-tight">
            Deja de perseguir facturas en Excel.
          </h1>

          <div className="md:flex mb-14 max-w-xs sm:max-w-sm md:max-w-none">
            <div className="mb-6 md:mb-0 md:mr-8 pt-3">
              <svg
                width="84"
                height="10"
                viewBox="0 0 84 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 4.25C0.585786 4.25 0.25 4.58579 0.25 5C0.25 5.41421 0.585786 5.75 1 5.75L1 4.25ZM84 5.00001L76.5 0.669879L76.5 9.33013L84 5.00001ZM1 5.75L77.25 5.75001L77.25 4.25001L1 4.25L1 5.75Z"
                  fill="#181B1E"
                />
              </svg>
            </div>
            <div className="max-w-md">
              <p className="md:text-xl text-muted-foreground font-medium leading-relaxed">
                Registra compras, ventas y gastos en minutos, concilia el banco y ten
                siempre claro quién pagó cada gasto. Montos en pesos, IVA al 19 %,
                todo en español.
              </p>
            </div>
          </div>

          <a
            href="/login"
            className="relative group inline-block w-full sm:w-auto py-4 px-6 mb-24 text-white font-semibold rounded-control bg-accent overflow-hidden transition-colors"
          >
            <div className="absolute top-0 right-full w-full h-full bg-accent/80 transform group-hover:translate-x-full group-hover:scale-102 transition duration-500" />
            <div className="relative flex items-center justify-center gap-2">
              <span>Entrar a mi cuenta</span>
              <svg
                width="8"
                height="12"
                viewBox="0 0 8 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.83 5.29L2.59 1.05C2.49704 0.956274 2.38644 0.881879 2.26458 0.83111C2.14272 0.780342 2.01202 0.754204 1.88 0.754204C1.74799 0.754204 1.61729 0.780342 1.49543 0.83111C1.37357 0.881879 1.26297 0.956274 1.17 1.05C0.983753 1.23736 0.879211 1.49082 0.879211 1.755C0.879211 2.01919 0.983753 2.27264 1.17 2.46L4.71 6L1.17 9.54C0.983753 9.72736 0.879211 9.98082 0.879211 10.245C0.879211 10.5092 0.983753 10.7626 1.17 10.95C1.26344 11.0427 1.37426 11.116 1.4961 11.1658C1.61794 11.2155 1.7484 11.2408 1.88 11.24C2.01161 11.2408 2.14207 11.2155 2.26391 11.1658C2.38575 11.116 2.49656 11.0427 2.59 10.95L6.83 6.71C6.92373 6.61704 6.99813 6.50644 7.04889 6.38458C7.09966 6.26272 7.1258 6.13201 7.1258 6C7.1258 5.86799 7.09966 5.73728 7.04889 5.61543C6.99813 5.49357 6.92373 5.38297 6.83 5.29Z"
                  fill="#FFF2EE"
                />
              </svg>
            </div>
          </a>
        </div>

        <div className="lg:flex lg:items-start gap-12">
          {/* Trusted by */}
          <div className="max-w-2xl mb-20 lg:mb-0 lg:mr-32">
            <span className="block mb-6 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Confían en nosotros
            </span>
            <div className="flex items-center -mx-4">
              {[
                "Empresa A",
                "Empresa B",
                "Empresa C",
              ].map((nombre) => (
                <div key={nombre} className="w-1/3 px-4 flex items-center justify-center h-16">
                  <div className="w-full h-full rounded-control border border-border bg-surface flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {nombre}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats card (reemplaza bg-folder.svg) */}
          <div className="relative lg:-mt-20 w-full max-w-md">
            <div className="absolute top-0 left-0 w-full h-full bg-primary-soft/40 rounded-3xl -z-10 blur-sm" />
            <div className="relative flex flex-col">
              <div className="max-w-xs pl-5 pt-10 pr-20 z-10">
                <h3 className="text-xl font-semibold text-foreground">
                  Construyendo el futuro juntos
                </h3>
              </div>
              <div className="max-w-md -mt-10 px-5 xs:px-10 pb-12 pt-18 bg-accent-soft rounded-b-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold text-foreground">18k+</span>
                    <span className="text-sm text-muted-foreground">Proyectos</span>
                  </div>
                  <div className="h-12 w-px bg-border mx-4" />
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold text-foreground">20+</span>
                    <span className="text-sm text-muted-foreground">Premios</span>
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
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          aria-hidden="true"
        />
        <nav className="absolute inset-y-0 left-0 z-30 w-full max-w-md bg-surface border-r border-border flex flex-col py-6 px-6 shadow-xl">
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
