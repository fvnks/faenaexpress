import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMPERSONATION_FORBIDDEN, impersonationBlock } from "@/lib/impersonation";
import { postLoginDestination } from "@/lib/modules";
import { hashToken } from "@/lib/session";
import { cookies } from "next/headers";
import { hasTwoFactor, recomiendaTwoFactor } from "@/lib/two-factor";

import { ChangePasswordForm } from "./change-password-form";
import { CloseSessionsButton, TwoFactorSettings } from "./account-forms";
import { LoginVisual } from "../login/visual";

export default async function PerfilPage() {
  const user = await requireUser();

  // Cambiar la contraseña del cliente es de las acciones que la impersonación
  // prohíbe: se cambia con la sesión del cliente, no con la de soporte.
  const bloqueoPassword = await impersonationBlock(IMPERSONATION_FORBIDDEN.changePassword);

  const [dosFactorActivo, recomendado, accesos, sesiones, cookieStore] = await Promise.all([
    hasTwoFactor(user.id),
    recomiendaTwoFactor(user.id),
    db.accessLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, kind: true, ip: true, createdAt: true },
    }),
    db.session.findMany({
      where: { userId: user.id },
      select: { id: true, tokenHash: true },
    }),
    cookies(),
  ]);

  // Cuántas sesiones hay aparte de la que está usando esta persona.
  const token = cookieStore.get("facturas_session")?.value;
  const hashActual = token ? hashToken(token) : null;
  const otrasSesiones = sesiones.filter((s) => s.tokenHash !== hashActual).length;

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

          {bloqueoPassword ? (
            <p
              role="alert"
              className="mt-6 rounded-[10px] border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-foreground"
            >
              {bloqueoPassword}
            </p>
          ) : (
            <ChangePasswordForm obligatorio={user.mustChangePassword} />
          )}

          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-semibold">Segundo factor</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Un código de tu teléfono, además de la contraseña. Es opcional.
            </p>
            <div className="mt-3">
              <TwoFactorSettings activo={dosFactorActivo} />
            </div>
            {recomendado && !dosFactorActivo ? (
              <p className="mt-3 rounded-[10px] border border-accent/40 bg-accent-soft px-3 py-2 text-xs text-foreground">
                Tu rol puede ver todas las cuentas de la organización: te recomendamos activarlo.
              </p>
            ) : null}
          </section>

          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-semibold">Sesiones</h2>
            <div className="mt-3">
              <CloseSessionsButton otras={otrasSesiones} />
            </div>
            {accesos.length > 0 ? (
              <ul className="mt-3 divide-y divide-border text-xs text-muted-foreground">
                {accesos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span>
                      {a.kind === "portal_login"
                        ? "Entrada al portal del apoderado"
                        : a.kind === "login"
                          ? "Entrada"
                          : a.kind === "logout"
                            ? "Salida"
                            : a.kind === "failed"
                              ? "Intento fallido"
                              : a.kind}
                    </span>
                    <span>
                      {a.ip ?? "sin IP"} ·{" "}
                      {a.createdAt.toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

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
