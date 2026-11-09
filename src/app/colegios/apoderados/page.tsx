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

const PAGE_SIZE = 20;

/**
 * Acceso de las familias al portal.
 *
 * El colegio entrega el acceso en persona: un código por familia y el enlace
 * del colegio. Antes esto solo se podía hacer desde la ficha de cada alumno,
 * así que para una escuela de 400 familias había que abrir 400 fichas, y el
 * código solo se veía en el instante en que se generaba. Rotarlo para volver
 * a leerlo cortaba el acceso de la familia.
 */
export default async function ApoderadosPage({
  searchParams,
}: PageProps<"/colegios/apoderados">) {
  const ctx = await requireSchoolContext("apoderados");
  const puedeEditar = schoolCanWrite(ctx, "apoderados");
  const schoolId = ctx.school.id;
  const params = await searchParams;

  // Filtros desde la URL
  const buscar = (params.q ?? "").toString().trim();
  const pagina = Math.max(1, Number(params.pagina ?? 1));
  const skip = (pagina - 1) * PAGE_SIZE;

  // Construir filtros de base de datos
  const where: {
    schoolId: string;
    OR?: Array<{
      name?: { contains: string };
      rut?: { contains: string };
      email?: { contains: string };
      phone?: { contains: string };
    }>;
  } = { schoolId };

  if (buscar) {
    where.OR = [
      { name: { contains: buscar } },
      { rut: { contains: buscar } },
      { email: { contains: buscar } },
      { phone: { contains: buscar } },
    ];
  }

  // Contar totales para estadísticas
  const [todos, conCodigo, sinCodigo, conAlumnos, sinAlumnos, nuncaEntraron] =
    await Promise.all([
      db.guardian.count({ where: { schoolId } }),
      db.guardian.count({ where: { schoolId, accessCode: { not: null } } }),
      db.guardian.count({ where: { schoolId, accessCode: null } }),
      db.guardian.count({
        where: {
          schoolId,
          guardianships: { some: {} },
        },
      }),
      db.guardian.count({
        where: {
          schoolId,
          guardianships: { none: {} },
        },
      }),
      db.guardian.count({
        where: { schoolId, lastAccessAt: null },
      }),
    ]);

  // Traer apoderados paginados
  const apoderados = await db.guardian.findMany({
    where,
    orderBy: { name: "asc" },
    take: PAGE_SIZE,
    skip,
    include: {
      guardianships: {
        orderBy: { createdAt: "asc" },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  const totalPaginas = Math.ceil(todos / PAGE_SIZE);

  // El enlace que el colegio reparte junto con el código.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const esLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto = h.get("x-forwarded-proto") ?? (esLocal ? "http" : "https");
  const portalUrl = ctx.school.slug ? `${proto}://${host}/c/${ctx.school.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acceso de las familias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El código con el que cada familia entra al portal. Se entrega en persona, en la reunión
          de apoderados o en la secretaría.
        </p>
      </div>

      {/* ── Estadísticas ──────────────────────────────────────────────── */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <li className={cardClass + " p-4"}>
          <p className="text-xs text-muted-foreground font-medium">Total</p>
          <p className="text-2xl leading-none tabular-nums font-semibold">{todos}</p>
        </li>
        <li className={cardClass + " p-4"}>
          <p className="text-xs text-success/80 font-medium">Con código</p>
          <p className="text-2xl leading-none tabular-nums text-success">{conCodigo}</p>
        </li>
        <li className={cardClass + " p-4"}>
          <p className="text-xs text-muted-foreground font-medium">Sin código</p>
          <p className="text-2xl leading-none tabular-nums text-muted-foreground">
            {sinCodigo}
          </p>
        </li>
        <li className={cardClass + " p-4"}>
          <p className="text-xs text-success/80 font-medium">Con alumnos</p>
          <p className="text-2xl leading-none tabular-nums text-success">{conAlumnos}</p>
        </li>
        <li className={cardClass + " p-4"}>
          <p className="text-xs text-muted-foreground font-medium">Sin alumnos</p>
          <p className="text-2xl leading-none tabular-nums text-muted-foreground">
            {sinAlumnos}
          </p>
        </li>
        <li className={cardClass + " p-4"}>
          <p className="text-xs text-accent/80 font-medium">Nunca entraron</p>
          <p className="text-2xl leading-none tabular-nums text-accent">
            {nuncaEntraron}
          </p>
        </li>
      </ul>

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

      {/* ── Búsqueda y paginación ──────────────────────────────────────── */}
      <section className={cardClass + " p-5"}>
        <form className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs text-muted-foreground mb-1">
              Buscar por nombre, RUT, correo o teléfono
            </label>
            <input
              name="q"
              defaultValue={buscar}
              placeholder="Ej: María González o 12.345.678-9"
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            Buscar
          </button>
          {(buscar || pagina > 1) && puedeEditar && (
            <Link
              href="/colegios/apoderados"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-2"
            >
              Limpiar
            </Link>
          )}
        </form>

        {todos > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {skip + 1} a {Math.min(skip + PAGE_SIZE, todos)} de {todos} apoderados
            </p>
            <div className="flex items-center gap-1">
              {pagina > 1 && (
                <Link
                  href={`/colegios/apoderados?q=${buscar}&pagina=${pagina - 1}`}
                  className="rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background"
                >
                  Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link
                  href={`/colegios/apoderados?q=${buscar}&pagina=${pagina + 1}`}
                  className="rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {apoderados.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <FaltaEsto href="/colegios/estudiantes" accion="Ir a Alumnos">
            Todavía no hay apoderados registrados{" " + (buscar ? "con esos filtros" : "")}. Se
            crean desde la ficha de cada alumno.
          </FaltaEsto>
        </section>
      ) : (
        <section className={cardClass + " overflow-hidden"}>
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
