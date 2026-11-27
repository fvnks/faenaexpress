"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { OBRA_COOKIE, visibleObras } from "@/lib/obra-auth";

/** Secciones de primer nivel donde tiene sentido quedarse al cambiar de obra. */
const SECCIONES = new Set([
  "/obras",
  "/obras/presupuesto",
  "/obras/avance",
  "/obras/estados-pago",
  "/obras/compras",
  "/obras/gastos",
  "/obras/subcontratos",
  "/obras/bodega",
  "/obras/maquinaria",
  "/obras/documentos",
  "/obras/equipo",
  "/obras/administracion",
  "/obras/reportes",
]);

/**
 * Cambia la obra abierta. Se valida contra `visibleObras` —la misma fuente que
 * usa el layout— para que el personal de plataforma (que ve obras sin tener
 * fila en ObraMembership) también pueda cambiar. Antes se validaba con un
 * `findFirst` de membresía y la cookie nunca se escribía: el módulo parecía
 * soportar una sola obra.
 */
export async function switchObra(obraId: string, destino?: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accesibles = await visibleObras(user);
  if (!accesibles.some((obra) => obra.id === obraId)) redirect("/obras");

  const cookieStore = await cookies();
  cookieStore.set(OBRA_COOKIE, obraId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Invalida el router cache para que el switcher y las páginas reflejen la
  // nueva obra sin depender del redirect (patrón de switchCompany).
  revalidatePath("/", "layout");

  const seguro = destino && SECCIONES.has(destino) ? destino : "/obras";
  redirect(seguro);
}
