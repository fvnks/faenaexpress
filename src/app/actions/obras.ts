"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import {
  getActiveMembership,
  getCurrentUser,
  isOrgManager,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { setOrganizationModule } from "@/lib/org-module-state";
import { OBRA_COOKIE, visibleObras } from "@/lib/obra-auth";

export type CrearObraState = { ok?: boolean; error?: string } | undefined;

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

/**
 * Crea una obra desde el propio módulo. La organización (o, en instalación
 * standalone, cualquier usuario con el módulo) puede crear tantas como quiera;
 * quien la crea queda como ADMIN_OBRA y la obra se abre de inmediato.
 */
export async function crearObra(
  _prev: CrearObraState,
  formData: FormData,
): Promise<CrearObraState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organizationId = user.orgMembership?.organizationId ?? null;
  // Sin organización (standalone) no hay rol de organización que exigir.
  if (organizationId && !isOrgManager(user)) {
    return { error: "Solo la dirección de la organización puede crear obras." };
  }

  const nombre = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const mandante = String(formData.get("mandante") ?? "").trim() || null;
  const rutMandante = String(formData.get("rutMandante") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const comuna = String(formData.get("comuna") ?? "").trim() || null;
  const fecha = (campo: string) => {
    const valor = String(formData.get(campo) ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00.000Z`) : null;
  };
  const fechaInicio = fecha("fechaInicio");
  const fechaTermino = fecha("fechaTermino");

  if (nombre.length < 2 || nombre.length > 120) {
    return { error: "El nombre de la obra debe tener entre 2 y 120 caracteres." };
  }
  if (fechaInicio && fechaTermino && fechaTermino < fechaInicio) {
    return { error: "La fecha de término no puede ser anterior al inicio." };
  }

  const obra = await db.obra.create({
    data: {
      organizationId,
      name: nombre.slice(0, 120),
      code: code?.slice(0, 30) ?? null,
      mandante: mandante?.slice(0, 120) ?? null,
      rutMandante: rutMandante?.slice(0, 20) ?? null,
      direccion: direccion?.slice(0, 250) ?? null,
      comuna: comuna?.slice(0, 80) ?? null,
      fechaInicio,
      fechaTermino,
      status: "PLANIFICADA",
      memberships: { create: { userId: user.id, role: "ADMIN_OBRA", active: true } },
    },
    select: { id: true, name: true },
  });

  if (organizationId) {
    await setOrganizationModule(organizationId, "obras", true, "manual");
  }

  const active = await getActiveMembership();
  if (active) {
    await recordAudit(
      { company: { id: active.company.id }, user: { id: user.id, name: user.name } },
      { action: "CREATE", entityType: "Obra", entityId: obra.id, summary: `Creó la obra «${obra.name}».` },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(OBRA_COOKIE, obra.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  revalidatePath("/obras");
  revalidatePath("/obras/mis-obras");
  revalidatePath("/modulos");
  redirect("/obras");
}
