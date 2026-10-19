import { createHash } from "node:crypto";

import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";

import { AcceptInvitationForm } from "./invite-accept-form";
import { LoginVisual } from "../../login/visual";

export default async function InvitationPage({
  params,
}: PageProps<"/invitacion/[token]">) {
  const { token } = await params;

  const invitation = await db.invitation.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    include: { organization: true, company: true },
  });

  const expirada = !invitation || invitation.acceptedAt || invitation.expiresAt < new Date();
  const existingUser =
    invitation && !expirada
      ? Boolean(await db.user.findUnique({ where: { email: invitation.email } }))
      : false;

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

          {invitation && !expirada ? (
            <>
              <h1 className="mt-12 text-3xl font-light tracking-tight">
                Invitación a {invitation.organization.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {invitation.company
                  ? `Te invitan a colaborar en ${invitation.company.name}.`
                  : "Te invitan a colaborar en todas las empresas de la organización."}{" "}
                Tu rol será {roleLabel(invitation.role)}. La invitación expira el{" "}
                {invitation.expiresAt.toLocaleString("es-CL")}.
              </p>
              <AcceptInvitationForm
                token={token}
                existingUser={existingUser}
                email={invitation.email}
              />
            </>
          ) : (
            <>
              <h1 className="mt-12 text-3xl font-light tracking-tight">Invitación no válida</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                El enlace no existe, ya se usó o expiró. Pídele al administrador que te genere uno
                nuevo.
              </p>
              <Link
                href="/login"
                className="btn-liquid btn-liquid-secondary mt-8 inline-flex h-11 items-center rounded-[10px] border border-border px-5 text-sm font-medium text-foreground"
              >
                Ir a iniciar sesión
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Visual — banda superior en móvil, columna derecha en desktop */}
      <aside className="order-first h-52 sm:h-64 lg:order-last lg:h-auto">
        <LoginVisual />
      </aside>
    </div>
  );
}
