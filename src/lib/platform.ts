// Consola de operador (Nivel 2): el equipo de Yellow ERP.
//
// `PlatformStaff` vive en la base y no en un flag de entorno ni en el código: el
// acceso debe poder revocarse sin desplegar y quedar auditado. El nivel decide
// qué puede hacer cada persona del equipo:
//
//   SUPPORT   lee (soporte: mirar, no tocar)
//   OPERATOR  actúa (crea organizaciones, invitaciones, cambia planes)
//   OWNER     todo, incluido gestionar al propio personal de plataforma
//
// `requirePlatformStaff` corta en cada página y en cada Server Action de /admin:
// un error de configuración no debe exponer a todos los clientes.

import { redirect } from "next/navigation";

import type { PlatformLevel } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

// Jerarquía de niveles: un nivel incluye a los de menor alcance.
const RANK: Record<PlatformLevel, number> = {
  SUPPORT: 1,
  OPERATOR: 2,
  OWNER: 3,
};

export type PlatformContext = {
  user: SessionUser;
  staff: { id: string; level: PlatformLevel };
};

/** ¿El usuario es personal de plataforma activo, al menos del nivel pedido? */
export async function isPlatformStaff(level: PlatformLevel = "SUPPORT"): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  return hasPlatformLevel(user.id, level);
}

export async function hasPlatformLevel(userId: string, level: PlatformLevel): Promise<boolean> {
  const staff = await db.platformStaff.findUnique({
    where: { userId },
    select: { level: true, active: true },
  });
  if (!staff?.active) return false;
  return RANK[staff.level] >= RANK[level];
}

/** Puede ver la consola: cualquier nivel de plataforma activo. */
export async function isAnyStaff(): Promise<boolean> {
  return isPlatformStaff("SUPPORT");
}

/**
 * Exige sesión y nivel de plataforma. Redirige a /facturas (no a /login) si no
 * lo es: quien tiene sesión pero no es del equipo no debe ver siquiera que /admin
 * existe. Sin sesión, el login normal decide.
 */
export async function requirePlatformStaff(level: PlatformLevel = "SUPPORT"): Promise<PlatformContext> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const staff = await db.platformStaff.findUnique({
    where: { userId: user.id },
    select: { id: true, level: true, active: true },
  });
  if (!staff?.active || RANK[staff.level] < RANK[level]) {
    redirect("/facturas");
  }
  return { user, staff: { id: staff.id, level: staff.level } };
}

export function platformLevelLabel(level: PlatformLevel): string {
  switch (level) {
    case "SUPPORT":
      return "Soporte";
    case "OPERATOR":
      return "Operador";
    case "OWNER":
      return "Dueño";
  }
}
