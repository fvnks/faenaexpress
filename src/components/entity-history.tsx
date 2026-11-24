"use client";

import { useEffect, useState } from "react";

import { secondaryButtonClass } from "@/lib/ui";

type Evento = {
  id: string;
  action: string;
  summary: string;
  userName: string;
  createdAt: string;
};

/** Cajón lateral con el historial de auditoría de un documento. */
export function EntityHistoryButton({
  entityType,
  entityId,
  label = "Historial",
}: {
  entityType: string;
  entityId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Evento[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || events !== null) return;
    let active = true;
    const params = new URLSearchParams({ entityType, entityId });
    fetch(`/api/audit?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el historial.");
        return res.json();
      })
      .then((data) => {
        if (active) setEvents(data.events ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Error");
      });
    return () => {
      active = false;
    };
  }, [open, events, entityType, entityId]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass + " inline-flex items-center gap-1.5"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Historial de ${entityType}`}>
          <button
            type="button"
            aria-label="Cerrar historial"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Registro / Auditoría</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">Historial</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{entityType} · {entityId}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-control border border-border p-1.5 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {events === null && !error ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-control bg-surface-elevated" />
                ))}
              </div>
            ) : null}
            {events?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos registrados para este documento.</p>
            ) : null}
            {events && events.length > 0 ? (
              <ol className="relative ml-2 border-l border-border">
                {events.map((event) => (
                  <li key={event.id} className="mb-5 ml-5">
                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-surface bg-primary" />
                    <p className="text-sm font-medium text-foreground">{event.summary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {event.userName} · {event.action} · {new Date(event.createdAt).toLocaleString("es-CL")}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
