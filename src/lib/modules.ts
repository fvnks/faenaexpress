// Registry de módulos de Yellow ERP.
//
// Un módulo es un producto con sus rutas, su nombre y su estado real. El selector
// de /modulos, el switcher del header y el destino post-login se generan todos
// desde aquí: agregar un módulo = agregar una entrada + sus rutas.
//
// Cada módulo resuelve su propio ámbito: Facturas, la empresa activa; Colegios,
// el colegio activo. Por eso `pendings` recibe el usuario y no una empresa.
//
// Habilitación: hoy todos los módulos del registry están activos para todas las
// organizaciones. Cuando lleguen los planes, `enabledModules` leerá el plan de
// cada organización y filtrará esta lista.

import { getCurrentUser } from "@/lib/auth";
import { countPendingMovements } from "@/lib/banco";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { pendingTotals } from "@/lib/reports";
import { resolveActiveSchool } from "@/lib/school-auth";

// Estado real de un módulo: números que ya existen, no adorno de tarjeta.
export type ModulePending = { label: string; value: string };

export type AppModule = {
  code: string;
  name: string;
  description: string;
  href: string;
  /**
   * Estado real del módulo para ESTE usuario. Cada módulo resuelve su propio
   * ámbito (Facturas, la empresa activa; Colegios, el colegio activo), que es
   * justamente lo que permite que los dos productos convivan.
   */
  pendings: (userId: string) => Promise<ModulePending[]>;
  /**
   * ¿El usuario tiene acceso a este módulo? Si no, el módulo no se le ofrece:
   * una tarjeta que lleva a ninguna parte es peor que no tenerla.
   */
  hasAccess: (userId: string) => Promise<boolean>;
};

const facturas: AppModule = {
  code: "facturas",
  name: "Facturas",
  description: "Compras, ventas, gastos, conciliación bancaria e IVA.",
  href: "/facturas",
  hasAccess: async (userId) => {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return false;
    const { getActiveMembership } = await import("@/lib/auth");
    return (await getActiveMembership()) !== null;
  },
  pendings: async (userId) => {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return [];

    const { getActiveMembership } = await import("@/lib/auth");
    const active = await getActiveMembership();
    if (!active) return [];

    const [totals, bank] = await Promise.all([
      pendingTotals(active.company.id),
      countPendingMovements(active.company.id),
    ]);
    return [
      { label: "Por cobrar", value: formatCLP(totals.porCobrar) },
      { label: "Por pagar", value: formatCLP(totals.porPagar) },
      { label: "Por conciliar", value: bank === 0 ? "al día" : `${bank} movimientos` },
    ];
  },
};

const colegios: AppModule = {
  code: "colegios",
  name: "Colegios",
  description: "Alumnos, cursos, asistencia y el libro de clases digital.",
  href: "/colegios",
  hasAccess: async (userId) => {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return false;
    const { visibleSchools } = await import("@/lib/school-auth");
    return (await visibleSchools(user)).length > 0;
  },
  pendings: async (userId) => {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return [];

    const ctx = await resolveActiveSchool(user);
    if (!ctx) return [];

    const [alumnos, cursos, docentes] = await Promise.all([
      db.student.count({ where: { schoolId: ctx.school.id, status: "ACTIVE" } }),
      db.course.count({ where: { schoolId: ctx.school.id, active: true } }),
      db.teacher.count({ where: { schoolId: ctx.school.id } }),
    ]);

    return [
      { label: "Alumnos", value: String(alumnos) },
      { label: "Cursos", value: String(cursos) },
      { label: "Docentes", value: String(docentes) },
    ];
  },
};

// Cookie con el último módulo usado (se marca como sugerencia en /modulos).
export const MODULE_COOKIE = "facturas_module";

const ALL_MODULES: AppModule[] = [facturas, colegios];

/**
 * Módulos a los que el usuario puede entrar: los del registry a los que tiene
 * acceso (una empresa activa, un colegio activo) y que su plan tenga
 * habilitados.
 */
export async function enabledModules(userId: string): Promise<AppModule[]> {
  const resultados = await Promise.all(
    ALL_MODULES.map(async (module) => ({
      module,
      acceso: await module.hasAccess(userId),
    })),
  );
  return resultados.filter((r) => r.acceso).map((r) => r.module);
}

/**
 * Destino después del login (o al abrir la raíz con sesión): con un solo módulo
 * se entra directo; con varios, al selector para que el usuario elija.
 */
export async function postLoginDestination(userId: string): Promise<string> {
  const modules = await enabledModules(userId);
  return modules.length === 1 ? modules[0].href : "/modulos";
}
