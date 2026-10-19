import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { postLoginDestination } from "@/lib/modules";

import { LoginForm } from "./login-form";
import { LoginVisual } from "./visual";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    // Ya autenticado: un módulo directo, varios al selector.
    redirect(await postLoginDestination(user.id));
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Formulario — columna izquierda en desktop, bajo la visual en móvil */}
      <main className="login-in flex items-center justify-center bg-surface px-6 py-10 lg:order-first lg:px-16 lg:py-0">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-semibold tracking-tight"
              aria-label="Facturas — inicio"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                </svg>
              </span>
              Facturas
            </Link>
            <ThemeToggle />
          </div>

          <h1 className="mt-12 text-3xl font-light tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión para acceder a tu registro de compras, ventas y gastos.
          </p>

          <LoginForm />

          <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
            ¿No tienes cuenta? Pídele acceso al administrador de tu empresa.
          </p>
        </div>
      </main>

      {/* Visual — banda superior en móvil, columna derecha en desktop */}
      <aside className="order-first h-52 sm:h-64 lg:order-last lg:h-auto">
        <LoginVisual />
      </aside>
    </div>
  );
}
