import Link from "next/link";

/**
 * Sin vendedores activos, el selector de asignación queda sin opciones. Antes
 * que esconder el control (y que la pantalla parezca rota), se dice qué falta
 * y dónde se arregla.
 *
 * Quien puede escribir en Catálogos recibe el enlace al bloque de vendedores;
 * el resto, a quién pedírselo. El ancla evita que tenga que buscar la sección
 * entre ocho catálogos.
 */
export function NoSalespeopleHint({ canManage }: { canManage: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      No hay vendedores activos.{" "}
      {canManage ? (
        <Link
          href="/facturas/catalogos#vendedores"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Crear vendedores
        </Link>
      ) : (
        "Pídelos a administración, en Catálogos."
      )}
    </p>
  );
}
