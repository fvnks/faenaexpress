"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useOnline } from "@/components/connection-status";
import { secondaryButtonClass } from "@/lib/ui";

/** Botón de actualizar la lista + aviso cuando se pierde la conexión. */
export function ListRefresh() {
  const router = useRouter();
  const online = useOnline();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (online) setLoading(false);
  }, [online]);

  return (
    <div className="flex items-center gap-2">
      {!online ? (
        <span role="status" className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
          Sin conexión
        </span>
      ) : null}
      <button
        type="button"
        disabled={!online || loading}
        onClick={() => {
          setLoading(true);
          router.refresh();
        }}
        className={secondaryButtonClass + " inline-flex items-center gap-1.5 disabled:opacity-50"}
        aria-label="Actualizar lista"
        title="Actualizar lista"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={"h-4 w-4 " + (loading ? "animate-spin" : "")}
          aria-hidden="true"
        >
          <path d="M20 11a8 8 0 1 0-2.3 5.7" />
          <path d="M20 4v7h-7" />
        </svg>
        Actualizar
      </button>
    </div>
  );
}
