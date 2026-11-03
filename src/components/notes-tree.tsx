"use client";

// Árbol desplegable de notas en las listas de ventas y compras.
//
// Cada factura (o boleta) que tiene una nota de crédito o débito asignada
// muestra un toggle con la cantidad, y al abrirlo se despliegan las notas
// debajo de la fila: tipo, folio, fecha, estado y monto. La fila desplegada
// abarca todas las columnas (`colSpan`), así que no rompe la grilla de la
// tabla ni la selección masiva.
//
// Sin estado aquí (salvo el toggle): el que abre y cierra es cada tabla.
// usable desde componentes de servidor y de cliente.

import Link from "next/link";

import type { DocumentType, PaymentStatus, SaleStatus } from "@/generated/prisma/client";
import { formatCLP, formatDate } from "@/lib/money";
import { documentTypeLabel } from "@/lib/labels";

import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { SaleStatusBadge } from "@/components/sale-status-badge";

/** Lo que hace falta mostrar de una nota dentro del árbol de su documento. */
export type NotaArbol = {
  id: string;
  documentType: string;
  documentNumber: string | null;
  date: Date;
  totalAmount: number;
  status: string;
  /** Link a la ficha de la nota. */
  href: string;
};

/** Lo mínimo que una fila ya cargada entrega de cada nota que ajusta. */
export type NotaFuente = {
  id: string;
  documentType: string;
  documentNumber: string | null;
  date: Date;
  totalAmount: number;
  status: string;
};

/** Pasa de la fila del prisma al shape del árbol. */
export function notaArbol(nota: NotaFuente, href: string): NotaArbol {
  return {
    id: nota.id,
    documentType: nota.documentType,
    documentNumber: nota.documentNumber,
    date: nota.date,
    totalAmount: nota.totalAmount,
    status: nota.status,
    href,
  };
}

export function NoteChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 " + (open ? "rotate-90" : "")
      }
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** El toggle con la cantidad de notas asignadas, dentro de la celda Folio. */
export function NotesToggle({
  abierto,
  onToggle,
  cantidad,
}: {
  abierto: boolean;
  onToggle: () => void;
  cantidad: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={abierto}
      className="-ml-1 mt-0.5 inline-flex items-center gap-0.5 rounded-control px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary-soft/40 hover:text-foreground"
    >
      <NoteChevron open={abierto} />
      {cantidad === 1 ? "1 nota" : `${cantidad} notas`}
    </button>
  );
}

/**
 * La fila desplegada: una por documento con notas, siempre debajo de su fila
 * madre. Si no hay notas, no se pinta nada (el caller ni la llama).
 */
export function NotesTreeRow({
  notas,
  scope,
  colSpan,
}: {
  notas: NotaArbol[];
  scope: "venta" | "compra";
  colSpan: number;
}) {
  if (notas.length === 0) return null;

  return (
    <tr className="border-b border-border last:border-0 bg-primary-soft/20">
      <td colSpan={colSpan} className="px-4 py-2.5">
        <ul className="flex flex-col gap-1.5 pl-2 sm:pl-9">
          {notas.map((nota) => (
            <li key={nota.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium text-foreground">
                {documentTypeLabel(nota.documentType as DocumentType)}
                {nota.documentNumber ? ` N° ${nota.documentNumber}` : " (sin folio)"}
              </span>
              <span className="tabular text-xs text-muted-foreground">{formatDate(nota.date)}</span>
              {scope === "venta" ? (
                <SaleStatusBadge status={nota.status as SaleStatus} />
              ) : (
                <PurchaseStatusBadge status={nota.status as PaymentStatus} />
              )}
              <span className="tabular ml-auto whitespace-nowrap font-semibold">{formatCLP(nota.totalAmount)}</span>
              <Link
                href={nota.href}
                className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Ver
              </Link>
            </li>
          ))}
        </ul>
      </td>
    </tr>
  );
}
