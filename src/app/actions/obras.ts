"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { OBRA_COOKIE } from "@/lib/obra-auth";

/** Cambia la obra abierta. Solo se puede elegir una a la que se pertenezca. */
export async function switchObra(obraId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await db.obraMembership.findFirst({
    where: { userId: user.id, obraId, active: true },
    select: { id: true },
  });
  if (!membership) redirect("/obras");

  const cookieStore = await cookies();
  cookieStore.set(OBRA_COOKIE, obraId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/obras");
}
