const styles: Record<string, string> = {
  OPEN: "border-accent/40 bg-accent/10 text-accent",
  CLOSED: "border-border bg-background text-muted-foreground",
};

const labels: Record<string, string> = {
  OPEN: "En levantamiento",
  CLOSED: "Cerrado",
};

export function CountStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
        (styles[status] ?? "border-border bg-background text-muted-foreground")
      }
    >
      {labels[status] ?? status}
    </span>
  );
}
