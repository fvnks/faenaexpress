import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { attendanceSummary } from "@/lib/school-attendance";
import { cardClass } from "@/lib/ui";

const ETIQUETA_ESTADO: Record<string, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  LATE: "Atraso",
  JUSTIFIED: "Justificada",
  EXCUSED: "Eximido",
};

// Ficha del alumno: su asistencia y el 85% del Decreto 67, que es lo que
// decide si promotions. La regla de conteo está explícita en
// `src/lib/school-attendance.ts` para que se pueda auditar.
export default async function EstudiantePage({
  params,
}: PageProps<"/colegios/estudiantes/[id]">) {
  const ctx = await requireSchoolContext("estudiantes");
  const { id } = await params;

  const student = await db.student.findFirst({
    where: { id, schoolId: ctx.school.id },
    include: {
      enrollments: {
        include: { course: { select: { id: true, name: true, year: true } } },
        orderBy: { createdAt: "asc" },
      },
      guardianships: {
        include: { guardian: { select: { id: true, name: true, phone: true, email: true } } },
      },
    },
  });
  if (!student) notFound();

  const resumenes = await Promise.all(
    student.enrollments.map(async (e) => ({
      curso: e.course,
      resumen: await attendanceSummary(student.id, e.course.id),
    })),
  );

  const ultima = await db.attendanceRecord.findMany({
    where: { studentId: student.id },
    orderBy: { recordedAt: "desc" },
    take: 12,
    include: { session: { include: { subject: { select: { name: true } } } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/colegios/estudiantes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Alumnos
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {student.firstName} {student.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {student.rut ?? "sin RUT"}
          {student.birthDate
            ? ` · ${student.birthDate.toLocaleDateString("es-CL")}`
            : ""}
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Asistencia por curso</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          El 85% es el requisito de promoción del Decreto 67. Cuentan como asistencia la presencia,
          los atrasos y las justificadas; las eximidas (permisos, licencias) no suman ni restan.
        </p>

        {resumenes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">El alumno no está matriculado en ningún curso.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {resumenes.map(({ curso, resumen }) => (
              <li key={curso.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {curso.name} · {curso.year}
                  </p>
                  {resumen.sinClases ? (
                    <p className="text-sm font-semibold text-muted-foreground">
                      sin clases registradas
                    </p>
                  ) : (
                    <p
                      className={
                        "tabular text-sm font-semibold " +
                        (resumen.cumple ? "text-success" : "text-danger")
                      }
                    >
                      {resumen.porcentaje.toFixed(1)}%{" "}
                      {resumen.cumple ? "· cumple el 85%" : "· bajo el 85%"}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {resumen.sinClases
                    ? "Este curso todavía no tiene clases registradas."
                    : `${resumen.asiste} de ${resumen.total} clases · ${resumen.falta} inasistencias sin justificar` +
                      (resumen.eximidas > 0 ? ` · ${resumen.eximidas} eximidas` : "") +
                      (!resumen.cumple && resumen.clasesParaCumplir > 0
                        ? ` · le faltan ${resumen.clasesParaCumplir} clases perfectas para llegar al 85%`
                        : "")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {student.guardianships.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Apoderados</h2>
          <ul className="mt-3 divide-y divide-border">
            {student.guardianships.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm font-medium">{g.guardian.name}</span>
                <span className="text-xs text-muted-foreground">
                  {g.type === "TITULAR" ? "Titular" : g.type === "SUPLENTE" ? "Suplente" : g.type}
                  {g.guardian.phone ? ` · ${g.guardian.phone}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Últimos registros</h2>
        {ultima.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay registros de asistencia.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {ultima.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {r.session.date.toLocaleDateString("es-CL")} · {r.session.subject.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ETIQUETA_ESTADO[r.status] ?? r.status}
                  {r.minutesLate > 0 ? ` · ${r.minutesLate} min` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
