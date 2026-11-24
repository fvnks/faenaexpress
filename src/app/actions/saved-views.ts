"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";

export type SavedViewItem = {
  id: string;
  name: string;
  query: string;
  isDefault: boolean;
};

/** Vistas guardadas del usuario para una sección de movimientos. */
export async function listSavedViews(section: string): Promise<SavedViewItem[]> {
  const ctx = await requireContext();
  const views = await db.savedView.findMany({
    where: { companyId: ctx.company.id, userId: ctx.user.id, section },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, query: true, isDefault: true },
  });
  return views;
}

/** Guarda la URL actual como vista. Sin WRITE no se puede (es configuración personal). */
export async function saveSavedView(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "configuracion")) return;

  const section = String(formData.get("section") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const query = String(formData.get("query") ?? "").slice(0, 1000);
  if (!["compras", "ventas", "gastos"].includes(section) || !name) return;

  await db.savedView.upsert({
    where: {
      companyId_userId_section_name: {
        companyId: ctx.company.id,
        userId: ctx.user.id,
        section,
        name,
      },
    },
    create: { companyId: ctx.company.id, userId: ctx.user.id, section, name, query },
    update: { query },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "SavedView",
    entityId: name,
    summary: `Guardó la vista "${name}" en ${section}.`,
  });
  revalidatePath(`/facturas/${section}`);
}

/** Borra una vista propia. */
export async function deleteSavedView(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.savedView.deleteMany({
    where: { id, companyId: ctx.company.id, userId: ctx.user.id },
  });
  revalidatePath("/facturas");
}

/** Marca una vista como predeterminada (solo una por sección). */
export async function setDefaultSavedView(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = String(formData.get("id") ?? "");
  const section = String(formData.get("section") ?? "");
  if (!id || !section) return;

  const own = await db.savedView.findFirst({
    where: { id, companyId: ctx.company.id, userId: ctx.user.id, section },
  });
  if (!own) return;

  await db.$transaction([
    db.savedView.updateMany({
      where: { companyId: ctx.company.id, userId: ctx.user.id, section },
      data: { isDefault: false },
    }),
    db.savedView.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath(`/facturas/${section}`);
}
