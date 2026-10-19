"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export async function readNotification(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await markNotificationRead(ctx.company.id, id);
  }
  revalidatePath("/facturas/notificaciones");
  revalidatePath("/facturas");
}

export async function readAllNotifications(): Promise<void> {
  const ctx = await requireContext();
  await markAllNotificationsRead(ctx.company.id);
  revalidatePath("/facturas/notificaciones");
  revalidatePath("/facturas");
}
