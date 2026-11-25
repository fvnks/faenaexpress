import { KpiCard, type KpiCardProps } from "./kpi-card";

export type Kpi01Props = Omit<KpiCardProps, "format">;

/** Compatibilidad con los callers existentes: comparte el diseño con Kpi04. */
export function Kpi01(props: Kpi01Props) {
  return <KpiCard {...props} />;
}
