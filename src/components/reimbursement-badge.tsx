export function ReimbursementBadge({ reimbursed }: { reimbursed: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
        (reimbursed ? "bg-success-soft text-success" : "bg-accent-soft text-accent")
      }
    >
      <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + (reimbursed ? "bg-success" : "bg-accent")} />
      {reimbursed ? "Reembolsado" : "Por reembolsar"}
    </span>
  );
}
