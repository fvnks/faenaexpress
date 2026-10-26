import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type Kpi04Props = {
  title?: string;
  value: number;
  currency?: string;
  /** "currency" formatea como dinero; "number" como entero con separador de miles. */
  format?: "currency" | "number";
  trend?: {
    value: string;
    label: string;
    positive: boolean;
  };
  /** Texto de apoyo bajo el valor. Sin él no se muestra nada (el texto demo era fijo). */
  footer?: string;
};

export function Kpi04({
  title,
  value,
  currency = "CLP",
  format = "currency",
  trend,
  footer,
}: Kpi04Props) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal">{title}</CardTitle>
        <CardDescription className="text-3xl leading-none tracking-tight text-foreground tabular-nums">
          {formatted}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trend ? (
          <p className="text-sm">
            <span className={trend.positive ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
              {trend.value}
            </span>{" "}
            <span className="text-muted-foreground">{trend.label}</span>
          </p>
        ) : footer ? (
          <p className="text-sm text-muted-foreground">{footer}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
