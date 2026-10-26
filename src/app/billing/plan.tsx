"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { changeOrganizationPlan, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { cardClass } from "@/lib/ui";

export type Plan = {
  id: string;
  name: string;
  priceCLP: number;
  period: string;
  maxCompanies: number | null;
  maxUsers: number | null;
  maxDocsPerMonth: number | null;
};

export type SubscriptionState = {
  status: "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";
  plan: Plan | null;
  warning: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activo", color: "bg-green-100 text-green-700 border-green-200" },
  TRIAL: { label: "En prueba", color: "bg-blue-100 text-blue-700 border-blue-200" },
  PAST_DUE: { label: "Vencido", color: "bg-red-100 text-red-700 border-red-200" },
  CANCELED: { label: "Cancelado", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

export function BillingPlan({ submission }: { submission: SubscriptionState }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(
    changeOrganizationPlan,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Plan actualizado correctamente");
    if (state?.error) toast.error(state.error);
  }, [state]);

  const plan = submission.plan;
  const plans: Plan[] = [];

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {/* Plan actual */}
      <div className={cardClass + " p-6"}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Plan actual</h2>
          <span className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[submission.status]?.color ?? "bg-gray-100 text-gray-700"}`}>
            {STATUS_CONFIG[submission.status]?.label ?? submission.status}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground">Plan actual</p>
          <h2 className="text-3xl font-bold tracking-tight">{plan?.name ?? "Sin plan"}</h2>
          <p className="mt-2 text-lg font-medium">
            {plan?.priceCLP ? `$${plan.priceCLP.toLocaleString("es-CL")}` : "Gratis"} / {plan?.period === "YEARLY" ? "año" : "mes"}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Empresas</span>
            <span className="font-medium tabular">{plan?.maxCompanies ?? "∞"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usuarios</span>
            <span className="font-medium tabular">{plan?.maxUsers ?? "∞"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Documentos/mes</span>
            <span className="font-medium tabular">{plan?.maxDocsPerMonth ?? "∞"}</span>
          </div>
        </div>

        {submission.warning && (
          <div className="mt-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
            {submission.warning}
          </div>
        )}
      </div>

      {/* Selector de nuevo plan */}
      <div className={cardClass + " p-6"}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Cambiar plan</h3>
          <SubmitButton
            className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
            pendingLabel="Actualizando..."
            disabled={pending || !plans.length || submission.status === "CANCELED"}
          >
            Cambiar
          </SubmitButton>
        </div>

        <p className="text-sm text-muted-foreground text-center py-4">
          No hay planes disponibles para cambiar.
        </p>
      </div>

      {/* Información adicional */}
      <div className={cardClass + " p-6 mt-6"}>
        <h3 className="font-semibold mb-4">Información del plan</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plan actual</span>
            <span className="font-medium">{submission.plan?.name ?? "Sin plan"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            <span className="font-medium">
              {submission.status === "ACTIVE" ? "Activo" : submission.status === "PAST_DUE" ? "Vencido" : submission.status === "TRIAL" ? "En prueba" : submission.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Documentos este mes</span>
            <span className="font-medium tabular">{submission.plan?.maxDocsPerMonth ?? "Sin límite"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}