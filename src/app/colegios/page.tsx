import Link from "next/link";

import { Kpi04 } from "@/components/ui/studio-blocks";
import { AsistenciaLineChart } from "@/components/school-charts";
import { DistribucionNotasCard } from "@/components/school-charts";
import { FormattedDate } from "@/components/formatted-date";
import { RendimientoCursoBars } from "@/components/school-charts";
import { db } from "@/lib/db";
import { todayISO } from "@/lib/money";
import { schoolLevelLabel, canAccessSchool, type SchoolSection } from "@/lib/school-permissions";
import { requireSchoolContext } from "@/lib/school-auth";
import {
  resumenAsistenciaColegio,
  asistenciaDiaria,
  rendimientoPorCurso,
  rendimientoPorAsignatura,
  resumenConvivenciaPanel,
  ultimasClasesFirmadas,
} from "@/lib/school-panel";
import { resumenConvivencia } from "@/lib/school-convivencia";
import { estadoDeFirmas } from "@/lib/school-signatures";
import { cardClass } from "@/lib/ui";

type Paso = {
  href: string;
  seccion: SchoolSection;
  titulo: string;
  porQue: string;
  destino: string;
  listo: boolean;
};

/**
 * La clase de hoy como la ve el panel del colegio: con su cobertura de
 * asistencia y su firma. Mismos tres estados que la vista del docente, porque
 * dos pantallas con distintas palabras para lo mismo serían dos verdades.
 */
type SesionHoy = {
  id: string;
  period: number;
  startTime: string | null;
  curso: string;
  asignatura: string;
  docente: string;
  courseId: string;
  registrados: number;
  esperados: number;
  firmada: boolean;
};

const badgeClase = (sesion: SesionHoy) => {
  const completa = sesion.registrados >= sesion.esperados && sesion.esperados > 0;
  return sesion.firmada
    ? { texto: "Firmada", clase: "bg-success-soft text-success" }
    : completa
      ? { texto: "Sin firmar", clase: "bg-accent-soft text-accent" }
      : { texto: "Asistencia incompleta", clase: "bg-background text-muted-foreground" };
};

