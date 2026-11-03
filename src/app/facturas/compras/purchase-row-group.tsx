"use client";

// Fila de la lista de compras + el árbol desplegable de sus notas asignadas.
//
// Vive en un componente propio porque el árbol necesita estado local (qué
// filas están abiertas) y el resto de la página es un Server Component. La
// fila es la misma de siempre: el toggle va en la celda Folio y la fila
// desplegada de notas se pinta debajo de la fila madre, abarcando todas las
// columnas, así que los checkbox de la selección masiva no cambian.

import Link from "next/link";
import { Fragment, useState } from "react";

import { deletePurchase } from "@/app/actions/purchases";
import { fetchPurchaseXmlAction } from "@/app/actions/defontana";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { NotesToggle, NotesTreeRow, type NotaArbol } from "@/components/notes-tree";
import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { XmlBadge } from "@/components/xml-badge";
import { formatCLP, formatDate } from "@/lib/money";

export type PurchaseRowItem = {
  id: string;
  documentNumber: string | null;
  xmlContent: string | null;
  date: Date;
  dueDate: Date | null;
  status: string;
  paymentDate: Date | null;
  totalAmount: number;
  partnerId: string;
  partner: { name: string; rut: string | null };
  area: { name: string } | null;
};

type Props = {
  purchase: PurchaseRowItem;
  notas: NotaArbol[];
  writable: boolean;
  hasDefontanaCredentials: boolean;
  today: Date;
};

// Fecha de vencimiento: en rojo si ya pasó y sigue pendiente, en acento si
// vence dentro de la semana. Lo ya pagado no alarma.
function dueTone(dueDate: Date, status: string, today: Date): string {
  if (status !== "PENDING") return "text-muted-foreground";
  const days = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "text-danger font-semibold";
  if (days <= 7) return "text-accent font-semibold";
  return "text-muted-foreground";
}

export function PurchaseRowGroup({ purchase, notas, writable, hasDefontanaCredentials, today }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Fragment>
      <tr className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
        {writable ? (
          <td className="px-2 py-2 align-top">
            <input
              type="checkbox"
              name="ids"
              value={purchase.id}
              data-amount={purchase.totalAmount}
              aria-label={`Seleccionar compra ${purchase.documentNumber ?? purchase.partner.name}`}
              className="h-4 w-4 accent-primary"
            />
          </td>
        ) : null}
        <td className="min-w-0 max-w-[14rem] px-3 py-2 align-top">
          <Link
            href={`/facturas/compras/${purchase.id}`}
            className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
          >
            {purchase.partner.name}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">
            {purchase.partner.rut ?? "—"}
            {purchase.area?.name ? ` · ${purchase.area.name}` : ""}
          </span>
        </td>
        <td className="tabular whitespace-nowrap px-3 py-2 align-top">
          <span className="block">{purchase.documentNumber ?? "—"}</span>
          <XmlBadge tieneXml={Boolean(purchase.xmlContent)} />
          {notas.length > 0 ? (
            <NotesToggle abierto={abierto} onToggle={() => setAbierto((prev) => !prev)} cantidad={notas.length} />
          ) : null}
        </td>
        <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(purchase.date)}</td>
        <td className="tabular whitespace-nowrap px-3 py-2 align-top">
          {purchase.dueDate ? (
            <>
              <span className={dueTone(purchase.dueDate, purchase.status, today)}>
                {formatDate(purchase.dueDate)}
              </span>
              {purchase.status === "PENDING" && purchase.dueDate < today ? (
                <span className="mt-0.5 block text-xs font-semibold text-danger">Vencida</span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <PurchaseStatusBadge status={purchase.status as never} />
          {purchase.paymentDate ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {formatDate(purchase.paymentDate)}
            </span>
          ) : null}
        </td>
        <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
          {formatCLP(purchase.totalAmount)}
        </td>
        {writable ? (
          <td className="px-2 py-2 align-top text-right">
            <ActionsDropdown
              editHref={`/facturas/compras/${purchase.id}/editar`}
              pdfHref={`/facturas/compras/${purchase.id}/pdf`}
              deleteAction={deletePurchase}
              deleteId={purchase.id}
              deleteMessage="¿Eliminar esta compra? Esta acción no se puede deshacer."
              fetchDefontana={{
                id: purchase.id,
                fieldName: "purchaseId",
                action: fetchPurchaseXmlAction,
                label: purchase.xmlContent
                  ? "XML ya cargado"
                  : "Traer XML de Defontana",
              }}
              hasDefontanaCredentials={hasDefontanaCredentials}
            />
          </td>
        ) : null}
      </tr>
      {notas.length > 0 ? (
        <NotesTreeRow notas={notas} scope="compra" colSpan={writable ? 8 : 6} />
      ) : null}
    </Fragment>
  );
}
