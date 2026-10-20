import type { InventoryAccess, Role } from "@/generated/prisma/client";

// Secciones de la aplicación que un rol puede ver.
export const sections = [
  "panel",
  "compras",
  "ventas",
  "gastos",
  "rrhh",
  "clientes",
  "proveedores",
  "catalogos",
  "reportes",
  "auditoria",
  "importar",
  "inventario",
  "comisiones",
  "configuracion",
  "organizacion",
  "banco",
] as const;

export type Section = (typeof sections)[number];

// Quién entra a cada sección.
const ACCESS: Record<Section, readonly Role[]> = {
  panel: ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"],
  // El vendedor entra en solo lectura: necesita verificar compras y proveedores
  // sin poder crearlos ni pagarlos (eso sigue en WRITE).
  compras: ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"],
  ventas: ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"],
  gastos: ["ADMIN", "ACCOUNTANT", "VIEWER"],
  // Los sueldos son datos sensibles: solo administración y contabilidad.
  rrhh: ["ADMIN", "ACCOUNTANT"],
  clientes: ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"],
  proveedores: ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"],
  catalogos: ["ADMIN", "ACCOUNTANT"],
  reportes: ["ADMIN", "ACCOUNTANT", "VIEWER"],
  auditoria: ["ADMIN", "ACCOUNTANT"],
  importar: ["ADMIN", "ACCOUNTANT"],
  inventario: ["ADMIN", "ACCOUNTANT", "VIEWER"],
  // Todos ven la tabla: es un ranking abierto. Lo sensible no es verla, es
  // cambiarla y cerrar el mes, que es lo de abajo.
  comisiones: ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"],
  configuracion: ["ADMIN", "ACCOUNTANT"],
  // La organización es la cuenta (empresas del grupo, miembros, invitaciones).
  // El rol de empresa decide si el ítem se ve; el rol de organización (OWNER/ADMIN)
  // decide si se entra: la página exige `requireOrgManager`.
  organizacion: ["ADMIN", "ACCOUNTANT"],
  // Los movimientos bancarios exponen la caja real de la empresa: igual que
  // RRHH, solo administración y contabilidad.
  banco: ["ADMIN", "ACCOUNTANT"],
};

// Quién puede crear, editar o eliminar dentro de cada sección.
// Ver una sección no implica poder escribir en ella.
const WRITE: Record<Section, readonly Role[]> = {
  panel: [],
  compras: ["ADMIN", "ACCOUNTANT"],
  ventas: ["ADMIN", "ACCOUNTANT", "SALES"],
  gastos: ["ADMIN", "ACCOUNTANT"],
  rrhh: ["ADMIN", "ACCOUNTANT"],
  clientes: ["ADMIN", "ACCOUNTANT", "SALES"],
  proveedores: ["ADMIN", "ACCOUNTANT"],
  catalogos: ["ADMIN", "ACCOUNTANT"],
  reportes: [],
  auditoria: [],
  importar: ["ADMIN", "ACCOUNTANT"],
  inventario: ["ADMIN", "ACCOUNTANT"],
  // Cerrar un mes congela montos que se pagan. No lo puede hacer el vendedor
  // que cobra: mismo criterio que RRHH.
  comisiones: ["ADMIN", "ACCOUNTANT"],
  configuracion: ["ADMIN"],
  // Las empresas y los miembros de la organización los administra el OWNER/ADMIN
  // de la organización; aquí solo se declara que la sección existe.
  organizacion: ["ADMIN"],
  // Conciliar mueve el estado de pago de compras y ventas: ADMIN/ACCOUNTANT.
  banco: ["ADMIN", "ACCOUNTANT"],
};

export function canAccess(role: Role, section: Section): boolean {
  return ACCESS[section].includes(role);
}

export function canWrite(role: Role, section: Section): boolean {
  return WRITE[section].includes(role);
}

// Nivel efectivo de acceso a inventario. El override del usuario manda si
// está puesto (VIEW/EDIT); con NONE se cae al nivel base del rol, para que
// nadie quede fuera del módulo por no haber configurado su membresía.
export function effectiveInventoryAccess(role: Role, override?: InventoryAccess): InventoryAccess {
  if (override && override !== "NONE") return override;
  if (WRITE["inventario"].includes(role)) return "EDIT";
  if (ACCESS["inventario"].includes(role)) return "VIEW";
  return "NONE";
}

// ---------------------------------------------------------------------------
// Excepciones por sección (permisos finos por persona)
// ---------------------------------------------------------------------------

/** Nivel de acceso a una sección: nada, solo leer, o leer y escribir. */
export type SectionAccess = "NONE" | "VIEW" | "EDIT";

export const SECTION_ACCESS_VALUES: SectionAccess[] = ["NONE", "VIEW", "EDIT"];

/** Secciones que se pueden afinar por persona (las que son módulos contratables). */
export const CONFIGURABLE_SECTIONS = ["rrhh", "inventario", "comisiones", "banco"] as const;

export type ConfigurableSection = (typeof CONFIGURABLE_SECTIONS)[number];

/** El mapa de excepciones tal como viene de la base (JSON). */
export type SectionAccessMap = Record<string, string> | null | undefined;

/**
 * El acceso efectivo a una sección: primero la excepción de esta persona, y si
 * no hay, el rol.
 *
 * `NONE` en el mapa significa «esta persona NO entra a esta sección», aunque su
 * rol se la dé. Es al revés de la columna `inventoryAccess`, donde `NONE` quiere
 * decir «sin configurar» y por eso se cae al rol: esa columna es más antigua y
 * no se cambia de significado para no romper lo que ya funciona.
 */
export function effectiveSectionAccess(
  role: Role,
  section: Section,
  opts: { inventoryAccess?: InventoryAccess; sectionAccess?: SectionAccessMap } = {},
): SectionAccess {
  const excepcion = opts.sectionAccess?.[section];
  if (excepcion === "NONE" || excepcion === "VIEW" || excepcion === "EDIT") {
    return excepcion;
  }

  // Inventario tiene su columna propia, más antigua: manda si no es "NONE".
  if (section === "inventario" && opts.inventoryAccess && opts.inventoryAccess !== "NONE") {
    return opts.inventoryAccess;
  }

  if (WRITE[section].includes(role)) return "EDIT";
  if (ACCESS[section].includes(role)) return "VIEW";
  return "NONE";
}

/** ¿Puede entrar a la sección? */
export function canAccessSection(
  role: Role,
  section: Section,
  opts: { inventoryAccess?: InventoryAccess; sectionAccess?: SectionAccessMap } = {},
): boolean {
  return effectiveSectionAccess(role, section, opts) !== "NONE";
}

/** ¿Puede escribir en la sección? */
export function canWriteSection(
  role: Role,
  section: Section,
  opts: { inventoryAccess?: InventoryAccess; sectionAccess?: SectionAccessMap } = {},
): boolean {
  return effectiveSectionAccess(role, section, opts) === "EDIT";
}