// Panel del colegio: el estado real del establecimiento.
//
// Un colegio recién creado no tiene nada: sin cursos ni docentes no hay
// asistencia ni notas, y el panel era un tablero en cero sin ninguna salida.
// Por eso, mientras falten pasos, el panel los lista en orden y lleva a la
// pantalla donde se hacen.
export default async function ColegiosPage() {
  const ctx = await requireSchoolContext("panel");
  const schoolId = ctx.school.id;

  // El docente no ve el panel del colegio (son las métricas de la dirección):
  // ve su jornada, que es otra pregunta.
  if (ctx.role === "TEACHER") {
    const { TeacherHome } = await import("@/app/colegios/teacher-home");
    return <TeacherHome userId={ctx.user.id} schoolId={schoolId} nombre={ctx.user.name} />;
  }

  // ── Métricas generales ───────────────────────────────────────────────────
  const [alumnos, cursos, docentes, apoderados, matriculas, asignaturas, cursosConPlan] =
    await Promise.all([
      db.student.count({ where: { schoolId, status: "ACTIVE" } }),
      db.course.count({ where: { schoolId, active: true } }),
      db.teacher.count({ where: { schoolId } }),
      db.guardian.count({ where: { schoolId } }),
      db.enrollment.count({ where: { course: { schoolId }, status: "ACTIVE" } }),
      db.subject.count({ where: { schoolId } }),
      db.course.count({ where: { schoolId, active: true, assignments: { some: {} } } }),
    ]);

  const [
    resumenAsistencia,
    datosAsistenciaDiaria,
    rendimientoCursos,
    rendimientoAsignaturas,
    convivenciaPanel,
    firmasEstado,
    ultimasFirmas,
  ] = await Promise.all([
    resumenAsistenciaColegio(schoolId),
    asistenciaDiaria(schoolId),
    rendimientoPorCurso(schoolId),
    rendimientoPorAsignatura(schoolId),
    resumenConvivenciaPanel(schoolId),
    estadoDeFirmas(schoolId),
    ultimasClasesFirmadas(schoolId, 5),
  ]);

  // Los pasos, en orden. El panel solo lista los que faltan: el checklist se
  // achica a medida que el colegio se arma y no vuelve a mostrar lo hecho.
  const catalogo: Paso[] = [
    {
      href: "/colegios/docentes",
      seccion: "docentes",
      titulo: "Registra a los docentes",
      porQue: "Sin docentes no hay clases ni notas: el plan del curso se arma con ellos.",
      destino: "Docentes",
      listo: docentes > 0,
    },
    {
      href: "/colegios/cursos",
      seccion: "cursos",
      titulo: "Crea las asignaturas del plan",
      porQue: "El plan de estudios es lo que después se reparte entre los cursos.",
      destino: "Cursos",
      listo: asignaturas > 0,
    },
    {
      href: "/colegios/cursos",
      seccion: "cursos",
      titulo: "Crea los cursos",
      porQue: "Cada curso agrupa a los alumnos de un nivel, con su año y su letra.",
      destino: "Cursos",
      listo: cursos > 0,
    },
    {
      href: "/colegios/cursos",
      seccion: "cursos",
      titulo: "Asigna el plan a cada curso",
      porQue: "Cada curso necesita sus asignaturas y el docente que las imparte.",
      destino: "Cursos",
      listo: cursos > 0 && cursosConPlan === cursos,
    },
    {
      href: "/colegios/estudiantes",
      seccion: "estudiantes",
      titulo: "Matricula a los alumnos",
      porQue: "Un alumno sin curso no tiene asistencia ni notas.",
      destino: "Alumnos",
      listo: matriculas > 0,
    },
  ];

  // Cada paso lleva a una sección: si el rol no entra, el paso no se ofrece.
  const pendientes = catalogo.filter(
    (paso) => !paso.listo && canAccessSchool(ctx.role, paso.seccion),
  );

  // ── Métricas KPI del panel ───────────────────────────────────────────────
  const metricas = [
    { label: "Alumnos", valor: alumnos, href: "/colegios/estudiantes", seccion: "estudiantes" as SchoolSection },
    { label: "Matrículas", valor: matriculas, href: "/colegios/estudiantes", seccion: "estudiantes" as SchoolSection },
    { label: "Cursos", valor: cursos, href: "/colegios/cursos", seccion: "cursos" as SchoolSection },
    { label: "Docentes", valor: docentes, href: "/colegios/docentes", seccion: "docentes" as SchoolSection },
    { label: "Apoderados", valor: apoderados, href: "/colegios/apoderados", seccion: "apoderados" as SchoolSection },
    { label: "Tasa de asistencia", valor: resumenAsistencia.porcentajeAsistencia, href: "/colegios/asistencia", seccion: "asistencia" as SchoolSection, format: "number" as const },
    { label: "Clases firmadas", valor: resumenAsistencia.clasesFirmadas, href: "/colegios/libro", seccion: "libro" as SchoolSection },
    { label: "Sin firmar", valor: resumenAsistencia.clasesSinFirmar, href: "/colegios/libro", seccion: "libro" as SchoolSection },
  ];

  // ── Lo que pasa hoy ──────────────────────────────────────────────────────
  const armado = matriculas > 0 && cursos > 0;
  const hoy = new Date(`${todayISO()}T12:00:00.000Z`);

  const datosHoy = armado
    ? await Promise.all([
        db.classSession.findMany({
          where: { schoolId, date: hoy },
          orderBy: [{ period: "asc" }, { startTime: "asc" }],
          select: {
            id: true,
            period: true,
            startTime: true,
            courseId: true,
            course: { select: { name: true } },
            subject: { select: { name: true } },
            teacher: { select: { name: true } },
            signature: { select: { id: true } },
          },
        }),
        db.attendanceRecord.groupBy({
          by: ["sessionId"],
          where: { session: { schoolId, date: hoy } },
          _count: { sessionId: true },
        }),
        db.attendanceRecord.count({
          where: { session: { schoolId, date: hoy }, status: "ABSENT" },
        }),
        db.justificationRequest.count({ where: { schoolId, status: "PENDIENTE" } }),
        db.appointment.count({ where: { schoolId, status: "PENDIENTE" } }),
        resumenConvivencia(schoolId),
      ])
    : null;

  const clasesCrudas = datosHoy?.[0] ?? [];
  const asistentes = datosHoy?.[1] ?? [];
  const ausentesHoy = datosHoy?.[2] ?? 0;
  const porJustificar = datosHoy?.[3] ?? 0;
  const citasSinConfir = datosHoy?.[4] ?? 0;
  const convivencia =
    datosHoy?.[5] ?? { abiertos: 0, vencidos: 0, urgentes: 0 };

  const registradosPorSesion = new Map(
    asistentes.map((a) => [a.sessionId, Number(a._count.sessionId)]),
  );

  const esperadosPorCurso = new Map<string, number>();
  if (clasesCrudas.length > 0) {
    const refs = await db.enrollment.findMany({
      where: { courseId: { in: [...new Set(clasesCrudas.map((c) => c.courseId))] }, status: "ACTIVE" },
      select: { courseId: true },
    });
    for (const r of refs) {
      esperadosPorCurso.set(r.courseId, (esperadosPorCurso.get(r.courseId) ?? 0) + 1);
    }
  }

  const clasesHoy: SesionHoy[] = clasesCrudas.map((c) => ({
    id: c.id,
    period: c.period,
    startTime: c.startTime,
    curso: c.course.name,
    asignatura: c.subject.name,
    docente: c.teacher.name,
    courseId: c.courseId,
    registrados: registradosPorSesion.get(c.id) ?? 0,
    esperados: esperadosPorCurso.get(c.courseId) ?? 0,
    firmada: Boolean(c.signature),
  }));

  const rango = (c: SesionHoy) =>
    c.firmada ? 2 : c.registrados >= c.esperados && c.esperados > 0 ? 1 : 0;
  clasesHoy.sort((a, b) => rango(a) - rango(b));

  const porResponder = Number(porJustificar) + Number(citasSinConfir);
  const hayHoy = clasesHoy.length > 0 || ausentesHoy > 0 || porResponder > 0;
  const clasesListadas = clasesHoy.slice(0, 6);
  const clasesRestantes = clasesHoy.length - clasesListadas.length;
  const clasesCompletas = clasesHoy.filter(
    (c) => c.registrados >= c.esperados && c.esperados > 0,
  ).length;
  const urgenciasConvivencia = convivencia.vencidos + convivencia.urgentes;

  const cursosListados = await db.course.findMany({
    where: { schoolId, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    take: 12,
    include: { _count: { select: { enrollments: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{ctx.school.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {schoolLevelLabel(ctx.school.level)}
          {ctx.school.commune ? ` · ${ctx.school.commune}` : ""}
          {ctx.school.rut ? ` · RUT ${ctx.school.rut}` : ""}
        </p>
      </div>

      {pendientes.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Puesta en marcha</h2>
            <p className="text-xs text-muted-foreground">
              {pendientes.length === 1 ? "Falta un paso" : `Faltan ${pendientes.length} pasos`}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Mientras falten, el colegio no puede tomar asistencia ni registrar notas.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {pendientes.map((paso) => (
              <li
                key={paso.titulo}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{paso.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{paso.porQue}</p>
                </div>
                <Link
                  href={paso.href}
                  className="shrink-0 text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  {paso.destino}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-card border border-success/50 bg-success-soft p-5">
          <h2 className="font-semibold text-success">Colegio listo</h2>
          <p className="mt-1 text-sm text-success/80">
            Todos los pasos de configuración están completos: el colegio ya puede tomar asistencia y
            registrar notas.
          </p>
        </section>
      )}

      {/* ── KPIs del panel ──────────────────────────────────────────────── */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricas.map((m) => {
          const puedeEntrar = canAccessSchool(ctx.role, m.seccion);
          const props: {
            title?: string;
            value: number;
            format?: "currency" | "number";
            footer?: string;
          } = {
            title: m.label,
            value: m.valor,
            format: m.format ?? "number",
          };
          if (m.label === "Tasa de asistencia") {
            props.footer = `${resumenAsistencia.totalClases} clases · ${resumenAsistencia.inasistencias} inasistencias`;
          }
          if (m.label === "Clases firmadas") {
            props.footer = `${resumenAsistencia.clasesSinFirmar} pendientes de firma`;
          }
          if (m.label === "Sin firmar") {
            props.footer = `De ${firmasEstado.sesiones} clases registradas`;
          }
          return (
            <li key={m.label}>
              {puedeEntrar ? (
                <Link href={m.href} className="block rounded-card hover:opacity-90">
                  <Kpi04 {...props} />
                </Link>
              ) : (
                <Kpi04 {...props} />
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Hoy en el colegio ────────────────────────────────────────────── */}
      {hayHoy ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Hoy en el colegio</h2>
            <p className="text-xs text-muted-foreground tabular">
              {clasesHoy.length > 0
                ? `${clasesHoy.length} ${clasesHoy.length === 1 ? "clase registrada" : "clases registradas"} · ${clasesCompletas} con asistencia completa`
                : "Sin clases registradas hoy"}
              {ausentesHoy > 0 ? ` · ${ausentesHoy} ${ausentesHoy === 1 ? "ausente" : "ausentes"}` : ""}
            </p>
          </div>

          {clasesListadas.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {clasesListadas.map((c) => {
                const badge = badgeClase(c);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {c.curso} · {c.asignatura}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular">
                        Período {c.period}
                        {c.startTime ? ` · ${c.startTime}` : ""} · {c.docente} · asistencia{" "}
                        {c.registrados} de {c.esperados}
                      </p>
                    </div>
                    <span className={"rounded-full px-2.5 py-1 text-xs font-medium " + badge.clase}>
                      {badge.texto}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {clasesRestantes > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              y hay {clasesRestantes} {clasesRestantes === 1 ? "clase más" : "clases más"} hoy.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-sm">
            {porResponder > 0 ? (
              canAccessSchool(ctx.role, "comunicacion") ? (
                <Link
                  href="/colegios/comunicacion"
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  {porResponder} {porResponder === 1 ? "respuesta pendiente" : "respuestas pendientes"} de las familias
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {porResponder} {porResponder === 1 ? "respuesta pendiente" : "respuestas pendientes"} de las familias
                </span>
              )
            ) : null}
            {clasesHoy.length > 0 ? (
              <Link
                href="/colegios/asistencia"
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Ir a Asistencia
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── Gráficos: asistencia y rendimiento ───────────────────────────── */}
      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución y rendimiento</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <AsistenciaLineChart data={datosAsistenciaDiaria} />
          </div>
          <div className="lg:col-span-2">
            <RendimientoCursoBars data={rendimientoCursos} />
          </div>
        </div>

        <div className="mt-6">
          <DistribucionNotasCard data={rendimientoCursos} />
        </div>
      </section>

      {/* ── Convivencia ──────────────────────────────────────────────────── */}
      {convivenciaPanel.abiertos > 0 ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Convivencia</h2>
            {canAccessSchool(ctx.role, "convivencia") ? (
              <Link
                href="/colegios/convivencia"
                className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Ver casos
              </Link>
            ) : null}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-card border border-accent/50 bg-accent-soft p-3">
              <p className="text-xs text-accent/80 font-medium">Casos abiertos</p>
              <p className="text-xl leading-none tabular-nums font-semibold text-accent">
                {convivenciaPanel.abiertos}
              </p>
            </div>
            <div className="rounded-card border border-danger/50 bg-danger-soft p-3">
              <p className="text-xs text-danger/80 font-medium">Vencidos</p>
              <p className="text-xl leading-none tabular-nums font-semibold text-danger">
                {convivenciaPanel.vencidos}
              </p>
            </div>
            <div className="rounded-card border border-warning/50 bg-warning-soft p-3">
              <p className="text-xs text-warning/80 font-medium">Por vencer (≤30 días)</p>
              <p className="text-xl leading-none tabular-nums font-semibold text-warning">
                {convivenciaPanel.proximos}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {convivenciaPanel.abiertos} {convivenciaPanel.abiertos === 1 ? "caso abierto" : "casos abiertos"}
            {convivenciaPanel.vencidos > 0
              ? `, ${convivenciaPanel.vencidos} ${convivenciaPanel.vencidos === 1 ? "con la investigación vencida" : "con la investigación vencida"}`
              : ""}
            {convivenciaPanel.proximos > 0
              ? `, ${convivenciaPanel.proximos} ${convivenciaPanel.proximos === 1 ? "con la investigación por vencer" : "con la investigación por vencer"} en menos de 30 días`
              : ""}
            {(convivenciaPanel.vencidos > 0 || convivenciaPanel.proximos > 0) ? " (plazo de la Ley 21.809)" : ""}
          </p>
        </section>
      ) : null}

      {/* ── Últimas clases firmadas ──────────────────────────────────────── */}
      {ultimasFirmas.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Últimas clases firmadas</h2>
            {canAccessSchool(ctx.role, "libro") ? (
              <Link
                href="/colegios/libro"
                className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Ver libro de clases
              </Link>
            ) : null}
          </div>
          <ul className="mt-3 divide-y divide-border">
            {ultimasFirmas.map((f: { id: string; curso: string; asignatura: string; firmante: string; fecha: Date }) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {f.curso} · {f.asignatura}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Firmado por {f.firmante} ·
                    <FormattedDate iso={f.fecha.toISOString()} />
                  </p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-success-soft text-success">
                  Firmada
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Cursos ───────────────────────────────────────────────────────── */}
      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Cursos</h2>
          {cursosListados.length < cursos && canAccessSchool(ctx.role, "cursos") ? (
            <Link
              href="/colegios/cursos"
              className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Ver todos
            </Link>
          ) : null}
        </div>
        {cursosListados.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay cursos en este colegio.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {cursosListados.map((curso) => (
              <li key={curso.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium">{curso.name}</span>
                <span className="text-xs text-muted-foreground">
                  {curso._count.enrollments} alumnos · {curso.year}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
