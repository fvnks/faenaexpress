import { notFound } from "next/navigation";

import { PortalForm } from "@/app/apoderado/portal-form";
import { colegioPorSlug } from "@/lib/school-slug-store";

/**
 * La puerta de entrada de un colegio para las familias.
 *
 * El colegio reparte este enlace (y su QR) en la reunión de apoderados. La
 * pantalla lleva el NOMBRE DEL COLEGIO, no el de la plataforma: una apoderada
 * tiene que reconocer de inmediato que está en el lugar correcto y no creer que
 * se equivocó de página.
 *
 * No hay credenciales acá a propósito: el apoderado no tiene cuenta, entra con
 * el código que le dio el colegio. Por eso la pantalla no ofrece correo ni
 * contraseña, que es lo que confundía en el portal general.
 *
 * `/apoderado` sigue existiendo para quien llegó sin el enlace.
 */
export default async function ColegioPortalPage({
  params,
}: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const colegio = await colegioPorSlug(slug);
  if (!colegio) notFound();

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Portal del apoderado
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{colegio.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entra con el código que te dio el colegio para ver la asistencia y las notas de tus
            hijos.
          </p>
        </div>

        {/* El schoolId acota el código a este colegio. */}
        <PortalForm schoolId={colegio.id} />

        <p className="mt-6 text-xs text-muted-foreground">
          ¿No tienes el código? Pídelo en la secretaría del colegio.
        </p>
      </main>
    </div>
  );
}