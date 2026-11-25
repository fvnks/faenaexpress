import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedValue } from "./animated-value";

export type KpiCardProps = {
  title?: string;
  value: number;
  currency?: string;
  /** "currency" formatea como dinero; "number" como entero con separador de miles. */
  format?: "currency" | "number";
  icon?: React.ReactNode;
  code?: string;
  trend?: { value: string; label: string; positive: boolean };
  footer?: string;
};

/** Tarjeta de indicador única: la misma jerarquía y tipografía en los seis KPI. */
export function KpiCard({
  title,
  value,
  currency = "CLP",
  format = "currency",
  icon,
  code,
  trend,
  footer,
}: KpiCardProps) {
  const formatted =
    format === "number"
      ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)
      : new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);

  return (
    <Card accent className="h-full">
      {code ? <span className="catalog-code">{code}</span> : null}
      <CardHeader>
        <div className="mb-2 flex size-7 items-center justify-center rounded-control border border-primary/30 bg-primary-soft text-primary">
          {icon ?? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true">
              <path d="M4 19h16M7 16V9M12 16V5M17 16v-7" />
            </svg>
          )}
        </div>
        <CardTitle className="kpi-label">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="kpi-value-wrap w-full">
          <span className="kpi-value">
            <AnimatedValue value={value} formatted={formatted} />
          </span>
        </div>
        {trend ? (
          <div className="flex items-center">
            <Badge variant={trend.positive ? "success" : "danger"} size="sm">
              {trend.value} {trend.label}
            </Badge>
          </div>
        ) : null}
        {footer ? <p className="kpi-footer">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}
