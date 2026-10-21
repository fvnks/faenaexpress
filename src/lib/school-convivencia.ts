// Convivencia escolar (Ley 21.809, vigente desde el 1-jul-2026).
//
// La ley cambió varias cosas del Reglamento Interno de Convivencia Escolar:
// ahora el protocolo tiene que traer **canales de denuncia confidenciales**,
// **procedimientos de investigación con plazos definidos** y una **comisión de
// expulsión**; y el colegio tiene que tener un **Plan de Gestión de la
// Convivencia** que se revisa con la comunidad cada 4 años.
//
// Lo que no es del colegio y por eso el sistema lo calcula: el plazo máximo de
// la investigación interna de un caso de alumno (2 meses). Si el colegio se
// demora más, el caso se vence solo, y eso es exactamente lo que la ley
// quiso que se notara.

import { db } from "@/lib/db";
import { AREAS_PLAN, ETIQUETA_ESTADO_CASO, TIPOS_ACCION, TIPOS_CASO } from "@/lib/school-convivencia-rules";

/**
 * Los casos con su estado y su urgencia.
 *
 * La urgencia sale del plazo: un caso con la investigación por vencerse es
 * "urgent", uno vencido es "vencido". Es el dato que la dirección necesita
 * todas las mañanas.
 */
export async function casosConEstado(schoolId: string) {
  const casos = await db.conductCase.findMany({
    where: { schoolId },
    orderBy: [{ status: "asc" }, { investigationDueAt: "asc" }],
    include: {
      participants: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
      actions: { select: { id: true, dueAt: true, doneAt: true, title: true } },
    },
  });

  const hoy = new Date();
  return casos.map((caso) => {
    const dias = Math.ceil(
      (caso.investigationDueAt.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );
    const accionesPendientes = caso.actions.filter((a) => !a.doneAt);
    const accionesVencidas = accionesPendientes.filter(
      (a) => a.dueAt && a.dueAt < hoy,
    ).length;

    let urgencia: "vencido" | "urgente" | "proximo" | "ok" = "ok";
    if (caso.status !== "CERRADO" && caso.status !== "RESUELTO") {
      if (dias < 0) urgencia = "vencido";
      else if (dias <= 15) urgencia = "urgente";
      else if (dias <= 30) urgencia = "proximo";
    }

    return {
      ...caso,
      tipo: TIPOS_CASO[caso.type] ?? caso.type,
      estado: ETIQUETA_ESTADO_CASO[caso.status] ?? caso.status,
      diasRestantes: dias,
      urgencia,
      accionesVencidas,
      accionesPendientes: accionesPendientes.length,
      alumnos: caso.participants.map((p) => ({
        id: p.student.id,
        nombre: `${p.student.firstName} ${p.student.lastName}`,
        rol: p.role,
      })),
    };
  });
}

/** Las acciones pendientes de todo el colegio, ordenadas por urgencia. */
export async function accionesPendientes(schoolId: string) {
  const acciones = await db.conductAction.findMany({
    where: { doneAt: null, caso: { schoolId, status: { notIn: ["CERRADO", "RESUELTO"] } } },
    include: {
      caso: {
        select: {
          id: true,
          title: true,
          type: true,
          investigationDueAt: true,
          participants: {
            include: { student: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  const hoy = new Date();
  return acciones.map((a) => {
    const dias = a.dueAt ? Math.ceil((a.dueAt.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return {
      ...a,
      tipo: TIPOS_ACCION[a.type] ?? a.type,
      diasRestantes: dias,
      vencido: a.dueAt ? a.dueAt < hoy : false,
      alumnos: a.caso.participants.map(
        (p) => `${p.student.firstName} ${p.student.lastName}`,
      ),
    };
  });
}

/** El plan de gestión del colegio, con sus acciones. */
export async function planDeConvivencia(schoolId: string, anio: number) {
  const plan = await db.convivenciaPlan.findFirst({
    where: { schoolId, year: anio },
    include: { activities: { orderBy: [{ area: "asc" }, { dueAt: "asc" }] } },
  });
  if (!plan) return null;

  const hoy = new Date();
  const areas = AREAS_PLAN as Record<string, string>;
  return {
    ...plan,
    areas: plan.activities.map((a) => ({
      ...a,
      area: areas[a.area] ?? a.area,
      vencida: a.dueAt ? a.dueAt < hoy && !a.doneAt : false,
    })),
    revisionVencida: plan.reviewDueAt ? plan.reviewDueAt < hoy : false,
  };
}

/**
 * Los protocolos del colegio.
 *
 * Los pasos vienen en JSON porque son la configuración del protocolo y cambian
 * por versión; lo que se sigue en el tiempo (los casos) vive en tablas.
 */
export async function protocolosDelColegio(schoolId: string) {
  const protocolos = await db.conductProtocol.findMany({
    where: { schoolId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return protocolos.map((p) => {
    const pasos = Array.isArray(p.steps) ? (p.steps as Record<string, unknown>[]) : [];
    return {
      ...p,
      pasos: pasos.map((s) => ({
        nombre: String(s.name ?? ""),
        plazoDias: Number(s.deadlineDays ?? 0),
        responsable: String(s.responsible ?? ""),
      })),
    };
  });
}

/** El paso del protocolo que aplica a un tipo de caso, con su plazo. */
export function pasoDelProtocolo(
  pasos: { nombre: string; plazoDias: number; responsable: string }[],
  tipoAccion: string,
): { nombre: string; plazoDias: number; responsable: string } | null {
  const clave = tipoAccion.toLowerCase();
  return (
    pasos.find((p) => clave.includes(p.nombre.toLowerCase().split(" ")[0])) ?? null
  );
}
