import { Metadata } from "next";
import { redirect } from "next/navigation";

import { DenunciaForm } from "@/app/c/[slug]/denuncia/denuncia-form";
import { db } from "@/lib/db";
import { cardClass } from "@/lib/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const colegio = await db.school.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: colegio ? `Denuncia confidencial · ${colegio.name}` : "Denuncia confidencial",
    description: "Formulario confidencial para reportar situaciones de convivencia, acoso, agresión o maltrato.",
  };
}

/**
 * Formulario público de denuncia confidencial (C6 - Ley 21.809).
 *
 * Accesible sin autenticación en `/c/<slug>/denuncia`.
 * Permite a estudiantes, familias o funcionarios reportar situaciones
 * de convivencia, acoso, agresión, discriminación, etc.
 * La denuncia llega a la bandeja de convivencia del colegio.
 */
export default async function DenunciaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const colegio = await db.school.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!colegio) {
    redirect("/404");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className={cardClass + " p-6 sm:p-8"}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Denuncia confidencial</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {colegio.name}
            </p>
          </div>

          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Confidencialidad:</strong> Esta denuncia se recibe de forma anónima. No se guarda tu nombre,
              correo ni IP. La información llega directamente al equipo de convivencia del colegio, que tiene
              la obligación legal (Ley 21.809) de investigar en un plazo máximo de 2 meses.
            </p>
          </div>

          <DenunciaForm schoolId={colegio.id} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿No es esto lo que buscabas?{" "}
          <a href={`/c/${slug}`} className="text-primary underline underline-offset-2">
            Volver al portal del colegio
          </a>
        </p>
      </div>
    </div>
  );
}