"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import {
  getActiveMembership,
  getCurrentUser,
  isOrgManager,
} from "@/lib/auth";
import { db } from "@/lib/db";

export type MandanteState = { ok?: boolean; error?: string } | undefined;

function datos(formData: FormData) {
  const texto = (campo: string, max: number) =>
    String(formData.get(campo) ?? "").trim().slice(0, max) || null;
  return {
    name: texto("name", 160) ?? "",
    rut: texto("rut", 20),
    direccion: texto("direccion", 250),
    comuna: texto("comuna", 80),
    contacto: texto("contacto", 120),
    notas: texto("notas", 1000),
  };
}

async function puedeGestionar() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const organizationId = user.orgMembership?.organizationId ?? null;
  if (organizationId && !isOrgManager(user)) return null;
  return { user, organizationId };
}

async function auditar(userId: string, name: string, action: "CREATE" | "UPDATE" | "DELETE", resumen: string) {
  const active = await getActiveMembership();
  if (!active) return;
  await recordAudit(
    { company: { id: active.company.id }, user: { id: userId, name } },
    { action, entityType: "MandanteObra", summary: resumen },
  );
}

export async function crearMandanteObra(
  _prev: MandanteState,
  formData: FormData,
): Promise<MandanteState> {
  const acceso = await puedeGestionar();
  if (!acceso) return { error: "Solo la dirección de la organización puede crear mandantes." };

  const data = datos(formData);
  if (!data.name || data.name.length < 2) return { error: "Ingresa el nombre del mandante." };

  await db.mandanteObra.create({
    data: { ...data, organizationId: acceso.organizationId },
  });
  await auditar(acceso.user.id, acceso.user.name ?? "", "CREATE", `Creó el mandante «${data.name}».`);
  revalidatePath("/obras/mandantes");
  revalidatePath("/obras/mis-obras");
  revalidatePath("/obras/administracion");
  return { ok: true };
}

export async function actualizarMandanteObra(
  _prev: MandanteState,
  formData: FormData,
): Promise<MandanteState> {
  const acceso = await puedeGestionar();
  if (!acceso) return { error: "No tienes permiso para editar mandantes." };

  const id = String(formData.get("id") ?? "");
  const data = datos(formData);
  if (!id) return { error: "No se indicó el mandante." };
  if (!data.name || data.name.length < 2) return { error: "Ingresa el nombre del mandante." };

  const mandante = await db.mandanteObra.findFirst({
    where: { id, organizationId: acceso.organizationId },
    select: { name: true },
  });
  if (!mandante) return { error: "El mandante no existe en tu cuenta." };

  await db.mandanteObra.update({ where: { id }, data });
  await auditar(acceso.user.id, acceso.user.name ?? "", "UPDATE", `Editó el mandante «${mandante.name}».`);
  revalidatePath("/obras/mandantes");
  revalidatePath(`/obras/mandantes/${id}`);
  revalidatePath("/obras/mis-obras");
  return { ok: true };
}

export async function eliminarMandanteObra(formData: FormData): Promise<void> {
  const acceso = await puedeGestionar();
  if (!acceso) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const mandante = await db.mandanteObra.findFirst({
    where: { id, organizationId: acceso.organizationId },
    select: { name: true },
  });
  if (!mandante) return;
  await db.mandanteObra.delete({ where: { id } });
  await auditar(acceso.user.id, acceso.user.name ?? "", "DELETE", `Eliminó el mandante «${mandante.name}».`);
  revalidatePath("/obras/mandantes");
  revalidatePath("/obras/mis-obras");
}
