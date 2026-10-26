import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Kpi05Props = {
  title?: string;
  value: number;
  currency?: string;
  trend?: {
    value: string;
    label: string;
    positive: boolean;
  };
  /** Texto de apoyo bajo el valor. Sin él no se muestra nada (el texto demo era fijo). */
  footer?: string;
};

export function Kpi05({
  title,
  value,
  currency = "CLP",
  trend,
  footer,
}: Kpi05Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-2xl leading-none tracking-tight tabular-nums">
            {new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)}
          </div>
          {trend ? (
            <span className={trend.positive ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300 text-sm px-2 py-1 rounded" : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300 text-sm px-2 py-1 rounded"}>
              {trend.value} {trend.label}
            </span>
          ) : null}
        </div>
        {footer ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{footer}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
