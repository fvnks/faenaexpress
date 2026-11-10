import type { DocumentType } from "@/generated/prisma/client";

import { documentTypeLabel } from "@/lib/labels";
import { documentTypeValues, listaFiltros } from "@/lib/validation";

/**
 * Filtros de los reportes (libros y desgloses).
 *
 * Todos viven en la URL: la página y el export leen exactamente los mismos
 * parámetros, así que lo que se ve en pantalla es lo que se exporta. Los
 * valores se validan contra la lista real antes de llegar a la consulta: una
 * URL tocada a mano no puede inventar un estado ni un tipo de documento.
 */

/** Estados de pago que se ofrecen al filtrar el libro de compras. */
export const ESTADOS_COMPRA = [
  { value: "PENDING", label: "Pendiente de pago" },
  { value: "PARTIAL", label: "Pago parcial" },
  { value: "PAID", label: "Pagada" },
] as const;

/** Estados de cobro que se ofrecen al filtrar el libro de ventas. */
export const ESTADOS_VENTA = [
  { value: "PENDING", label: "Por cobrar" },
  { value: "PARTIAL", label: "Cobro parcial" },
  { value: "OVERDUE", label: "Vencida" },
  { value: "PAID", label: "Cobrada" },
] as const;

export type FiltrosLibro = {
  /** Tipos de documento. Vacío = todos salvo cotización. */
  tipos: DocumentType[];
  /** Estados de pago o cobro. Vacío = todos. */
  estados: string[];
  /** Búsqueda libre: folio, razón social o RUT. */
  q: string;
  /** Área (id). */
  areaId: string | null;
  /** Vendedor (id). Solo en ventas. */
  vendedorId: string | null;
};

/** Tipos de documento que se ofrecen como filtro (la cotización no va al libro). */
export function opcionesTipoDocumento(): { value: string; label: string }[] {
  return documentTypeValues
    .filter((value) => value !== "QUOTATION")
    .map((value) => ({ value, label: documentTypeLabel(value as DocumentType) }));
}

/**
 * Lee los filtros de la URL.
 *
 * `estadosValidos` decide qué estados se aceptan: el libro de compras y el de
 * ventas no comparten el mismo catálogo (una compra no se vence sola).
 */
export function parseFiltrosLibro(
  params: URLSearchParams,
  estadosValidos: readonly { value: string }[],
): FiltrosLibro {
  const tipos = listaFiltros(params.get("tipo")).filter((value): value is DocumentType =>
    documentTypeValues.includes(value as DocumentType),
  );

  const permitidos = new Set(estadosValidos.map((estado) => estado.value));
  const estados = listaFiltros(params.get("estado")).filter((value) => permitidos.has(value));

  return {
    tipos,
    estados,
    q: (params.get("q") ?? "").trim(),
    areaId: params.get("area") || null,
    vendedorId: params.get("vendedor") || null,
  };
}

/** ¿Hay algún filtro activo? (para mostrar "Limpiar" y el resumen de la barra) */
export function hayFiltros(filtros: FiltrosLibro): boolean {
  return (
    filtros.tipos.length > 0 ||
    filtros.estados.length > 0 ||
    filtros.q.length > 0 ||
    filtros.areaId !== null ||
    filtros.vendedorId !== null
  );
}

/**
 * Serializa los filtros de vuelta a la URL, para el enlace de export.
 *
 * Solo lleva lo que está activo: el export sin filtros es el mismo archivo
 * que se descarga desde el resumen.
 */
export function filtrosToQuery(filtros: FiltrosLibro): string {
  const params = new URLSearchParams();
  if (filtros.tipos.length > 0) params.set("tipo", filtros.tipos.join(","));
  if (filtros.estados.length > 0) params.set("estado", filtros.estados.join(","));
  if (filtros.q) params.set("q", filtros.q);
  if (filtros.areaId) params.set("area", filtros.areaId);
  if (filtros.vendedorId) params.set("vendedor", filtros.vendedorId);
  return params.toString();
}

/**
 * Convierte los `searchParams` de una página en `URLSearchParams`.
 *
 * En Next 16 un parámetro puede venir repetido (`?tipo=A&tipo=B`); se toma
 * el primero, que es lo que hacen el resto de las pantallas de la app.
 */
export function paramsDesdeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(searchParams)) {
    if (typeof valor === "string") params.set(clave, valor);
    else if (Array.isArray(valor) && valor[0]) params.set(clave, valor[0]);
  }
  return params;
}

// --- Filtros de gastos ---------------------------------------------------------

export type FiltrosGastos = {
  /** Área (id). */
  areaId: string | null;
  /** Categoría (id). */
  categoriaId: string | null;
  /** Trabajador (id). */
  trabajadorId: string | null;
  /** Búsqueda libre: descripción, nota o folio. */
  q: string;
};

export function parseFiltrosGastos(params: URLSearchParams): FiltrosGastos {
  return {
    areaId: params.get("area") || null,
    categoriaId: params.get("categoria") || null,
    trabajadorId: params.get("trabajador") || null,
    q: (params.get("q") ?? "").trim(),
  };
}

export function hayFiltrosGastos(filtros: FiltrosGastos): boolean {
  return (
    filtros.areaId !== null ||
    filtros.categoriaId !== null ||
    filtros.trabajadorId !== null ||
    filtros.q.length > 0
  );
}

export function filtrosGastosToQuery(filtros: FiltrosGastos): string {
  const params = new URLSearchParams();
  if (filtros.areaId) params.set("area", filtros.areaId);
  if (filtros.categoriaId) params.set("categoria", filtros.categoriaId);
  if (filtros.trabajadorId) params.set("trabajador", filtros.trabajadorId);
  if (filtros.q) params.set("q", filtros.q);
  return params.toString();
}
