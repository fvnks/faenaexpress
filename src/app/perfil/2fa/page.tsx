import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { hasTwoFactor, requiresTwoFactor } from "@/lib/two-factor";

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
  const obligatorio = await requiresTwoFactor(user.id);

  // Si no hay nada que hacer acá (no está pendiente, no tiene 2FA y no lo
  // necesita), se vuelve a la app. Con 2FA activo la persona puede estar
  // aquí a propósito (ver o reimprimir los códigos de recuperación).
  if (!pendiente && !yaActivo && !obligatorio) {
    redirect("/facturas");
  }

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
              ? "Tu cuenta necesita un segundo factor. Poné el código para entrar."
              : pendiente
                ? "Tu cuenta administra una organización: necesita un segundo factor para entrar."
                : "Podés activar un segundo factor para proteger tu cuenta."}
          </p>

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
