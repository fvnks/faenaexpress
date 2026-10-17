import { Skeleton } from "@/components/skeleton";
import { cardClass } from "@/lib/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <span className="sr-only">Cargando banco…</span>
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className={cardClass + " p-4"}>
        <Skeleton className="h-5 w-48" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
      <div className={cardClass + " grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3"}>
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className={cardClass + " flex flex-col gap-3 p-4"}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    </div>
  );
}
