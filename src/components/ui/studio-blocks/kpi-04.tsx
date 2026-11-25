import { KpiCard, type KpiCardProps } from "./kpi-card";

export type Kpi04Props = KpiCardProps;

/** Compatibilidad con los callers existentes: comparte el diseño con Kpi01. */
export function Kpi04(props: Kpi04Props) {
  return <KpiCard {...props} />;
}
