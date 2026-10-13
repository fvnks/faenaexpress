import type { SaleStatus } from "@/generated/prisma/client";
import { saleStatusLabel } from "@/lib/labels";

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const colorMap: Record<SaleStatus, { bg: string; dot: string; text: string }> = {
    PENDING: { bg: "bg-accent-soft", dot: "bg-accent", text: "text-accent" },
    PAID: { bg: "bg-success-soft", dot: "bg-success", text: "text-success" },
    PARTIAL: { bg: "bg-warning-soft", dot: "bg-warning", text: "text-warning" },
    OVERDUE: { bg: "bg-destructive-soft", dot: "bg-destructive", text: "text-destructive" },
    CANCELLED: { bg: "bg-muted", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  };
  const colors = colorMap[status] ?? colorMap.PENDING;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " +
        colors.bg + " " + colors.text
      }
    >
      <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + colors.dot} />
      {saleStatusLabel(status)}
    </span>
  );
}
