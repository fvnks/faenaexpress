"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { createInvoicePayment, type BillingActionState } from "@/app/actions/saas-billing";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

type Invoice = {
  id: string;
  number: string;
  period: string;
  status: string;
  totalCLP: number;
};

type PayInvoiceProps = {
  payableInvoices: Invoice[];
};

const PAYMENT_PROVIDERS = [
  { value: "FLOW", label: "Flow (Webpay / Tarjeta)", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "MERCADOPAGO", label: "Mercado Pago", color: "bg-blue-100 text-blue-600 border-blue-200" },
  { value: "CARD", label: "Tarjeta guardada (Stripe)", color: "bg-indigo-100 text-indigo-600 border-indigo-200" },
  { value: "TRANSFER", label: "Transferencia bancaria", color: "bg-purple-100 text-purple-600 border-purple-200" },
  { value: "MANUAL", label: "Pago manual (confirma admin)", color: "bg-orange-100 text-orange-600 border-orange-200" },
] as const;

export function PayInvoice({ payableInvoices }: PayInvoiceProps) {
  const [estado, crearPago, pendiente] = useActionState<BillingActionState, FormData>(
    createInvoicePayment,
    undefined,
  );

  const [invoiceId, setInvoiceId] = useState("");
  const [provider, setProvider] = useState("");

  useEffect(() => {
    if (estado?.ok && !pendiente) {
      toast.success("Pago iniciado correctamente");
      setInvoiceId("");
      setProvider("");
    }
    if (estado?.error) toast.error(estado.error);
  }, [estado]);

  if (payableInvoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium">No hay facturas pendientes de pago</p>
        <p className="mt-1 text-sm text-muted-foreground">Todas tus facturas están al día</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          {payableInvoices.length} factura{payableInvoices.length !== 1 ? "s" : ""} pendiente{payableInvoices.length !== 1 ? "s" : ""}
        </div>
        <div className="text-sm font-medium text-right tabular">
          {payableInvoices.reduce((sum, inv) => sum + inv.totalCLP, 0).toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
        </div>
      </div>

      <form action={crearPago} className="mt-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="invoice-select" className={labelClass}>
              Factura
            </label>
            <select
              id="invoice-select"
              name="invoiceId"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className={controlClass}
              required
            >
              <option value="">— Selecciona una factura —</option>
              {payableInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · {inv.period} · {formatCLP(inv.totalCLP)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="provider-select" className={labelClass}>
              Método de pago
            </label>
            <select
              id="provider-select"
              name="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={controlClass}
              required
            >
              <option value="">— Selecciona proveedor —</option>
              {PAYMENT_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value} className={p.color}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton
            className="flex-1 rounded-control border border-primary bg-transparent px-4 py-2.5 text-sm font-semibold text-primary"
            pendingLabel="Creando pago..."
            disabled={!invoiceId || !provider || pendiente}
          >
            Pagar factura
          </SubmitButton>
          {estado?.error ? <p className="text-xs text-danger">{estado.error}</p> : null}
        </div>
      </form>
    </div>
  );
}

function formatCLP(valor: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(valor);
}