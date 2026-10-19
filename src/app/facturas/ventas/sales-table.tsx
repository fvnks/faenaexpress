"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { bulkAssignSalesperson, bulkSetSaleStatus, deleteSale, markSalePaid, markSaleConfirming, clearSaleConfirming, assignSaleSalesperson } from "@/app/actions/sales";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BulkSelectAll } from "@/components/bulk-select";
import { CancelSaleModal } from "@/components/cancel-sale-modal";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { SortableHeader } from "@/components/sortable-header";
import { formatCLP, formatDate } from "@/lib/money";
import { sortHref, type SortDir } from "@/lib/sort";
import { cardClass, controlClass } from "@/lib/ui";

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
  salespersonId: string | null;
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
  params: Record<string, string | string[] | undefined>;
  sortKey: string;
  sortDir: SortDir;
};

function parseShortDate(input: string | null): string | null {
  if (!input) return null;
  const cleaned = input.trim().replace(/\//g, "-");
  const parsed = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
  if (!parsed) return null;
  const day = parsed[1].padStart(2, "0");
  const month = parsed[2].padStart(2, "0");
  const year = parsed[3] ?? String(new Date().getFullYear());
  const wire = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(wire) ? wire : null;
}

export function SalesTable({ items, writable, salespeople, params, sortKey, sortDir }: Props) {
  const [cancelModalSaleId, setCancelModalSaleId] = useState<string | null>(null);
  const [assignModalSaleId, setAssignModalSaleId] = useState<string | null>(null);
  const [assignSalespersonId, setAssignSalespersonId] = useState<string>("");
  const [actionModal, setActionModal] = useState<{ saleId: string; kind: "PAID" | "CONFIRMING"; date: string } | null>(null);
  const [actionSalespersonId, setActionSalespersonId] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const cancelSaleItem = cancelModalSaleId ? items.find((s) => s.id === cancelModalSaleId) : null;
  const assignSaleItem = assignModalSaleId ? items.find((s) => s.id === assignModalSaleId) : null;
  const actionModalSale = actionModal ? items.find((s) => s.id === actionModal.saleId) : null;
  const actionDateWire = actionModal ? parseShortDate(actionModal.date) : null;

  // Volver a la misma lista (con filtros y orden) tras una acción masiva.
  const returnTo = (() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value != null) query.append(key, value);
    }
    const qs = query.toString();
    return qs ? `/facturas/ventas?${qs}` : "/facturas/ventas";
  })();

  // Enfocar la fecha al abrir el modal, no mientras se escribe.
  const modalKey = actionModal ? `${actionModal.saleId}:${actionModal.kind}` : null;
  useEffect(() => {
    if (modalKey) dateInputRef.current?.focus();
  }, [modalKey]);

  // Cerrar los modales propios con Escape.
  const localModalOpen = Boolean(actionModal || assignModalSaleId);
  useEffect(() => {
    if (!localModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setActionModal(null);
      setAssignModalSaleId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [localModalOpen]);

  const clienteSort = sortHref("/facturas/ventas", params, "cliente", sortKey, sortDir);
  const folioSort = sortHref("/facturas/ventas", params, "folio", sortKey, sortDir);
  const fechaSort = sortHref("/facturas/ventas", params, "fecha", sortKey, sortDir);
  const ocSort = sortHref("/facturas/ventas", params, "oc", sortKey, sortDir);
  const hesSort = sortHref("/facturas/ventas", params, "hes", sortKey, sortDir);
  const estadoSort = sortHref("/facturas/ventas", params, "estado", sortKey, sortDir);
  const totalSort = sortHref("/facturas/ventas", params, "total", sortKey, sortDir);

  const submitActionModal = () => {
    if (!actionModal || !actionModalSale) return;
    const wire = parseShortDate(actionModal.date);
    if (!wire) {
      setActionError("Ingresa la fecha en formato DD-MM o DD-MM-AAAA.");
      return;
    }
    setActionError(null);
    const formData = new FormData();
    formData.set("id", actionModal.saleId);
    if (actionModal.kind === "PAID") {
      formData.set("paymentDate", wire);
    } else {
      formData.set("confirmingDate", wire);
    }
    formData.set("salespersonId", actionSalespersonId);
    startTransition(async () => {
      if (actionModal.kind === "PAID") {
        await markSalePaid(formData);
      } else {
        await markSaleConfirming(formData);
      }
      setActionModal(null);
    });
  };


  return (
    <>
      <form id="ventas-bulk" action={bulkSetSaleStatus} className={cardClass}>
        <input type="hidden" name="returnTo" value={returnTo} />
        {writable ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <BulkSelectAll formId="ventas-bulk" total={items.length} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                data-bulk
                disabled
                name="status"
                value="PAID"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar cobradas
              </button>
              <button
                type="submit"
                data-bulk
                disabled
                name="status"
                value="PENDING"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar por cobrar
              </button>
              <button
                type="submit"
                data-bulk
                disabled
                name="status"
                value="PARTIAL"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar parciales
              </button>
              <button
                type="submit"
                data-bulk
                disabled
                name="status"
                value="OVERDUE"
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar vencidas
              </button>
              <button
                type="button"
                data-bulk="single"
                disabled
                onClick={() => {
                  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked');
                  if (checkboxes.length !== 1) return;
                  setCancelModalSaleId(checkboxes[0].value);
                }}
                className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
              data-bulk
              disabled
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
                formData.set("returnTo", returnTo);
                startTransition(async () => {
                  await bulkAssignSalesperson(formData);
                });
              }}
              className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
                <SortableHeader label="Cliente" href={clienteSort.href} active={clienteSort.active} dir={clienteSort.dir} />
                <SortableHeader label="Folio" href={folioSort.href} active={folioSort.active} dir={folioSort.dir} />
                <SortableHeader label="Fecha" href={fechaSort.href} active={fechaSort.active} dir={fechaSort.dir} />
                <SortableHeader label="OC" href={ocSort.href} active={ocSort.active} dir={ocSort.dir} />
                <SortableHeader label="HES" href={hesSort.href} active={hesSort.active} dir={hesSort.dir} />
                <SortableHeader label="Estado" href={estadoSort.href} active={estadoSort.active} dir={estadoSort.dir} />
                <SortableHeader label="Total" href={totalSort.href} active={totalSort.active} dir={totalSort.dir} align="right" />
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
                        data-amount={sale.totalAmount}
                        aria-label={`Seleccionar venta ${sale.documentNumber ?? sale.partner.name}`}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                  ) : null}
                  <td className="min-w-0 max-w-[14rem] px-3 py-2 align-top">
                    <Link
                      href={`/facturas/ventas/${sale.id}`}
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
                        editHref={`/facturas/ventas/${sale.id}/editar`}
                        pdfHref={`/facturas/ventas/${sale.id}/pdf`}
                        printHref={`/facturas/ventas/${sale.id}/print`}
                        deleteAction={deleteSale}
                        deleteId={sale.id}
                        deleteMessage="¿Eliminar esta venta? Esta acción no se puede deshacer."
                        onMarkPaid={() => {
                          setActionError(null);
                          setActionModal({ saleId: sale.id, kind: "PAID", date: "" });
                          setActionSalespersonId(sale.salespersonId ?? "");
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
                          setActionError(null);
                          setActionModal({ saleId: sale.id, kind: "CONFIRMING", date: "" });
                          setActionSalespersonId(sale.salespersonId ?? "");
                        }}
                        onAssignSalesperson={() => {
                          setAssignModalSaleId(sale.id);
                          setAssignSalespersonId(sale.salespersonId ?? "");
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

      {assignSaleItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Asignar vendedor"
            className="w-full max-w-sm rounded-card border border-border bg-surface p-4 shadow-lg"
          >
            <h2 className="text-base font-semibold">Asignar vendedor</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {assignSaleItem.partner.name} - {assignSaleItem.documentNumber ?? "sin folio"}
            </p>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                formData.set("id", assignSaleItem.id);
                formData.set("salespersonId", assignSalespersonId);
                startTransition(async () => {
                  await assignSaleSalesperson(formData);
                  setAssignModalSaleId(null);
                });
              }}
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Vendedor</span>
                <select
                  name="salespersonId"
                  value={assignSalespersonId}
                  onChange={(e) => setAssignSalespersonId(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Sin vendedor</option>
                  {salespeople.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalSaleId(null)}
                  className="rounded-control border border-border px-3 py-1.5 text-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-control bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                  Asignar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {actionModal && actionModalSale ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={actionModal.kind === "PAID" ? "Cobrar factura" : "Marcar Confirming"}
            className="w-full max-w-sm rounded-card border border-border bg-surface p-4 shadow-lg"
          >
            <h2 className="text-base font-semibold">
              {actionModal.kind === "PAID" ? "Cobrar factura" : "Marcar Confirming"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {actionModalSale.partner.name} - {actionModalSale.documentNumber ?? "sin folio"}
            </p>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitActionModal();
              }}
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {actionModal.kind === "PAID" ? "Fecha de cobro" : "Fecha del confirming"}
                </span>
                <input
                  ref={dateInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="DD-MM-AAAA"
                  value={actionModal.date}
                  onChange={(event) => {
                    setActionError(null);
                    setActionModal({ ...actionModal, date: event.target.value });
                  }}
                  className={controlClass}
                />
              </label>
              {actionDateWire ? (
                <p className="text-xs text-muted-foreground">
                  Se registrará el {formatDate(new Date(`${actionDateWire}T00:00:00.000Z`))}.
                </p>
              ) : null}
              {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Vendedor</span>
                <select
                  name="salespersonId"
                  value={actionSalespersonId}
                  onChange={(e) => setActionSalespersonId(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Sin vendedor</option>
                  {salespeople.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="rounded-control border border-border px-3 py-1.5 text-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-control bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
