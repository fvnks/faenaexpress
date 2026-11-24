import { cardClass } from "@/lib/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-surface-elevated" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-elevated" />
      </div>
      <div className={cardClass + " h-24 animate-pulse"} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className={cardClass + " h-24 animate-pulse"} />
        ))}
      </div>
      <div className={cardClass + " divide-y divide-border"}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex gap-4 px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-elevated" />
            <div className="h-4 flex-1 animate-pulse rounded bg-surface-elevated" />
            <div className="h-4 w-28 animate-pulse rounded bg-surface-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}
