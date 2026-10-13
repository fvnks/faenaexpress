import type { PaymentStatus } from "@/generated/prisma/client";
import { purchaseStatusLabel } from "@/lib/labels";

export function PurchaseStatusBadge({ status }: { status: PaymentStatus }) {
  const paid = status === "PAID";

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " +
        (paid ? "bg-success-soft text-success" : "bg-accent-soft text-accent")
      }
    >
      <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + (paid ? "bg-success" : "bg-accent")} />
      {purchaseStatusLabel(status)}
    </span>
  );
}
