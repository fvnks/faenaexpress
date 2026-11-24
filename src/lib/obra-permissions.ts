// Permisos del módulo Obras.
//
// Paralelo a `school-permissions.ts` (y a `permissions.ts`, que es de empresas):
// una obra no se gobierna igual que una empresa ni que un colegio. Los roles
// son propios y el corte va en las Server Actions, que son alcanzables por POST
// directo: la UI es solo la primera capa.

import type { ObraRole, ObraStatus } from "@/generated/prisma/client";

export const obraSections = [
  "panel",
  "presupuesto",
  "avance",
  "estadosPago",
  "compras",
  "gastos",
  "subcontratos",
  "bodega",
  "maquinaria",
  "documentos",
  "equipo",
  "administracion",
] as const;

export type ObraSection = (typeof obraSections)[number];

// Quién entra a cada sección.
const ACCESS: Record<ObraSection, readonly ObraRole[]> = {
  panel: ["ADMIN_OBRA", "CAPATAZ", "CONTADOR", "VISUALIZADOR"],
  presupuesto: ["ADMIN_OBRA", "CAPATAZ", "CONTADOR", "VISUALIZADOR"],
  avance: ["ADMIN_OBRA", "CAPATAZ", "CONTADOR", "VISUALIZADOR"],
  estadosPago: ["ADMIN_OBRA", "CONTADOR", "VISUALIZADOR"],
  // Las compras y gastos son los documentos que alimentan el costo real.
  compras: ["ADMIN_OBRA", "CONTADOR", "CAPATAZ", "VISUALIZADOR"],
  gastos: ["ADMIN_OBRA", "CONTADOR", "CAPATAZ", "VISUALIZADOR"],
  subcontratos: ["ADMIN_OBRA", "CONTADOR", "VISUALIZADOR"],
  bodega: ["ADMIN_OBRA", "CAPATAZ", "CONTADOR", "VISUALIZADOR"],
  maquinaria: ["ADMIN_OBRA", "CAPATAZ", "VISUALIZADOR"],
  documentos: ["ADMIN_OBRA", "CONTADOR", "CAPATAZ", "VISUALIZADOR"],
  // Dar acceso a la obra es decidir quién ve sus costos: dirección solamente.
  equipo: ["ADMIN_OBRA", "VISUALIZADOR"],
  administracion: ["ADMIN_OBRA"],
};

// Quién puede escribir en cada sección.
const WRITE: Record<ObraSection, readonly ObraRole[]> = {
  panel: [],
  presupuesto: ["ADMIN_OBRA", "CONTADOR"],
  // El avance lo mide el capataz en terreno; la dirección lo corrige.
  avance: ["ADMIN_OBRA", "CAPATAZ"],
  estadosPago: ["ADMIN_OBRA", "CONTADOR"],
  compras: ["ADMIN_OBRA", "CONTADOR", "CAPATAZ"],
  gastos: ["ADMIN_OBRA", "CONTADOR", "CAPATAZ"],
  subcontratos: ["ADMIN_OBRA", "CONTADOR"],
  bodega: ["ADMIN_OBRA", "CAPATAZ"],
  maquinaria: ["ADMIN_OBRA", "CAPATAZ"],
  documentos: ["ADMIN_OBRA", "CONTADOR", "CAPATAZ"],
  equipo: ["ADMIN_OBRA"],
  administracion: ["ADMIN_OBRA"],
};

export function canAccessObra(role: ObraRole, section: ObraSection): boolean {
  return ACCESS[section].includes(role);
}

export function canWriteObra(role: ObraRole, section: ObraSection): boolean {
  return WRITE[section].includes(role);
}

/** Solo la dirección de obra puede aprobar cubicaciones y estados de pago. */
export const APRUEBA_AVANCE: readonly ObraRole[] = ["ADMIN_OBRA"];
export function puedeAprobarAvance(role: ObraRole): boolean {
  return APRUEBA_AVANCE.includes(role);
}

export const OBRA_ROLES: readonly ObraRole[] = ["ADMIN_OBRA", "CAPATAZ", "CONTADOR", "VISUALIZADOR"];

export const OBRA_ROLE_LABELS: Record<ObraRole, string> = {
  ADMIN_OBRA: "Administrador de obra",
  CAPATAZ: "Capataz",
  CONTADOR: "Contador",
  VISUALIZADOR: "Solo lectura",
};

export function obraRoleLabel(role: ObraRole): string {
  return OBRA_ROLE_LABELS[role] ?? role;
}

export const OBRA_STATUS_LABELS: Record<ObraStatus, string> = {
  PLANIFICADA: "Planificada",
  EN_CURSO: "En curso",
  SUSPENDIDA: "Suspendida",
  TERMINADA: "Terminada",
};

export function obraStatusLabel(status: ObraStatus): string {
  return OBRA_STATUS_LABELS[status] ?? status;
}
