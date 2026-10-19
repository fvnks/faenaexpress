import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { postLoginDestination } from "@/lib/modules";

import { ChangePasswordForm } from "./change-password-form";
import { LoginVisual } from "../login/visual";

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
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

          <h1 className="mt-12 text-3xl font-light tracking-tight">Tu perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user.name} · {user.email}
          </p>

          {user.mustChangePassword ? (
            <p
              role="alert"
              className="mt-6 rounded-[10px] border border-primary/40 bg-primary-soft px-3 py-2 text-sm text-primary"
            >
              Estás usando una contraseña provisional de una invitación. Elige una nueva para
              continuar.
            </p>
          ) : null}

          <ChangePasswordForm obligatorio={user.mustChangePassword} />

          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            {user.mustChangePassword ? (
              <p className="text-sm text-muted-foreground">
                Cambia tu contraseña para entrar al panel.
              </p>
            ) : (
              <Link
                href={await postLoginDestination(user.id)}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Ir al panel
              </Link>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Visual — banda superior en móvil, columna derecha en desktop */}
      <aside className="order-first h-52 sm:h-64 lg:order-last lg:h-auto">
        <LoginVisual />
      </aside>
    </div>
  );
}
