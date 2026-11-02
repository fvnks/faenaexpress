/**
 * Envuelve una Server Action de firma `(_prev, formData) => Promise<State>`
 * en una de firma `(formData) => Promise<void>` para usarla directamente como
 * `form action={...}` en Next.js, sin necesidad de `useActionState`.
 *
 * Útil para formularios simples de un solo botón que no necesitan mostrar
 * estado de error/éxito en el componente cliente.
 */
export function serverAction<P, A extends unknown[], R>(
  action: (_prev: P, ...args: A) => Promise<R>
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    await action(undefined as unknown as P, ...args);
  };
}
