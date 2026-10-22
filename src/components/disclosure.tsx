"use client";

import type { ReactNode, RefObject } from "react";

/**
 * Panel que se abre y se cierra, con el disparador pintado como botón.
 *
 * Por qué `<details>` y no un div con estado: abre y cierra con el teclado sin
 * depender de JavaScript, y no hay estado de React que se desincronice cuando
 * el formulario se envía y la página se vuelve a renderizar.
 *
 * Por qué el disparador se ve como botón: en Colegios estas acciones (crear
 * curso, crear asignatura, registrar docente) eran texto suelto dentro del
 * triángulo del navegador. En un colegio recién creado se leía como que no
 * había forma de agregar nada. Ahora la acción se ve como la acción que es.
 */
export function Disclosure({
  label,
  children,
  panelRef,
  tone = "primary",
  className,
}: {
  label: string;
  children: ReactNode;
  /** Se pasa para cerrar el panel después de guardar. */
  panelRef?: RefObject<HTMLDetailsElement | null>;
  tone?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  return (
    <details ref={panelRef} className={className}>
      <summary className={DISPARADOR[tone]}>{label}</summary>
      {children}
    </details>
  );
}

// El triángulo nativo se oculta con `list-none` (Firefox) y con la regla de
// WebKit, que es la que lo dibuja en Chrome y Safari.
//
// `min-h-11` solo en móvil: el alto mínimo del área táctil (44 px) se pide
// siempre, pero en escritorio la densidad manda y el botón no crece.
const DISPARADOR: Record<"primary" | "secondary" | "danger", string> = {
  primary:
    "btn-liquid btn-liquid-primary inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-control border border-primary bg-transparent px-3 py-2 text-sm font-semibold text-primary sm:min-h-0 [&::-webkit-details-marker]:hidden",
  secondary:
    "btn-liquid btn-liquid-secondary inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-control border border-border bg-transparent px-3 py-2 text-sm font-semibold text-foreground sm:min-h-0 [&::-webkit-details-marker]:hidden",
  danger:
    "btn-liquid btn-liquid-danger inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-control border border-danger bg-transparent px-3 py-2 text-sm font-semibold text-danger sm:min-h-0 [&::-webkit-details-marker]:hidden",
};
