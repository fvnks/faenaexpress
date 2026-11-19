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
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm" role="navigation" aria-label="Navegación principal">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Marca */}
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Yellow ERP - Inicio"
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
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="btn-ghost text-sm px-4 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="btn-primary text-sm"
            >
              Crear cuenta
            </Link>
          </div>

          {/* Menú móvil */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-foreground hover:bg-secondary-soft transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-foreground"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div
            className="absolute inset-0 bg-foreground/90 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-16 right-0 bottom-0 p-6 overflow-y-auto bg-surface border-l border-border lg:fixed lg:top-0 lg:bottom-0 lg:w-80">
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
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-secondary text-lg py-3"
              >
                Entrar
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-primary text-lg py-3"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}