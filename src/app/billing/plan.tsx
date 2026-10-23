"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { changeOrganizationPlan, type PlatformActionState } from "@/app/actions/platform";
import { subscriptionState } from "@/lib/plans";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

type Plan = {
  id: string;
  name: string;
  priceCLP: number;
  period: string;
  maxCompanies: number | null;
  maxUsers: number | null;
  maxDocsPerMonth: number | null;
};

// Retorno de subscriptionState (definido localmente para evitar importar tipos)
type SubscriptionState = {
  status: "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";
  plan: Plan | null;
  warning: string | null;
};

type BillingPlanProps = {
  subscription: SubscriptionState;
  plans?: { id: string; name: string; priceCLP: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Al día",
  TRIAL: "En prueba",
  PAST_DUE: "Pago pendiente",
  CANCELED: "Cancelado",
};

export function BillingPlan({ subscription, plans = [] }: BillingPlanProps) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    async (_prev, formData) => {
      const { changeOrganizationPlan } = await import("@/app/actions/platform");
      return changeOrganizationPlan(undefined, formData);
    },
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Plan actualizado");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className={cardClass + " p-5"}>
        <p className="text-xs text-muted-foreground">Plan</p>
        <p className="mt-1 text-xl font-semibold">
          {subscription.plan?.name ?? "Sin plan"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {subscription.plan ? `${subscription.plan.priceCLP.toLocaleString("es-CL")} CLP / ${subscription.plan.period === "YEARLY" ? "año" : "mes"}` : "—"}
        </p>
      </div>

      <div className={cardClass + " p-5"}>
        <p className="text-xs text-muted-foreground">Estado</p>
        <p className="mt-1 text-lg font-semibold">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            subscription.status === "ACTIVE" ? "bg-green-100 text-green-800" :
            subscription.status === "TRIAL" ? "bg-blue-100 text-blue-800" :
            subscription.status === "PAST_DUE" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {STATUS_LABEL[subscription.status] ?? subscription.status}
          </span>
        </p>
        {subscription.warning && (
          <p className="mt-2 text-sm text-red-600">{subscription.warning}</p>
        )}
      </div>

      <div className={cardClass + " p-5"}>
        <p className="text-xs text-muted-foreground">Límites del plan</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Empresas</dt>
            <dd className="font-medium tabular">
              {subscription.plan?.maxCompanies ?? "∞"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Usuarios</dt>
            <dd className="font-medium tabular">
              {subscription.plan?.maxUsers ?? "∞"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Documentos/mes</dt>
            <dd className="font-medium tabular">
              {subscription.plan?.maxDocsPerMonth ?? "∞"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}