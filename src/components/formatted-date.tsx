"use client";

import { useEffect, useState } from "react";

/**
 * Formatea una fecha ISO en el cliente para evitar mismatch de hidratación
 * entre servidor y cliente (diferentes zonas horarias). El error React #441
 * ocurre cuando el texto renderizado en el servidor no coincide con el del
 * cliente tras la hidratación.
 */
export function FormattedDate({ iso }: { iso: string }) {
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    setDate(new Date(iso).toLocaleDateString("es-CL"));
  }, [iso]);

  if (!date) return <span className="text-muted-foreground">—</span>;
  return <span className="text-muted-foreground">{date}</span>;
}
