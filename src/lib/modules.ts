// Registry de módulos de Yellow ERP.
//
// Un módulo es un producto con sus rutas, su nombre y su estado real. El selector
// de /modulos, el switcher del header y el destino post-login se generan todos
// desde aquí: agregar un módulo = agregar una entrada + sus rutas.
//
// Habilitación: hoy todos los módulos del registry están activos para todas las
// organizaciones. Cuando lleguen los planes (F3), `enabledModules` leerá el plan
// de cada organización y filtrará esta lista.

import { countPendingMovements } from "@/lib/banco";
import { formatCLP } from "@/lib/money";
import { pendingTotals } from "@/lib/reports";

// Estado real de un módulo para una empresa concreta: números que ya existen,
// no adorno de tarjeta.
export type ModulePending = { label: string; value: string };

export type AppModule = {
  code: string;
  name: string;
  description: string;
  href: string;
  /** Estado real de este módulo para la empresa indicada (pendientes, saldos). */
  pendings: (companyId: string) => Promise<ModulePending[]>;
};

const facturas: AppModule = {
  code: "facturas",
  name: "Facturas",
  description: "Compras, ventas, gastos, conciliación bancaria e IVA.",
  href: "/facturas",
  pendings: async (companyId) => {
    const [totals, bank] = await Promise.all([
      pendingTotals(companyId),
      countPendingMovements(companyId),
    ]);
    return [
      { label: "Por cobrar", value: formatCLP(totals.porCobrar) },
      { label: "Por pagar", value: formatCLP(totals.porPagar) },
      { label: "Por conciliar", value: bank === 0 ? "al día" : `${bank} movimientos` },
    ];
  },
};

// Cookie con el último módulo usado (se marca como sugerencia en /modulos).
export const MODULE_COOKIE = "facturas_module";

const ALL_MODULES: AppModule[] = [facturas];

/**
 * Módulos habilitados para las organizaciones en las que el usuario es miembro.
 * Hoy: todos los del registry. Con planes (F3): el plan de cada organización
 * filtra esta lista y se devuelven los que el usuario pueda abrir.
 */
export async function enabledModules(_userId: string): Promise<AppModule[]> {
  return ALL_MODULES;
}

/**
 * Destino después del login (o al abrir la raíz con sesión): con un solo módulo
 * se entra directo; con varios, al selector para que el usuario elija.
 */
export async function postLoginDestination(userId: string): Promise<string> {
  const modules = await enabledModules(userId);
  return modules.length === 1 ? modules[0].href : "/modulos";
}
