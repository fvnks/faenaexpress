"use client";

import { useEffect, useState } from "react";

/**
 * Formatea la hora de un ISO en el cliente para evitar mismatch de hidratación
 * entre servidor y cliente (diferentes zonas horarias). El error React #441
 * ocurre cuando el texto renderizado en el servidor no coincide con el del
 * cliente tras la hidratación.
 */
export function FormattedTime({ iso }: { iso: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(
      new Date(iso).toLocaleTimeString("es-CL", {
        timeZone: "America/Santiago",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [iso]);

  if (!time) return <span className="text-muted-foreground">—</span>;
  return <span className="text-muted-foreground">{time}</span>;
}
