import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { enabledModules, MODULE_COOKIE } from "@/lib/modules";

/**
 * Guarda el último módulo usado. Lo llama el dropdown antes de navegar.
 * No redirige: la navegación la hace el navegador con `location.assign`, para
 * que el cambio de módulo no dependa de una transición RSC del App Router.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = String(body.code ?? "");
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  const modules = await enabledModules(user.id);
  const target = modules.find((m) => m.code === code);
  if (!target) return NextResponse.json({ error: "Módulo no disponible." }, { status: 404 });

  const response = NextResponse.json({ ok: true, href: target.href });
  response.cookies.set(MODULE_COOKIE, target.code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
