"use server";

import { revalidatePath } from "next/cache";

import type { ObraRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { OBRA_ROLES } from "@/lib/obra-permissions";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

function esRol(valor: string): valor is ObraRole {
  return (OBRA_ROLES as readonly string[]).includes(valor);
}

async function quedariaSinAdmin(obraId: string, membershipId: string, nuevoRol: ObraRole, activo: boolean) {
  const miembro = await db.obraMembership.findFirst({
    where: { id: membershipId, obraId },
    select: { role: true, active: true },
  });
  if (!miembro) return true;
  const sigueSiendoAdmin = miembro.role === "ADMIN_OBRA" && nuevoRol === "ADMIN_OBRA" && activo;
  if (sigueSiendoAdmin) return false;
  if (miembro.role !== "ADMIN_OBRA") return false;
  const admins = await db.obraMembership.count({
    where: { obraId, role: "ADMIN_OBRA", active: true },
  });
  return admins <= 1;
}

export async function agregarMiembroObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("equipo");
  if (!obraCanWrite(ctx, "equipo")) return { error: "Solo la dirección puede administrar el equipo." };

  const userId = String(formData.get("userId") ?? "");
  const rol = String(formData.get("role") ?? "");
  if (!userId || !esRol(rol)) return { error: "Selecciona una persona y un rol." };

  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const usuario = await db.user.findFirst({
    where: {
      id: userId,
      active: true,
      ...(organizationId
        ? { orgMembers: { some: { organizationId, active: true } } }
        : {}),
    },
    select: { name: true },
  });
  if (!usuario) return { error: "Esa persona no pertenece a tu organización." };

  await db.obraMembership.upsert({
    where: { userId_obraId: { userId, obraId: ctx.obra.id } },
    create: { userId, obraId: ctx.obra.id, role: rol, active: true },
    update: { role: rol, active: true },
  });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "ObraMembership",
    entityId: userId,
    summary: `Agregó a ${usuario.name} al equipo como ${rol}.`,
  });
  revalidatePath("/obras/equipo");
  return { ok: true, message: "Persona agregada al equipo." };
}

export async function cambiarRolObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("equipo");
  if (!obraCanWrite(ctx, "equipo")) return { error: "Solo la dirección puede administrar el equipo." };

  const id = String(formData.get("id") ?? "");
  const rol = String(formData.get("role") ?? "");
  if (!id || !esRol(rol)) return { error: "Rol no válido." };
  if (await quedariaSinAdmin(ctx.obra.id, id, rol, true)) {
    return { error: "La obra debe tener al menos un administrador activo." };
  }

  const miembro = await db.obraMembership.findFirst({
    where: { id, obraId: ctx.obra.id },
    select: { user: { select: { name: true } } },
  });
  if (!miembro) return { error: "Miembro no encontrado." };

  await db.obraMembership.update({ where: { id }, data: { role: rol } });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "ObraMembership",
    entityId: id,
    summary: `Cambió el rol de ${miembro.user.name} a ${rol}.`,
  });
  revalidatePath("/obras/equipo");
  return { ok: true, message: "Rol actualizado." };
}

export async function cambiarEstadoMiembroObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("equipo");
  if (!obraCanWrite(ctx, "equipo")) return { error: "Solo la dirección puede administrar el equipo." };

  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "") === "true";
  if (!id) return { error: "Miembro no válido." };

  const miembro = await db.obraMembership.findFirst({
    where: { id, obraId: ctx.obra.id },
    select: { role: true, user: { select: { name: true } } },
  });
  if (!miembro) return { error: "Miembro no encontrado." };

  if (!activo && miembro.role === "ADMIN_OBRA") {
    const admins = await db.obraMembership.count({
      where: { obraId: ctx.obra.id, role: "ADMIN_OBRA", active: true },
    });
    if (admins <= 1) return { error: "La obra debe tener al menos un administrador activo." };
  }

  await db.obraMembership.update({ where: { id }, data: { active: activo } });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "ObraMembership",
    entityId: id,
    summary: `${activo ? "Activó" : "Desactivó"} a ${miembro.user.name} en el equipo.`,
  });
  revalidatePath("/obras/equipo");
  return { ok: true, message: activo ? "Miembro activado." : "Miembro desactivado." };
}
