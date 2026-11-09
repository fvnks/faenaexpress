import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { docenteDeUsuario } from "@/lib/school-team";
import { FormattedDate } from "@/components/formatted-date";
import { cardClass } from "@/lib/ui";

/** Historial de correcciones de notas para una evaluación y alumno. */
export default async function HistorialNotasPage({
  params,
}: {
  params: Promise<{ evaluacionId: string; studentId: string }>;
}) {
  const { evaluacionId, studentId } = await params;
  const ctx = await requireSchoolContext("calificaciones");

  const evaluacion = await db.evaluation.findFirst({
    where: { id: evaluacionId, schoolId: ctx.school.id },
    select: { id: true, name: true, courseId: true, subjectId: true },
  });
  if (!evaluacion) return redirect("/colegios/calificaciones");

  const estudiante = await db.student.findFirst({
    where: { id: studentId, schoolId: ctx.school.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!estudiante) return redirect("/colegios/calificaciones");

  // Alcance: docente solo puede ver historial de sus asignaturas
  if (ctx.role === "TEACHER") {
    const docente = await docenteDeUsuario(ctx.user.id, ctx.school.id);
    if (!docente) {
      return redirect("/colegios/calificaciones");
    }
    const asignacion = await db.teachingAssignment.findFirst({
      where: {
        teacherId: docente.id,
        courseId: evaluacion.courseId,
        subjectId: evaluacion.subjectId,
      },
      select: { id: true },
    });
    if (!asignacion) {
      return redirect("/colegios/calificaciones");
    }
  }

  const cambios = await db.gradeChange.findMany({
    where: { evaluationId: evaluacionId, studentId },
    include: {
      changedBy: { select: { name: true, email: true } },
    },
    orderBy: { changedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Historial de notas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Historial de correcciones para{" "}
            {estudiante.firstName} {estudiante.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{evaluacion.name}</p>
        </div>
        <a
          href={`/colegios/calificaciones?evaluacionId=${evaluacionId}`}
          className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Volver a calificaciones
        </a>
      </div>

      {cambios.length === 0 ? (
        <div className={cardClass + " p-6 text-center"}>
          <p className="text-sm text-muted-foreground">
            No hay correcciones registradas para esta nota.
          </p>
        </div>
      ) : (
        <div className={cardClass + " p-4"}>
          <ul className="divide-y divide-border">
            {cambios.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Cambio #{c.id.slice(-6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.previousValue === null
                        ? "Sin nota"
                        : `${c.previousValue.toFixed(1)}`}
                        {" → "}
                        {c.newValue === null
                          ? "Sin nota"
                          : `${c.newValue.toFixed(1)}`}
                        ({c.previousStatus} → {c.newStatus})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cambiado por {c.changedBy.name} el{" "}
                      <FormattedDate
                        iso={c.changedAt.toISOString()}
                        options={{
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                      />
                    </p>
                    {c.reason ? (
                      <p className="text-xs text-muted-foreground">
                        Motivo: {c.reason}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
