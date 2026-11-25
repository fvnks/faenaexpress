import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedValue } from "./animated-value";

export type Kpi04Props = {
  title?: string;
  value: number;
  currency?: string;
  /** Icono delante del título (mismo bloque que Kpi01). */
  icon?: React.ReactNode;
  /** "currency" formatea como dinero; "number" como entero con separador de miles. */
  format?: "currency" | "number";
  /** Código de catálogo (ej. "05 / POR COBRAR"). Opcional para no romper otros callers. */
  code?: string;
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
  icon,
  format = "currency",
  code,
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
    <Card accent>
      {code ? <span className="catalog-code">{code}</span> : null}
      <CardHeader>
        {icon ? (
          <div className="mb-2 flex size-7 items-center justify-center rounded-control border border-primary/30 bg-primary-soft text-primary">
            {icon}
          </div>
        ) : null}
        <CardTitle className="kpi-label">{title}</CardTitle>
        <CardDescription className="kpi-value-wrap">
          <span className="kpi-value">
            <AnimatedValue value={value} formatted={formatted} />
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trend ? (
          <p className="text-sm">
            <span className={trend.positive ? "text-success" : "text-danger"}>
              {trend.value}
            </span>{" "}
            <span className="text-muted-foreground">{trend.label}</span>
          </p>
        ) : footer ? (
          <p className="text-xs text-muted-foreground">{footer}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
