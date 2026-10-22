import { headers } from "next/headers";
import Link from "next/link";

import { GuardianAccess } from "@/app/colegios/apoderados/guardian-access";
import { CopyLink } from "@/app/colegios/apoderados/copy-link";
import { FaltaEsto } from "@/app/colegios/falta-esto";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";

const ETIQUETA_TIPO: Record<string, string> = {
  TITULAR: "Titular",
  SUPLENTE: "Suplente",
  EMERGENCIA: "Emergencia",
};

/**
 * Acceso de las familias al portal.
 *
 * El colegio entrega el acceso en persona: un código por familia y el enlace
 * del colegio. Antes esto solo se podía hacer desde la ficha de cada alumno,
 * así que para una escuela de 400 familias había que abrir 400 fichas, y el
 * código solo se veía en el instante en que se generaba. Rotarlo para volver
 * a leerlo cortaba el acceso de la familia.
 */
export default async function ApoderadosPage() {
  const ctx = await requireSchoolContext("apoderados");
  const puedeEditar = schoolCanWrite(ctx, "apoderados");

  const apoderados = await db.guardian.findMany({
    where: { schoolId: ctx.school.id },
    orderBy: { name: "asc" },
    include: {
      guardianships: {
        orderBy: { createdAt: "asc" },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  // El enlace que el colegio reparte junto con el código. Es absoluto porque
  // la secretaría lo copia y lo manda por WhatsApp.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const esLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto = h.get("x-forwarded-proto") ?? (esLocal ? "http" : "https");
  const portalUrl = ctx.school.slug ? `${proto}://${host}/c/${ctx.school.slug}` : null;

  const conAlumnos = apoderados.filter((a) => a.guardianships.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acceso de las familias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El código con el que cada familia entra al portal. Se entrega en persona, en la reunión
          de apoderados o en la secretaría.
        </p>
      </div>

      {portalUrl ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Enlace del portal</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Es el mismo para todas las familias de {ctx.school.name}. Va en el enlace y en el QR
            de la reunión.
          </p>
          <div className="mt-3">
            <CopyLink url={portalUrl} />
          </div>
        </section>
      ) : (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Enlace del portal</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Este colegio todavía no tiene enlace propio. Las familias entran por{" "}
            <Link href="/apoderado" className="text-primary underline underline-offset-2">
              /apoderado
            </Link>{" "}
            y escriben el código.
          </p>
        </section>
      )}

      {apoderados.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <FaltaEsto href="/colegios/estudiantes" accion="Ir a Alumnos">
            Todavía no hay apoderados registrados. Se crean desde la ficha de cada alumno.
          </FaltaEsto>
        </section>
      ) : (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Apoderados ({apoderados.length})</h2>
            <p className="text-xs text-muted-foreground">
              {conAlumnos} con alumnos vinculados
            </p>
          </div>

          <ul className="mt-3 divide-y divide-border">
            {apoderados.map((a) => {
              const tipos = [...new Set(a.guardianships.map((g) => g.type))];
              const alumnos = a.guardianships.map(
                (g) => `${g.student.firstName} ${g.student.lastName}`,
              );

              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tipos.length > 0
                        ? tipos.map((t) => ETIQUETA_TIPO[t] ?? t).join(" · ")
                        : "Sin vínculo"}
                      {alumnos.length > 0 ? ` de ${alumnos.join(", ")}` : ""}
                    </p>
                    {(a.phone || a.email) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[a.phone, a.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  <GuardianAccess
                    guardianId={a.id}
                    nombre={a.name}
                    codigo={a.accessCode}
                    emitido={a.accessCodeCreatedAt}
                    ultimoAcceso={a.lastAccessAt}
                    puedeEditar={puedeEditar}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
