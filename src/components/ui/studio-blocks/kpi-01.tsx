import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type Kpi01Props = {
  title?: string;
  value: number;
  currency?: string;
  icon?: React.ReactNode;
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
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            {icon || <span className="text-2xl">💰</span>}
          </div>
        </CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-3xl leading-none font-medium tracking-tight tabular-nums">
            {formatted}
          </div>
          {trend ? (
            <Badge className={trend.positive ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300"}>
              {trend.value} {trend.label}
            </Badge>
          ) : null}
        </div>
        {footer ? <p className="text-sm text-muted-foreground">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}
