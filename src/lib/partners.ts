import type { PartnerType } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Listas acotadas a la empresa (para los formularios).
export async function listSuppliers(companyId: string) {
  return db.partner.findMany({
    where: { companyId, active: true, type: { in: ["SUPPLIER", "BOTH"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, rut: true },
  });
}

export async function listCustomers(companyId: string) {
  return db.partner.findMany({
    where: { companyId, active: true, type: { in: ["CUSTOMER", "BOTH"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, rut: true },
  });
}

// Lista de gestión para las secciones de Clientes y Proveedores.
export async function listPartners(companyId: string, kind: "customers" | "suppliers") {
  const types: PartnerType[] = kind === "customers" ? ["CUSTOMER", "BOTH"] : ["SUPPLIER", "BOTH"];

  return db.partner.findMany({
    where: { companyId, type: { in: types } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getPartner(companyId: string, id: string) {
  return db.partner.findFirst({ where: { id, companyId } });
}

// Busca partners por RUT (parcial) o nombre, devolviendo hasta 8 resultados.
export async function searchPartners(companyId: string, q: string, kind: "customers" | "suppliers") {
  if (!q?.trim()) return [];

  const types: PartnerType[] = kind === "customers" ? ["CUSTOMER", "BOTH"] : ["SUPPLIER", "BOTH"];

  return db.partner.findMany({
    where: {
      companyId,
      type: { in: types },
      OR: [
        { rut: { contains: q } },
        { name: { contains: q } },
      ],
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    take: 8,
  });
}
