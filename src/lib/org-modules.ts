// Módulos que se pueden vender por separado.
//
// El núcleo del producto (compras, ventas, gastos, terceros, catálogos,
// reportes) es siempre del cliente. Lo que se puede vender por separado es lo
// de arriba: RRHH, inventario, comisiones y conciliación bancaria. Son
// «módulos sueltos»: se venden por separado y la organización decide a quién
// se les muestra.
//
// Dos filtros, en serie (decisión de `PLAN-SAAS.md` §3):
//
//   lo que ve el usuario =
//       módulos habilitados para su organización
//     ∩ secciones a las que su rol da acceso
//
// La sección sigue mandando: si RRHH está habilitado pero el usuario es
// VENDEDOR, no ve RRHH. Son dos reglas que se aplican, no se reemplazan.

import type { Section } from "@/lib/permissions";

export type OrgModule = {
  code: string;
  name: string;
  description: string;
  /** Las secciones que abre este módulo. */
  sections: Section[];
  /** Si es del núcleo, no se puede desactivar. */
  core: boolean;
};

/** Módulos contratables. Todo lo que no esté aquí es núcleo. */
export const ORG_MODULES: OrgModule[] = [
  {
    code: "facturas",
    name: "Facturas",
    description: "Compras, ventas, gastos, terceros, catálogos y reportes.",
    // Facturas ya no es núcleo: se contrata. Quien solo tiene Punto de Venta
    // gestiona su catálogo desde /pos/productos y no ve nada de /facturas.
    // El inventario avanzado (bodegas, costos, conteos) vive en el módulo
    // Inventario; los datos son compartidos con el POS.
    sections: ["panel", "compras", "ventas", "gastos", "clientes", "proveedores", "catalogos", "reportes", "auditoria", "importar", "configuracion", "organizacion"],
    core: false,
  },
  {
    code: "rrhh",
    name: "RRHH y nómina",
    description: "Trabajadores, remuneraciones, liquidaciones y ausencias.",
    sections: ["rrhh"],
    core: false,
  },
  {
    code: "inventario",
    name: "Inventario y stock",
    description: "Productos, bodegas, movimientos, conteos y lotes.",
    sections: ["inventario"],
    core: false,
  },
  {
    code: "comisiones",
    name: "Comisiones",
    description: "Asignación de comisiones a vendedores y cierre de meses.",
    sections: ["comisiones"],
    core: false,
  },
  {
    code: "banco",
    name: "Conciliación bancaria",
    description: "Sincronización de movimientos y conciliación con compras y ventas.",
    sections: ["banco"],
    core: false,
  },
  {
    code: "colegios",
    name: "Colegios",
    description: "Libro de clases digital, asistencia, calificaciones y convivencia escolar.",
    // Colegios es un módulo de OTRO producto: sus secciones no viven en el
    // sidebar de Facturas (son rutas y permisos propios, `SchoolSection`). Acá
    // solo se declara para que se pueda vender y habilitar por organización.
    sections: [],
    core: false,
  },
  {
    code: "pos",
    name: "Punto de Venta",
    description: "Ventas rápidas, control de caja e impresión de tickets.",
    // POS también es un producto aparte: tiene sus propias rutas y su propio
    // permiso de escritura (ventas). Acá solo se declara para que la
    // organización lo pueda contratar y habilitar.
    sections: [],
    core: false,
  },
];

/** Módulos del núcleo: siempre están, no se tocan. */
export const CORE_MODULES: OrgModule[] = [
  {
    code: "billing",
    name: "Facturación SaaS",
    description: "Facturas de la plataforma, planes y métodos de pago.",
    sections: [],
    core: true,
  },
];

/** Todos los módulos, nucleus y contratables. */
export const ALL_ORG_MODULES: OrgModule[] = [...CORE_MODULES, ...ORG_MODULES];

export function findOrgModule(code: string): OrgModule | undefined {
  return ALL_ORG_MODULES.find((m) => m.code === code);
}

/** A qué módulo pertenece una sección (si pertenece a alguno). */
export function moduleForSection(section: Section): OrgModule | undefined {
  return ALL_ORG_MODULES.find((m) => m.sections.includes(section));
}
