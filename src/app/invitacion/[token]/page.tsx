import { createHash } from "node:crypto";

import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";

import { AcceptInvitationForm } from "./invite-accept-form";

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
    <AuthShell>
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
    </AuthShell>
  );
}
