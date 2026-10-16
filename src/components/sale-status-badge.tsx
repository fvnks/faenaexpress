import type { SaleStatus } from "@/generated/prisma/client";
import { saleStatusLabel } from "@/lib/labels";

// Colores del sistema (DESIGN.md): ámbar = atención (por cobrar, parcial),
// rojo = vencido, teal = cobrado, neutro = anulado. El color nunca va solo:
// la etiqueta siempre lleva el texto del estado.
const statusStyles: Record<SaleStatus, { badge: string; dot: string }> = {
  PENDING: { badge: "bg-accent-soft text-accent", dot: "bg-accent" },
  PARTIAL: { badge: "bg-accent-soft text-accent", dot: "bg-accent" },
  OVERDUE: { badge: "bg-danger-soft text-danger", dot: "bg-danger" },
  PAID: { badge: "bg-success-soft text-success", dot: "bg-success" },
  CANCELLED: {
    badge: "border border-border bg-background text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const style = statusStyles[status] ?? statusStyles.PENDING;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " +
        style.badge
      }
    >
      <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + style.dot} />
      {saleStatusLabel(status)}
    </span>
  );
}
