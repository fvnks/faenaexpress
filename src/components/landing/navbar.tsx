"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Navegación principal con botones de entrada y registro.
 * Sin glassmorphism, sin gradientes decorativos, sin embellecimientos.
 * Enlaces reales que llevan a destinos existentes.
 */
export function LandingNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#servicios", label: "Servicios" },
    { href: "#como-funciona", label: "Cómo funciona" },
    { href: "#confianza", label: "Confianza" },
    { href: "/contacto", label: "Contacto" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Marca */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Yellow ERP"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold"
            >
              Y
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Yellow ERP
            </span>
          </Link>

          {/* Enlaces de navegación */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-foreground border border-border bg-transparent rounded-control hover:bg-surface/50 transition-colors"
            >
              Entrar
            </Link>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary border border-transparent rounded-control hover:bg-primary/90 transition-colors"
            >
              Crear cuenta
            </a>
          </div>

          {/* Menú móvil */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-control text-foreground hover:bg-surface/50 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-foreground"
            >
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/90 backdrop-blur-sm" />
          <div className="absolute left-0 top-16 right-0 bottom-0 p-6 overflow-y-auto">
            <div className="flex flex-col gap-1 border-b border-border pb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-4 text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block py-4 px-6 text-lg font-medium text-foreground border border-border rounded-card bg-surface hover:bg-surface/50 transition-colors"
                >
                  Entrar
                </Link>
                <a
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block py-4 px-6 text-lg font-medium text-white bg-primary border border-transparent rounded-card hover:bg-primary/90 transition-colors"
                >
                  Crear cuenta
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
