// Comunicación del colegio: circulares, justificaciones de inasistencia y
// citaciones.
//
// Son las tres cosas que hacen que el portal del apoderado sirva de algo: la
// familia recibe los comunicados, propone justificar una inasistencia y
// contesta una citación. Y del lado del colegio, lo que se necesita es saber
// a quién hay que volver a avisar.

import { db } from "@/lib/db";

/**
 * Los apoderados a los que le llega una circular.
 *
 * - COLEGIO: todos los del colegio.
 * - CURSO: los de los alumnos del curso.
 * - FAMILIA: el que va dirigida.
 */
export async function destinatariosCircular(
  schoolId: string,
  circular: { audience: string; courseId: string | null; guardianId: string | null },
): Promise<string[]> {
  if (circular.audience === "FAMILIA" && circular.guardianId) {
    return [circular.guardianId];
  }

  if (circular.audience === "CURSO" && circular.courseId) {
    const rows = await db.guardianship.findMany({
      where: {
        guardian: { schoolId },
        student: { enrollments: { some: { courseId: circular.courseId, status: "ACTIVE" } } },
      },
      select: { guardianId: true },
    });
    return [...new Set(rows.map((r) => r.guardianId))];
  }

  const rows = await db.guardian.findMany({
    where: { schoolId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Las circulares que le tocan a un apoderado, con su acuse de lectura. */
export async function circularesParaApoderado(guardianId: string) {
  const acks = await db.circularAck.findMany({
    where: { guardianId },
    select: { circularId: true, readAt: true },
  });
  const leidas = new Map(acks.map((a) => [a.circularId, a.readAt]));

  const guardians = await db.guardian.findMany({
    where: { id: guardianId },
    select: {
      schoolId: true,
      guardianships: {
        select: {
          student: {
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
                select: { courseId: true },
              },
            },
          },
        },
      },
    },
  });
  const g = guardians[0];
  if (!g) return [];

  const cursos = new Set(
    g.guardianships.flatMap((gs) => gs.student.enrollments.map((e) => e.courseId)),
  );

  const todas = await db.circular.findMany({
    where: {
      schoolId: g.schoolId,
      OR: [
        { audience: "COLEGIO" },
        { audience: "FAMILIA", guardianId },
        { audience: "CURSO", courseId: { in: [...cursos] } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    include: { course: { select: { name: true } } },
  });

  return todas.map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    publishedAt: c.publishedAt,
    closesAt: c.closesAt,
    curso: c.course?.name ?? null,
    leida: leidas.get(c.id) ?? null,
  }));
}

/** Las circulares del colegio con el acuse: quién leyó y quién no. */
export async function circularesConAcuses(schoolId: string) {
  const circulares = await db.circular.findMany({
    where: { schoolId },
    orderBy: { publishedAt: "desc" },
    include: {
      course: { select: { name: true } },
      guardian: { select: { name: true } },
      acks: { select: { guardianId: true, readAt: true } },
    },
  });

  return Promise.all(
    circulares.map(async (c) => {
      const destinatarios = await destinatariosCircular(schoolId, c);
      const leidas = new Map(c.acks.map((a) => [a.guardianId, a.readAt]));
      const pendientes = destinatarios.filter((id) => !leidas.has(id));
      const nombres = await db.guardian.findMany({
        where: { id: { in: pendientes } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return {
        id: c.id,
        title: c.title,
        body: c.body,
        audience: c.audience,
        curso: c.course?.name ?? null,
        familia: c.guardian?.name ?? null,
        publishedAt: c.publishedAt,
        destinatarios: destinatarios.length,
        leidas: c.acks.length,
        pendientes: nombres,
      };
    }),
  );
}

/**
 * Las inasistencias sin justificar que la familia puede proponer justificar.
 *
 * Solo las que son del alumno de esa familia y siguen "AUSENTE": una
 * justificada o una eximida no se vuelven a proponer.
 */
export async function inasistenciasPorJustificar(
  schoolId: string,
  guardianId: string,
) {
  const hijos = await db.guardianship.findMany({
    where: { guardianId, guardian: { schoolId } },
    select: { studentId: true },
  });
  const ids = hijos.map((h) => h.studentId);
  if (ids.length === 0) return [];

  const registros = await db.attendanceRecord.findMany({
    where: {
      studentId: { in: ids },
      status: "ABSENT",
    },
    orderBy: { recordedAt: "desc" },
    take: 20,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      session: {
        select: {
          id: true,
          date: true,
          subject: { select: { name: true } },
          course: { select: { name: true } },
        },
      },
    },
  });

  // Las que ya tienen una solicitud pendiente o resuelta: no se proponen de nuevo.
  const solicitudes = await db.justificationRequest.findMany({
    where: { sessionId: { in: registros.map((r) => r.sessionId) } },
    select: { sessionId: true, status: true, reason: true, requestedAt: true },
  });
  const porSesion = new Map(solicitudes.map((s) => [s.sessionId, s]));

  return registros
    .filter((r) => r.status === "ABSENT")
    .map((r) => {
      const s = porSesion.get(r.sessionId);
      return {
        sessionId: r.sessionId,
        alumno: `${r.student.firstName} ${r.student.lastName}`,
        fecha: r.session.date,
        asignatura: r.session.subject.name,
        curso: r.session.course.name,
        solicitud: s ?? null,
      };
    });
}

/** La bandeja del colegio: lo que las familias esperan respuesta. */
export async function bandejaPendientes(schoolId: string) {
  const [justificaciones, citas] = await Promise.all([
    db.justificationRequest.findMany({
      where: { schoolId, status: "PENDIENTE" },
      orderBy: { requestedAt: "asc" },
      include: {
        student: { select: { firstName: true, lastName: true } },
        guardian: { select: { name: true } },
        session: { select: { date: true, subject: { select: { name: true } } } },
      },
    }),
    db.appointment.findMany({
      where: { schoolId, status: "PENDIENTE" },
      orderBy: { scheduledAt: "asc" },
      include: {
        student: { select: { firstName: true, lastName: true } },
        guardian: { select: { name: true } },
      },
    }),
  ]);

  return { justificaciones, citas };
}
