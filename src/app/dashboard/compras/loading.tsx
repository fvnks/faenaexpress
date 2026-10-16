import { Skeleton } from "@/components/skeleton";
import { cardClass } from "@/lib/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <span className="sr-only">Cargando compras…</span>
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className={cardClass + " flex flex-wrap gap-3 p-4"}>
        <Skeleton className="h-16 w-full sm:flex-1" />
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-16 w-48" />
      </div>
      <div className={cardClass + " grid grid-cols-2 sm:grid-cols-3"}>
        <Skeleton className="m-4 h-16" />
        <Skeleton className="m-4 h-16" />
        <Skeleton className="col-span-2 m-4 h-16 sm:col-span-1" />
      </div>
      <div className={cardClass + " flex flex-col gap-3 p-4"}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </div>
    </div>
  );
}
