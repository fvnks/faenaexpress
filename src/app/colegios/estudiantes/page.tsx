import Link from "next/link";

import type { StudentStatus } from "@/generated/prisma/client";

import {
  EnrollExistingForm,
  EnrollForm,
} from "@/app/colegios/estudiantes/enrollment-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";

const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVE: "Cursando",
  TRANSFERRED: "Trasladado",
  WITHDRAWN: "Retirado",
  GRADUATED: "Egresado",
};

const ETIQUETA_MATRICULA: Record<string, string> = {
  ACTIVE: "Cursando",
  TRASLADO: "Trasladado",
  RETIRADO: "Retirado",
};

// Listado de alumnos del colegio, con su matrícula y su estado.
export default async function EstudiantesPage({
  searchParams,
}: PageProps<"/colegios/estudiantes">) {
  const ctx = await requireSchoolContext("estudiantes");
  const schoolId = ctx.school.id;
  const puedeEditar = schoolCanWrite(ctx, "estudiantes");
  const params = await searchParams;

  // Filtros desde la URL
  const buscar = (params.q ?? "").toString().trim();
  const filtroEstado = (params.estado ?? "todos") as "todos" | "activo" | "inactivo";

  // Construir filtros de base de datos
  const where: {
    schoolId: string;
    status?: StudentStatus | { not: StudentStatus };
    OR?: Array<{ firstName?: { contains: string }; lastName?: { contains: string }; rut?: { contains: string } }>;
  } = { schoolId };
  if (filtroEstado !== "todos") {
    where.status = filtroEstado === "activo"
      ? ("ACTIVE" as StudentStatus)
      : { not: "ACTIVE" as StudentStatus };
  }
  if (buscar) {
    where.OR = [
      { firstName: { contains: buscar } },
      { lastName: { contains: buscar } },
      { rut: { contains: buscar } },
    ];
  }

  const [alumnos, cursos, totalTodos, totalActivos, totalInactivos] =
    await Promise.all([
      db.student.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          enrollments: {
            orderBy: [{ status: "asc" }, { enrolledAt: "desc" }],
            include: { course: { select: { id: true, name: true, year: true } } },
          },
        },
      }),
      db.course.findMany({
        where: { schoolId, active: true },
        orderBy: [{ year: "desc" }, { name: "asc" }],
        select: { id: true, name: true, year: true },
      }),
      db.student.count({ where: { schoolId } }),
      db.student.count({ where: { schoolId, status: "ACTIVE" as StudentStatus } }),
      db.student.count({ where: { schoolId, status: { not: "ACTIVE" as StudentStatus } } }),
    ]);

  const cursando = totalActivos;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cursando} cursando de {totalTodos} en {ctx.school.name}.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-start gap-6">
            <EnrollForm
              cursos={cursos.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
            />
            <EnrollExistingForm
              alumnos={alumnos
                .filter((a) => a.status === "ACTIVE")
                .map((a) => ({
                  id: a.id,
                  nombre: `${a.firstName} ${a.lastName}`,
                }))}
              cursos={cursos.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
            />
          </div>
        </section>
      ) : null}

      {/* ── Búsqueda y filtros ───────────────────────────────────────────── */}
      <section className={cardClass + " p-5"}>
        <form className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">
              Buscar alumno o RUT
            </label>
            <input
              name="q"
              defaultValue={buscar}
              placeholder="Nombre, apellido o RUT"
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">
              Estado
            </label>
            <select
              name="estado"
              defaultValue={filtroEstado}
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="activo">Cursando</option>
              <option value="inactivo">No cursando</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            Filtrar
          </button>
          {(buscar || filtroEstado !== "todos") && puedeEditar && (
            <Link
              href="/colegios/estudiantes"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-2"
            >
              Limpiar filtros
            </Link>
          )}
        </form>

        <p className="mt-3 text-xs text-muted-foreground">
          {totalActivos} cursando · {totalInactivos} no cursando de {totalTodos} totales
        </p>
      </section>

      {/* ── Listado ──────────────────────────────────────────────────────── */}
      <section className={cardClass + " overflow-hidden"}>
        {alumnos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Todavía no hay alumnos{" " + (buscar || filtroEstado !== "todos" ? "con esos filtros" : "")}en este colegio.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Alumno</th>
                <th className="px-4 py-2 font-medium">RUT</th>
                <th className="px-4 py-2 font-medium">Curso</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alumnos.map((alumno) => {
                const activa = alumno.enrollments.find((e) => e.status === "ACTIVE");
                const historial = alumno.enrollments.filter((e) => e.status !== "ACTIVE");
                return (
                  <tr key={alumno.id}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/colegios/estudiantes/${alumno.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {alumno.firstName} {alumno.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{alumno.rut ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {activa ? `${activa.course.name} · ${activa.course.year}` : "—"}
                      {historial.length > 0 ? (
                        <span className="block text-xs">
                          antes:{" "}
                          {historial
                            .map(
                              (e) =>
                                `${e.course.name} (${ETIQUETA_MATRICULA[e.status] ?? e.status})`,
                            )
                            .join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {ETIQUETA_ESTADO[alumno.status] ?? alumno.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
