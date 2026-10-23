"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCLP } from "@/lib/money";

type Invoice = {
  id: string;
  number: string;
  period: string;
  status: string;
  totalCLP: number;
  dueAt: Date | string;
  paidAt: Date | string | null;
};

type InvoicesProps = {
  invoices: Invoice[];
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "Pendiente", color: "bg-blue-100 text-blue-800" },
  PARTIAL: { label: "Parcial", color: "bg-amber-100 text-amber-800" },
  PAID: { label: "Pagada", color: "bg-green-100 text-green-800" },
  VOID: { label: "Anulada", color: "bg-gray-100 text-gray-800" },
  OVERDUE: { label: "Vencida", color: "bg-red-100 text-red-800" },
};

export function BillingInvoices({ invoices }: InvoicesProps) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay facturas registradas aún.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Número</th>
            <th className="px-4 py-2 font-medium">Período</th>
            <th className="px-4 py-2 font-medium text-right">Total</th>
            <th className="px-4 py-2 font-medium text-center">Estado</th>
            <th className="px-4 py-2 font-medium">Vencimiento</th>
            <th className="px-4 py-2 font-medium">Pagado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => {
            const status = STATUS_LABEL[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-800" };
            return (
              <tr key={inv.id} className="hover:bg-muted/50">
                <td className="px-4 py-2.5 font-medium tabular">{inv.number}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{inv.period}</td>
                <td className="px-4 py-2.5 tabular text-right font-medium">{formatCLP(inv.totalCLP)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {format(new Date(inv.dueAt), "dd MMM yyyy", { locale: es })}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {inv.paidAt ? format(new Date(inv.paidAt), "dd MMM yyyy", { locale: es }) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}