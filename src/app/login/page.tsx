import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { postLoginDestination } from "@/lib/modules";

import { LoginForm } from "./login-form";

/**
 * La puerta de entrada de la plataforma.
 *
 * No es el login de Facturas: es el de Yellow ERP. El destino ya lo decide el
 * servidor según los módulos de la persona (`postLoginDestination`): con uno
 * entra directo, con varios pasa al selector. Por eso el texto no promete un
 * producto en particular.
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    // Ya autenticado: un módulo directo, varios al selector.
    redirect(await postLoginDestination(user.id));
  }

  return (
    <AuthShell>
      <h1 className="mt-12 text-3xl font-light tracking-tight">Bienvenido de nuevo</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entra con tu cuenta para llegar a tus módulos.
      </p>

      <LoginForm />

      <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
        ¿No tienes cuenta? Pídele acceso al administrador de tu organización.
      </p>
    </AuthShell>
  );
}
