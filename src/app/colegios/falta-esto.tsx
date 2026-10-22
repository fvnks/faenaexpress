import Link from "next/link";
import type { ReactNode } from "react";

import { primaryButtonClass } from "@/lib/ui";

/**
 * Estado vacío con salida.
 *
 * Cuando falta algo para poder avanzar (los cursos, los docentes, las
 * asignaturas), el texto solo deja al usuario atascado: dice qué falta pero
 * no lo lleva a donde se hace. Este componente dice qué falta Y lleva.
 */
export function FaltaEsto({
  children,
  href,
  accion,
}: {
  children: ReactNode;
  href: string;
  accion: string;
}) {
  return (
    <div className="rounded-control border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{children}</p>
      <Link href={href} className={primaryButtonClass + " mt-3 inline-block"}>
        {accion}
      </Link>
    </div>
  );
}
