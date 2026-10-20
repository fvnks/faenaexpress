import { NextResponse, type NextRequest } from "next/server";

// Guardia de sesión (antes se llamaba `middleware`; en Next 16 es `proxy`).
//
// Esto NO es el control de acceso: es el primer filtro, que corre antes de
// renderizar nada. Si no hay cookie de sesión, las rutas privadas se mandan al
// login sin llegar a la app. La autorización real (rol, organización, módulo)
// sigue living en `requireContext` y `requirePlatformStaff`, que consultan la
// base: el proxy no consulta la base a propósito, para que sea rápido.
//
// La cookie se solo verifica que EXISTE. Que sea válida lo decide la app.

const SESSION_COOKIE = "facturas_session";

// Rutas que necesitan sesión.
//
// `/invitacion` NO va acá a propósito: esa pantalla es para la persona que
// todavía no tiene cuenta (o que entra con otra). El token valida el acceso;
// la sesión se crea al aceptar.
const PROTEGIDAS = [
  "/facturas",
  "/admin",
  "/perfil",
  "/modulos",
  "/api",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protegida = PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
  if (!protegida) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

  // Sin sesión: al login. Se guarda la ruta para volver a ella después.
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("desde", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Todo menos los archivos estáticos, las imágenes y los archivos de Next.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
