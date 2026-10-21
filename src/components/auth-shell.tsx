import { PlatformMark } from "@/components/platform-mark";
import { ThemeToggle } from "@/components/theme-toggle";

import { PlatformVisual } from "@/app/login/visual";

/**
 * El marco de las pantallas de entrada: formulario a la izquierda, columna
 * visual a la derecha (banda arriba en móvil).
 *
 * Estaba copiado, con las mismas clases, en el login, la invitación, el 2FA y el
 * perfil. Al extraerlo, la puerta de entrada se cambia en un solo lugar; el 2FA
 * además tenía la columna derecha como un `<div />` vacío, así que en escritorio
 * se veía partido.
 *
 * `visual={false}` deja la columna en blanco cuando la pantalla ya trae su
 * propio contexto y no conviene repetir la lista de módulos.
 */
export function AuthShell({
  children,
  visual = true,
  maxWidth = "420px",
}: {
  children: React.ReactNode;
  visual?: boolean;
  maxWidth?: string;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="login-in flex items-center justify-center bg-surface px-6 py-10 lg:order-first lg:px-16 lg:py-0">
        <div className="w-full" style={{ maxWidth }}>
          <div className="flex items-center justify-between">
            <PlatformMark />
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>

      <aside className="order-first h-52 sm:h-64 lg:order-last lg:h-auto">
        {visual ? <PlatformVisual /> : null}
      </aside>
    </div>
  );
}

/** El pie de una pantalla de entrada: una nota y, si hay, una acción al lado. */
export function AuthFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
      {children}
    </div>
  );
}
