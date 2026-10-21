import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { hasTwoFactor, recomiendaTwoFactor } from "@/lib/two-factor";

import { TwoFactorForm } from "./form";

// Pantalla del segundo factor.
//
// OJO: no usa `requireUser` a propósito. `requireUser` manda a esta pantalla
// cuando la sesión está pendiente (falta el 2FA): usarla aquí sería un bucle.
// Se usa `getCurrentUser`, que solo lee la sesión.
//
// Esta pantalla está FUERA de `/facturas`, así que el layout de la app (que sí
// exige `requireUser`) no la intercepta.
export default async function TwoFactorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pendiente = user.totpPending === true;
  const yaActivo = await hasTwoFactor(user.id);
  const recomendado = await recomiendaTwoFactor(user.id);

  // OJO: esta página NO redirige nunca. Es la pantalla donde se gestiona el
  // segundo factor (activarlo, ver los códigos de recuperación, desactivarlo), y
  // el perfil la enlaza: si redirigiera cuando no hay 2FA, el "actívalo aquí"
  // del perfil volvería acá y no llevaría a ninguna parte.

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="login-in flex items-center justify-center bg-surface px-6 py-10 lg:order-first lg:px-16 lg:py-0">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                </svg>
              </span>
              Facturas
            </Link>
            <ThemeToggle />
          </div>

          <h1 className="mt-12 text-3xl font-light tracking-tight">
            {pendiente && yaActivo ? "Verificación en dos pasos" : "Segundo factor"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {pendiente && yaActivo
              ? "Tu cuenta pide un segundo factor. Poné el código para entrar."
              : pendiente
                ? "Tu cuenta tiene un segundo factor pendiente de confirmar."
                : "Un segundo factor pide, además de tu contraseña, un código de tu teléfono. Es opcional y lo activas cuando quieras."}
          </p>

          {recomendado && !yaActivo ? (
            <p
              role="status"
              className="mt-6 rounded-[10px] border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-foreground"
            >
              Tu rol puede ver todas las cuentas de la organización. Te recomendamos activar el
              segundo factor.
            </p>
          ) : null}

          <TwoFactorForm yaActivo={yaActivo} pendiente={pendiente} />

          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">¿Prefieres cambiar de cuenta?</p>
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

      <aside className="order-first h-52 sm:h-64 lg:order-last lg:h-auto" />
    </div>
  );
}
