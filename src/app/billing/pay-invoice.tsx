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
  dueAt: string;
};

type PayInvoiceProps = {
  payableInvoices: Invoice[];
};

const PAYMENT_PROVIDERS = [
  { value: "FLOW", label: "Flow (Webpay / Tarjeta)" },
  { value: "MERCADOPAGO", label: "Mercado Pago" },
  { value: "TRANSFER", label: "Transferencia bancaria" },
  { value: "MANUAL", label: "Pago manual (confirma admin)" },
] as const;

export function PayInvoice({ payableInvoices }: PayInvoiceProps) {
  const [estado, crearPago, pendiente] = useActionState<BillingActionState, FormData>(
    createInvoicePayment,
    undefined,
  );

  const [invoiceId, setInvoiceId] = useState("");
  const [provider, setProvider] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (estado?.ok && estado.url) {
      // Redirect automático al proveedor
      window.location.href = estado.url;
    }
    if (estado?.ok && !estado.url) {
      toast.success("Pago creado. Verifica el estado en tu proveedor.");
    }
    if (estado?.error) toast.error(estado.error);
  }, [estado]);

  const payable = payableInvoices.filter(
    (i) => i.status === "PENDING" || i.status === "OVERDUE" || i.status === "PARTIAL",
  );

  if (payable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay facturas pendientes de pago.
      </p>
    );
  }

  return (
    <div className={cardClass + " p-5"}>
      <h2 className="font-semibold">Pagar facturas pendientes</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Selecciona la factura y el método de pago. Serás redirigido al proveedor para completar el pago.
      </p>

      <form action={crearPago} className="mt-4 flex flex-col gap-3">
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
            {payable.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.number} · {inv.period} · {formatCLP(inv.totalCLP)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="provider-select" className={labelClass}>
            Proveedor de pago
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
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {provider === "MANUAL"
              ? "El pago se confirma manualmente por el equipo de Yellow ERP. Guarda el comprobante."
              : "Serás redirigido al sitio del proveedor para completar el pago."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton
            className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
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