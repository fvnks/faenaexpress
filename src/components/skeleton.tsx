/**
 * Bloque de carga. Se usa en los `loading.tsx` para que la navegación no quede
 * en blanco. El pulso se apaga con `prefers-reduced-motion` (DESIGN.md).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={"animate-pulse rounded-control bg-background motion-reduce:animate-none " + (className ?? "")}
    />
  );
}
