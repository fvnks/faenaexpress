import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { AuthShell, AuthFooter } from "@/components/auth-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMPERSONATION_FORBIDDEN, impersonationBlock } from "@/lib/impersonation";
import { postLoginDestination } from "@/lib/modules";
import { hashToken } from "@/lib/session";
import { cookies } from "next/headers";
import { hasTwoFactor, recomiendaTwoFactor } from "@/lib/two-factor";

import { ChangePasswordForm } from "./change-password-form";
import { CloseSessionsButton, TwoFactorSettings } from "./account-forms";

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
    <AuthShell maxWidth="460px">
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

      <AuthFooter>
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
      </AuthFooter>
    </AuthShell>
  );
}
