"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type BillingActionState,
} from "@/app/actions/billing";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

type PaymentMethod = {
  id: string;
  provider: string;
  displayName: string;
  isDefault: boolean;
  active: boolean;
};

type BillingPaymentMethodsProps = {
  methods: PaymentMethod[];
};

export function BillingPaymentMethods({ methods }: BillingPaymentMethodsProps) {
  const [estadoAgregar, agregar, pendienteAgregar] = useActionState<BillingActionState, FormData>(
    addPaymentMethod,
    undefined,
  );
  const [estadoEliminar, eliminar, pendienteEliminar] = useActionState<BillingActionState, FormData>(
    removePaymentMethod,
    undefined,
  );
  const [estadoDefault, ponerDefault, pendienteDefault] = useActionState<BillingActionState, FormData>(
    setDefaultPaymentMethod,
    undefined,
  );

  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [providerToken, setProviderToken] = useState("");

  useEffect(() => {
    if (estadoAgregar?.ok) {
      toast.success("Método de pago agregado");
      setShowForm(false);
      setProvider("");
      setDisplayName("");
      setProviderToken("");
    }
    if (estadoAgregar?.error) toast.error(estadoAgregar.error);
  }, [estadoAgregar]);

  useEffect(() => {
    if (estadoEliminar?.ok) toast.success("Método eliminado");
    if (estadoEliminar?.error) toast.error(estadoEliminar.error);
  }, [estadoEliminar]);

  useEffect(() => {
    if (estadoDefault?.ok) toast.success("Método predeterminado actualizado");
    if (estadoDefault?.error) toast.error(estadoDefault.error);
  }, [estadoDefault]);

  const PROVIDERS = [
    { value: "FLOW", label: "Flow (Tarjeta/Webpay)" },
    { value: "MERCADOPAGO", label: "Mercado Pago" },
    { value: "CARD", label: "Tarjeta guardada (Stripe)" },
    { value: "TRANSFER", label: "Transferencia bancaria" },
  ];

  if (methods.length === 0 && !showForm) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-4">
          No hay métodos de pago guardados.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
        >
          Agregar primer método
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {methods.map((m) => (
        <div key={m.id} className={cardClass + " p-4 flex flex-wrap items-center justify-between gap-4"}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {m.provider}
            </span>
            <span className="font-medium">{m.displayName}</span>
            {m.isDefault && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Predeterminado
              </span>
            )}
            {!m.active && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground bg-gray-100">
                Inactivo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!m.isDefault && (
              <form action={ponerDefault}>
                <input type="hidden" name="methodId" value={m.id} />
                <SubmitButton
                  className="rounded-control border border-border bg-transparent px-3 py-1.5 text-xs hover:bg-background"
                  pendingLabel="..."
                  disabled={pendienteDefault}
                >
                  Poner por defecto
                </SubmitButton>
              </form>
            )}
            <form action={eliminar}>
              <input type="hidden" name="methodId" value={m.id} />
              <SubmitButton
                className="rounded-control border border-danger/50 bg-transparent px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                pendingLabel="..."
                disabled={pendienteEliminar}
              >
                Eliminar
              </SubmitButton>
            </form>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="rounded-control border border-border bg-transparent px-4 py-2 text-sm hover:bg-background"
      >
        Agregar método de pago
      </button>

      {showForm && (
        <div className={cardClass + " p-4"}>
          <h3 className="font-semibold mb-4">Agregar método de pago</h3>
          <form action={agregar} className="flex flex-col gap-3">
            <input type="hidden" name="provider" value={provider} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="provider" className="text-xs text-muted-foreground">Proveedor</label>
                <select
                  name="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground"
                  required
                >
                  <option value="">— Selecciona —</option>
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="displayName" className="text-xs text-muted-foreground">Nombre visible</label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Tarjeta terminada en 4242, Cuenta BancoEstado..."
                  className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground"
                  required
                  maxLength={100}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="providerToken" className="text-xs text-muted-foreground">
                Token/ID del proveedor (opcional para transferencia)
              </label>
              <input
                id="providerToken"
                name="providerToken"
                type="text"
                value={providerToken}
                onChange={(e) => setProviderToken(e.target.value)}
                placeholder="ID de suscripción Flow, customer_id MercadoPago, etc."
                className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground"
              />
            </div>

            <div className="flex items-center gap-3">
              <SubmitButton
                className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
                pendingLabel="Guardando..."
                disabled={pendienteAgregar}
              >
                Guardar método
              </SubmitButton>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-control border border-border px-4 py-2 text-sm hover:bg-background"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}