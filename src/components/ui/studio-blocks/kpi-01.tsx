import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedValue } from "./animated-value";

export type Kpi01Props = {
  title?: string;
  value: number;
  currency?: string;
  icon?: React.ReactNode;
  /** Código de catálogo (ej. "01 / VENTAS"). Opcional para no romper otros callers. */
  code?: string;
  trend?: {
    value: string;
    label: string;
    positive: boolean;
  };
  /** Texto de apoyo bajo el valor. Sin él no se muestra nada (el texto demo era fijo). */
  footer?: string;
};

export function Kpi01({
  title,
  value,
  currency = "CLP",
  icon,
  code,
  trend,
  footer,
}: Kpi01Props) {
  const formatted = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <Card accent>
      {code ? <span className="catalog-code">{code}</span> : null}
      <CardHeader>
        <CardTitle>
          <div className="flex size-7 items-center justify-center rounded-control border border-primary/30 bg-primary-soft text-primary">
            {icon || <span className="text-2xl">💰</span>}
          </div>
        </CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="kpi-value-wrap w-full">
            <span className="kpi-value">
              <AnimatedValue value={value} formatted={formatted} />
            </span>
          </div>
          {trend ? (
            <Badge variant={trend.positive ? "success" : "danger"} size="sm">
              {trend.value} {trend.label}
            </Badge>
          ) : null}
        </div>
        {footer ? <p className="text-xs text-muted-foreground">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}
