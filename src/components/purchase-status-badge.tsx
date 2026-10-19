import type { PaymentStatus } from "@/generated/prisma/client";
import { purchaseStatusLabel } from "@/lib/labels";

// Mismo criterio que el badge de ventas: ámbar = falta pagar (pendiente o
// parcial), teal = pagada. El color nunca va solo: siempre lleva la etiqueta.
const statusStyles: Record<PaymentStatus, { badge: string; dot: string }> = {
  PENDING: { badge: "bg-accent-soft text-accent", dot: "bg-accent" },
  PARTIAL: { badge: "bg-accent-soft text-accent", dot: "bg-accent" },
  PAID: { badge: "bg-success-soft text-success", dot: "bg-success" },
};

export function PurchaseStatusBadge({ status }: { status: PaymentStatus }) {
  const style = statusStyles[status] ?? statusStyles.PENDING;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " +
        style.badge
      }
    >
      <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + style.dot} />
      {purchaseStatusLabel(status)}
    </span>
  );
}
