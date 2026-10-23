// Registry de módulos de Yellow ERP.
//
// Un módulo es un producto con sus rutas, su nombre y su estado real. El selector
// de /modulos, el switcher del header y el destino post-login se generan todos
// desde aquí: agregar un módulo = agregar una entrada + sus rutas.
//
// Cada módulo resuelve su propio ámbito: Facturas, la empresa activa; Colegios,
// el colegio activo. Por eso `pendings` recibe el usuario y no una empresa.
//
// Habilitación: `enabledModules` exige las dos cosas en serie, igual que
// `requireContext`: que la organización tenga el módulo habilitado y que el
// usuario tenga acceso real a su ámbito (una empresa, un colegio).
//
// OJO con el personal de plataforma: ve TODOS los módulos habilitados del
// catálogo, aunque todavía no tenga ningún colegio creado. Sin esto, habilitar
// «Colegios» en la consola no servía para nada: el operador no tenía forma de
// entrar a verlo.

import { getCurrentUser } from "@/lib/auth";
import { countPendingMovements } from "@/lib/banco";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { enabledModuleCodes } from "@/lib/org-module-state";
import { pendingTotals } from "@/lib/reports";
import { hasPlatformLevel } from "@/lib/platform";
import { resolveActiveSchool } from "@/lib/school-auth";
import { subscriptionState } from "@/lib/plans";
import type { SessionUser } from "@/lib/types";

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
  /**
   * Módulo del núcleo: no se vende por separado, así que la habilitación por
   * organización no lo alcanza. En Colegios es `false`: se contrata.
   */
  core?: boolean;
};

const facturas: AppModule = {
  code: "facturas",
  name: "Facturas",
  description: "Compras, ventas, gastos, conciliación bancaria e IVA.",
  href: "/facturas",
  core: true,
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
    // El personal de plataforma entra a Colegios aunque todavía no tenga
    // colegio asignado: necesita ver el módulo que acaba de habilitar.
    if (await hasPlatformLevel(userId, "SUPPORT")) return true;
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
 
const billing: AppModule = {
  code: "billing",
  name: "Facturación SaaS",
  description: "Tus facturas, planes y métodos de pago de la plataforma.",
  href: "/billing",
  core: true,
  hasAccess: async (userId) => {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return false;
    // OWNER y ADMIN de la organización ven la facturación SaaS
    const { getActiveMembership } = await import("@/lib/auth");
    const active = await getActiveMembership();
    return active !== null && ["OWNER", "ADMIN"].includes(active.role);
  },
  pendings: async (userId) => {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return [];
 
    const { getActiveMembership } = await import("@/lib/auth");
    const active = await getActiveMembership();
    if (!active || !active.company.organizationId) return [];
 
    const orgId = active.company.organizationId!;
    const state = await subscriptionState(orgId);
    if (!state.plan) return [];
 
    const result: { label: string; value: string }[] = [];
    if (state.warning) result.push({ label: "Aviso", value: state.warning });
 
    const { db } = await import("@/lib/db");
    const overdue = await db.platformInvoice.count({
      where: { organizationId: orgId, status: "OVERDUE" },
    });
    if (overdue > 0) result.push({ label: "Facturas vencidas", value: String(overdue) });
 
    const pending = await db.platformInvoice.count({
      where: { organizationId: orgId, status: "PENDING" },
    });
    if (pending > 0) result.push({ label: "Pendientes de pago", value: String(pending) });
 
    return result;
  },
};
 
// Cookie con el último módulo usado (se marca como sugerencia en /modulos).
export const MODULE_COOKIE = "facturas_module";
 
const ALL_MODULES: AppModule[] = [facturas, colegios, billing];

/**
 * Módulos a los que el usuario puede entrar: los del registry a los que tiene
 * acceso real (una empresa activa, un colegio activo) y que su organización
 * tenga habilitados.
 *
 * Las dos condiciones van en serie, como en `requireContext`: la organización
 * decide si el producto se vendió, el ámbito decide si esta persona puede
 * usarlo.
 */
export async function enabledModules(userId: string): Promise<AppModule[]> {
  const user = await getCurrentUser();
  if (!user || user.id !== userId) return [];

  // Módulos habilitados para la organización activa del usuario. Sin
  // organización (instalación suelta), el catálogo entero.
  const organizationId = await activeOrganizationId(user);
  const habilitados = new Set(await enabledModuleCodes(organizationId));

  const resultados = await Promise.all(
    ALL_MODULES.map(async (module) => ({
      module,
      // El núcleo (Facturas) no se vende aparte: siempre está.
      habilitado: module.core === true || habilitados.has(module.code),
      acceso: await module.hasAccess(userId),
    })),
  );
  return resultados.filter((r) => r.habilitado && r.acceso).map((r) => r.module);
}

/** Organización de la que cuelga el usuario (la de su primera membresía activa). */
async function activeOrganizationId(user: SessionUser): Promise<string | null> {
  const { getActiveMembership } = await import("@/lib/auth");
  const active = await getActiveMembership();
  if (active) return active.company.organizationId ?? null;

  // Sin empresa (un colegio suelto) la organización sale de la pertenencia.
  const member = await db.orgMember.findFirst({
    where: { userId: user.id, active: true },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  return member?.organizationId ?? null;
}

/**
 * Destino después del login (o al abrir la raíz con sesión): con un solo módulo
 * se entra directo; con varios, al selector para que el usuario elija.
 */
export async function postLoginDestination(userId: string): Promise<string> {
  const modules = await enabledModules(userId);
  return modules.length === 1 ? modules[0].href : "/modulos";
}

/**
 * Los módulos que la plataforma ofrece, para la pantalla de entrada.
 *
 * Es la lista que ve alguien que todavía no entró: no depende de ninguna cuenta
 * (sería una fuga) ni de lo que tenga contratado nadie. Sale del mismo registro
 * que usa el selector, así que el login y el selector nunca dicen cosas
 * distintas; lo único propio de acá es la frase corta, que en el registro sería
 * un párrafo largo y acá tiene que caber en una línea.
 */
export type ProductoPublico = {
  code: string;
  name: string;
  /** Una línea: qué es, para quien nunca lo vio. */
  tagline: string;
};

const TAGLINES: Record<string, string> = {
  facturas: "Compras, ventas, gastos y conciliación bancaria.",
  colegios: "Libro de clases, asistencia, notas y convivencia.",
  billing: "Facturas de la plataforma, planes y métodos de pago.",
};

export const PRODUCTOS_PUBLICOS: ProductoPublico[] = ALL_MODULES.map((m) => ({
  code: m.code,
  name: m.name,
  tagline: TAGLINES[m.code] ?? m.description,
}));
