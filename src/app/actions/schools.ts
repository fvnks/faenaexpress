"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SCHOOL_COOKIE } from "@/lib/school-auth";

/** Cambia el colegio abierto (la cookie del módulo Colegios). */
export async function switchSchool(schoolId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await db.schoolMembership.findFirst({
    where: { userId: user.id, schoolId, active: true },
    select: { id: true },
  });
  if (!membership) redirect("/colegios");

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, schoolId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/colegios");
}
