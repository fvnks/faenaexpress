import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MoveStudentForm,
  WithdrawStudentForm,
} from "@/app/colegios/estudiantes/enrollment-forms";
import { ConsentForms, DocumentForm } from "@/app/colegios/estudiantes/document-forms";
import { GuardianForms } from "@/app/colegios/estudiantes/guardian-form";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { attendanceSummary } from "@/lib/school-attendance";
import { courseReport } from "@/lib/school-grades";
import { cardClass } from "@/lib/ui";

const ETIQUETA_ESTADO: Record<string, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  LATE: "Atraso",
  JUSTIFIED: "Justificada",
  EXCUSED: "Eximido",
};

const ETIQUETA_MATRICULA: Record<string, string> = {
  ACTIVE: "Cursando",
  TRASLADO: "Trasladado",
  RETIRADO: "Retirado",
};

const ETIQUETA_ALUMNO: Record<string, string> = {
  ACTIVE: "Cursando",
  TRANSFERRED: "Trasladado",
  WITHDRAWN: "Retirado",
  GRADUATED: "Egresado",
};

// Ficha del alumno: su expediente completo.
export default async function EstudiantePage({
  params,
}: PageProps<"/colegios/estudiantes/[id]">) {
  const ctx = await requireSchoolContext("estudiantes");
  const { id } = await params;
  const puedeEditar = schoolCanWrite(ctx, "estudiantes");

  const student = await db.student.findFirst({
    where: { id, schoolId: ctx.school.id },
    include: {
      enrollments: {
        include: { course: { select: { id: true, name: true, year: true } } },
        orderBy: { enrolledAt: "desc" },
      },
      guardianships: {
        include: {
          guardian: {
            select: { id: true, name: true, phone: true, email: true, accessCode: true },
          },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          fileName: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
      consents: {
        orderBy: { purpose: "asc" },
        select: {
          id: true,
          purpose: true,
          status: true,
          grantedAt: true,
          grantedBy: true,
          method: true,
          revokedAt: true,
          revokedReason: true,
        },
      },
    },
  });
  if (!student) notFound();

  const [cursos, apoderadosDelColegio] = await Promise.all([
    db.course.findMany({
      where: { schoolId: ctx.school.id, active: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
      select: { id: true, name: true, year: true },
    }),
    db.guardian.findMany({
      where: { schoolId: ctx.school.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const resumenes = await Promise.all(
    student.enrollments.map(async (e) => ({
      curso: e.course,
      resumen: await attendanceSummary(student.id, e.course.id),
    })),
  );

  // Las notas de cada curso en que cursa: el mismo cálculo que usa el acta.
  const reportes = await Promise.all(
    student.enrollments
      .filter((e) => e.status === "ACTIVE")
      .map(async (e) => ({
        curso: e.course,
        reporte: await courseReport(e.course.id),
      })),
  );

  const ultima = await db.attendanceRecord.findMany({
    where: { studentId: student.id },
    orderBy: { recordedAt: "desc" },
    take: 12,
    include: { session: { include: { subject: { select: { name: true } } } } },
  });

  const matriculas = student.enrollments;
  const activa = matriculas.find((e) => e.status === "ACTIVE") ?? null;
  const vinculadas = new Set(student.guardianships.map((g) => g.guardianId));

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
          {student.birthDate ? ` · ${student.birthDate.toLocaleDateString("es-CL")}` : ""}
          {` · ${ETIQUETA_ALUMNO[student.status] ?? student.status}`}
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Matrícula</h2>
          <Link
            href={`/colegios/estudiantes/${student.id}/expediente`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Expediente completo
          </Link>
        </div>

        {matriculas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Este alumno no está matriculado en ningún curso.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {matriculas.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-sm">
                  <span className="font-medium">
                    {m.course.name} · {m.course.year}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    desde {m.enrolledAt.toLocaleDateString("es-CL")}
                    {m.endedAt ? ` hasta ${m.endedAt.toLocaleDateString("es-CL")}` : ""}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {ETIQUETA_MATRICULA[m.status] ?? m.status}
                  {m.statusReason ? ` · ${m.statusReason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {puedeEditar ? (
          <div className="mt-4 flex flex-wrap gap-6">
            <MoveStudentForm
              studentId={student.id}
              nombre={`${student.firstName} ${student.lastName}`}
              cursos={cursos.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
              cursoActual={activa?.course.id ?? null}
            />
            <WithdrawStudentForm
              studentId={student.id}
              nombre={`${student.firstName} ${student.lastName}`}
              cursoActual={activa?.course.id ?? null}
            />
          </div>
        ) : null}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Apoderados</h2>
        <div className="mt-3">
          <GuardianForms
            studentId={student.id}
            apoderados={student.guardianships.map((g) => ({
              id: g.guardian.id,
              nombre: g.guardian.name,
              tipo: g.type,
              tieneCodigo: g.guardian.accessCode !== null,
            }))}
            disponibles={apoderadosDelColegio
              .filter((g) => !vinculadas.has(g.id))
              .map((g) => ({ id: g.id, nombre: g.name }))}
            puedeEditar={puedeEditar}
          />
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Documentos</h2>
          <a
            href={`/colegios/estudiantes/${student.id}/portabilidad`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Descargar datos del alumno
          </a>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          El certificado de nacimiento, el de estudios y lo que el colegio tenga del alumno. El
          archivo queda en el expediente y solo lo ve quien tiene acceso al colegio.
        </p>
        <div className="mt-4">
          <DocumentForm
            studentId={student.id}
            documentos={student.documents.map((d) => ({
              id: d.id,
              title: d.title,
              type: d.type,
              description: d.description,
              fileName: d.fileName,
              sizeBytes: d.sizeBytes,
              creado: d.createdAt.toLocaleDateString("es-CL"),
            }))}
            puedeEditar={puedeEditar}
          />
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Consentimientos</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          La Ley 21.719 pide que el consentimiento sea específico (para qué se usa el dato) y que
          quede registro de quién lo firmó. También se puede revocar.
        </p>
        <div className="mt-4">
          <ConsentForms
            studentId={student.id}
            consentimientos={student.consents.map((c) => ({
              id: c.id,
              purpose: c.purpose,
              status: c.status,
              grantedAt: c.grantedAt ? c.grantedAt.toLocaleDateString("es-CL") : null,
              grantedBy: c.grantedBy,
              method: c.method,
              revokedAt: c.revokedAt ? c.revokedAt.toLocaleDateString("es-CL") : null,
              revokedReason: c.revokedReason,
            }))}
            puedeEditar={puedeEditar}
          />
        </div>
      </section>

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

      {reportes.map(({ curso, reporte }) => {
        const alumno = reporte.alumnos.find((a) => a.studentId === student.id);
        if (!alumno) return null;
        return (
          <section key={curso.id} className={cardClass + " p-5"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Notas · {curso.name}</h2>
              <p className="text-sm">
                <span className="tabular font-semibold">
                  promedio {alumno.promedio?.toFixed(1) ?? "—"}
                </span>
                <span
                  className={
                    "ml-3 font-medium " +
                    (alumno.situacion.estado === "PROMOVIDO" ? "text-success" : "text-accent")
                  }
                >
                  {alumno.situacion.estado === "PROMOVIDO" ? "Promovido" : "Requiere análisis"}
                </span>
              </p>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{alumno.situacion.fundamento}</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="px-2 py-2 font-medium text-muted-foreground">
                      Asignatura
                    </th>
                    {reporte.periodos.map((p) => (
                      <th
                        key={p.id}
                        scope="col"
                        className="px-2 py-2 text-right font-medium text-muted-foreground"
                      >
                        {p.nombre}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="px-2 py-2 text-right font-medium text-muted-foreground"
                    >
                      Final
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alumno.asignaturas.map((a) => (
                    <tr key={a.subjectId} className="border-b border-border/60">
                      <th scope="row" className="px-2 py-2 text-left font-normal">
                        {a.nombre}
                        {!a.incide ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">no incide</span>
                        ) : null}
                      </th>
                      {a.periodos.map((p) => (
                        <td key={p.periodoId} className="tabular px-2 py-2 text-right">
                          {p.nota === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            p.nota.toFixed(1)
                          )}
                        </td>
                      ))}
                      <td className="tabular px-2 py-2 text-right font-medium">
                        {a.final === null ? "—" : a.final.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

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
