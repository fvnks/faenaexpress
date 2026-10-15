"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { bulkAssignSalesperson, bulkSetSaleStatus, deleteSale, markSalePaid, markSaleConfirming, clearSaleConfirming } from "@/app/actions/sales";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BulkSelectAll } from "@/components/bulk-select";
import { CancelSaleModal } from "@/components/cancel-sale-modal";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass } from "@/lib/ui";

type SaleItem = {
  id: string;
  documentNumber: string | null;
  date: Date;
  totalAmount: number;
  status: string;
  paymentDate: Date | null;
  confirmingAt: Date | null;
  purchaseOrder: string | null;
  hesNumber: string | null;
  partner: { name: string; rut: string | null };
  salesperson: { name: string } | null;
  cancellationNoteNumber: string | null;
  cancellationType: string | null;
  cancellationReason: string | null;
  cancellationComment: string | null;
  refacturadaNumber: string | null;
  companyId: string;
};

type Props = {
  items: SaleItem[];
  writable: boolean;
  salespeople: { id: string; name: string }[];
};

export function SalesTable({ items, writable, salespeople }: Props) {
  const [cancelModalSaleId, setCancelModalSaleId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const cancelSaleItem = cancelModalSaleId ? items.find((s) => s.id === cancelModalSaleId) : null;

  return (
    <>
      <form id="ventas-bulk" action={bulkSetSaleStatus} className={cardClass}>
        {writable ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <BulkSelectAll formId="ventas-bulk" total={items.length} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                name="status"
                value="PAID"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
              >
                Marcar cobradas
              </button>
              <button
                type="submit"
                name="status"
                value="PENDING"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
              >
                Marcar por cobrar
              </button>
              <button
                type="submit"
                name="status"
                value="PARTIAL"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
              >
                Marcar parciales
              </button>
              <button
                type="submit"
                name="status"
                value="OVERDUE"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
              >
                Marcar vencidas
              </button>
              <button
                type="button"
                onClick={() => {
                  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked');
                  if (checkboxes.length === 0) return;
                  if (checkboxes.length > 1) {
                    alert("La cancelación debe hacerse una venta a la vez.");
                    return;
                  }
                  const saleId = checkboxes[0].value;
                  setCancelModalSaleId(saleId);
                }}
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
              >
                Marcar anuladas
              </button>
            </div>
          </div>
        ) : null}
        {writable && salespeople.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="asignar-vendedor" className="text-xs text-muted-foreground">
                Asignar vendedor a seleccionadas
              </label>
              <select
                id="asignar-vendedor"
                name="salespersonId"
                defaultValue=""
                className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm"
              >
                <option value="">Seleccionar vendedor…</option>
                {salespeople.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked');
                if (checkboxes.length === 0) return;
                const ids = Array.from(checkboxes).map((c) => c.value).join(",");
                const select = document.getElementById("asignar-vendedor") as HTMLSelectElement;
                const salespersonId = select?.value ?? "";
                if (!salespersonId) return;
                const formData = new FormData();
                formData.set("ids", ids);
                formData.set("salespersonId", salespersonId);
                startTransition(async () => {
                  await bulkAssignSalesperson(formData);
                });
              }}
              className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
            >
              Asignar
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {writable ? <th className="w-8 px-2 py-2" /> : null}
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Folio</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">OC</th>
                <th className="px-3 py-2 font-medium">HES</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                {writable ? <th className="w-12 px-2 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((sale) => (
                <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                  {writable ? (
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        name="ids"
                        value={sale.id}
                        aria-label={`Seleccionar venta ${sale.documentNumber ?? sale.partner.name}`}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                  ) : null}
                  <td className="min-w-0 max-w-[14rem] px-3 py-2 align-top">
                    <Link
                      href={`/dashboard/ventas/${sale.id}`}
                      className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {sale.partner.name}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {sale.partner.rut ?? "—"}
                      {sale.salesperson?.name ? ` · ${sale.salesperson.name}` : ""}
                    </span>
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                    {sale.documentNumber ?? "—"}
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(sale.date)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                    {sale.purchaseOrder ?? "—"}
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                    {sale.hesNumber ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {sale.confirmingAt ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Confirming
                      </span>
                    ) : (
                      <SaleStatusBadge status={sale.status as never} />
                    )}
                    {sale.paymentDate ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Cobrado: {formatDate(sale.paymentDate)}
                      </span>
                    ) : null}
                    {sale.confirmingAt ? (
                      <span className="mt-0.5 block text-xs text-primary">
                        {formatDate(sale.confirmingAt)}
                      </span>
                    ) : null}
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                    {formatCLP(sale.totalAmount)}
                  </td>
                  {writable ? (
                    <td className="px-2 py-2 align-top text-right">
                      <ActionsDropdown
                        editHref={`/dashboard/ventas/${sale.id}/editar`}
                        pdfHref={`/dashboard/ventas/${sale.id}/pdf`}
                        printHref={`/dashboard/ventas/${sale.id}/print`}
                        deleteAction={deleteSale}
                        deleteId={sale.id}
                        deleteMessage="¿Eliminar esta venta? Esta acción no se puede deshacer."
                        onMarkPaid={() => {
                          const entered = window.prompt("Fecha cobrada (DD-MM o DD-MM-AAAA):");
                          const cleaned = entered ? entered.trim().replace(/\//g, "-") : null;
                          if (!cleaned) return;
                          const parsed = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
                          if (!parsed) return;
                          const day = parsed[1].padStart(2, "0");
                          const month = parsed[2].padStart(2, "0");
                          const year = parsed[3] ?? String(new Date().getFullYear());
                          const wire = `${year}-${month}-${day}`;
                          if (!/^\d{4}-\d{2}-\d{2}$/.test(wire)) return;
                          const formData = new FormData();
                          formData.set("id", sale.id);
                          formData.set("paymentDate", wire);
                          startTransition(async () => {
                            await markSalePaid(formData);
                          });
                        }}
                        confirming={Boolean(sale.confirmingAt)}
                        onToggleConfirming={() => {
                          const formData = new FormData();
                          formData.set("id", sale.id);
                          if (sale.confirmingAt) {
                            startTransition(async () => {
                              await clearSaleConfirming(formData);
                            });
                            return;
                          }
                          const entered = window.prompt("Fecha Confirming (DD-MM o DD-MM-AAAA):");
                          const cleaned = entered ? entered.trim().replace(/\//g, "-") : null;
                          if (!cleaned) return;
                          const parsed = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
                          if (!parsed) return;
                          const day = parsed[1].padStart(2, "0");
                          const month = parsed[2].padStart(2, "0");
                          const year = parsed[3] ?? String(new Date().getFullYear());
                          const wire = `${year}-${month}-${day}`;
                          if (!/^\d{4}-\d{2}-\d{2}$/.test(wire)) return;
                          formData.set("confirmingDate", wire);
                          startTransition(async () => {
                            await markSaleConfirming(formData);
                          });
                        }}
                        onCancel={() => {
                          setCancelModalSaleId(sale.id);
                        }}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      {cancelSaleItem ? (
        <CancelSaleModal
          saleId={cancelSaleItem.id}
          existingNoteNumber={cancelSaleItem.cancellationNoteNumber}
          existingNoteType={cancelSaleItem.cancellationType}
          existingReason={cancelSaleItem.cancellationReason}
          existingComment={cancelSaleItem.cancellationComment}
          existingRefacturada={cancelSaleItem.refacturadaNumber}
        />
      ) : null}
    </>
  );
}
