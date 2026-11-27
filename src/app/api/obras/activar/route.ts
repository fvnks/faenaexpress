import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { destinoObraSeguro } from "@/lib/obra-nav";
import { OBRA_COOKIE, visibleObras } from "@/lib/obra-auth";

/**
 * Guarda la obra abierta. Lo llama el dropdown antes de navegar. No redirige:
 * la navegación la hace el navegador con `location.assign`, igual que el selector
 * de módulos, para que el cambio no dependa de una transición RSC.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  let obraId = "";
  let destino: string | undefined;
  try {
    const body = (await request.json()) as { obraId?: unknown; destino?: unknown };
    obraId = String(body.obraId ?? "");
    destino = typeof body.destino === "string" ? body.destino : undefined;
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  // Misma fuente que el layout: incluye obras visibles sin fila de membresía
  // (personal de plataforma), que antes se quedaban sin poder abrir.
  const accesibles = await visibleObras(user);
  if (!accesibles.some((obra) => obra.id === obraId)) {
    return NextResponse.json({ error: "Obra no disponible." }, { status: 404 });
  }

  const href = destinoObraSeguro(destino);
  revalidatePath("/", "layout");

  const response = NextResponse.json({ ok: true, href });
  response.cookies.set(OBRA_COOKIE, obraId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
