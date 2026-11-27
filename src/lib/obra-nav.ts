// Secciones de primer nivel donde tiene sentido permanecer al cambiar de obra.
// Si el usuario está en una ficha con id (que no existe en la otra obra), vuelve al panel.
export const SECCIONES_OBRA = new Set([
  "/obras",
  "/obras/presupuesto",
  "/obras/avance",
  "/obras/estados-pago",
  "/obras/compras",
  "/obras/gastos",
  "/obras/subcontratos",
  "/obras/bodega",
  "/obras/maquinaria",
  "/obras/documentos",
  "/obras/equipo",
  "/obras/administracion",
  "/obras/reportes",
  "/obras/mis-obras",
]);

export function destinoObraSeguro(destino: string | null | undefined): string {
  return destino && SECCIONES_OBRA.has(destino) ? destino : "/obras";
}
