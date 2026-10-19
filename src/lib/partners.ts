import type { DocumentType, Partner, PartnerType, PaymentStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/pagination";

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

// Facturas del cliente que todavía no tienen vendedor: son las que heredan el
// vendedor por defecto cuando se guarda el tercero.
export async function countSalesWithoutSalesperson(companyId: string, partnerId: string) {
  return db.sale.count({ where: { companyId, partnerId, salespersonId: null } });
}

export async function getPartner(companyId: string, id: string) {
  return db.partner.findFirst({ where: { id, companyId } });
}

/** Datos de contacto que un XML puede aportar al tercero. */
export type PartnerContact = {
  address?: string | null;
  commune?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  giro?: string | null;
};

/**
 * Asegura que el tercero cubra el rol con que se usó: una compra exige
 * proveedor y una venta, cliente. Un tercero que solo era cliente pasa a BOTH
 * en vez de quedar fuera del filtro de proveedores (y al revés).
 *
 * Muta el objeto en memoria para que los bucles de importación no repitan la
 * consulta.
 */
export async function ensurePartnerRole(
  partner: { id: string; type: PartnerType },
  role: "SUPPLIER" | "CUSTOMER",
): Promise<PartnerType> {
  if (partner.type === "BOTH" || partner.type === role) return partner.type;

  await db.partner.update({ where: { id: partner.id }, data: { type: "BOTH" } });
  partner.type = "BOTH";
  return partner.type;
}

/** Campos de contacto actuales de un tercero, para completar solo lo vacío. */
export type PartnerContactState = {
  id: string;
  address: string | null;
  commune: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  giro: string | null;
};

/**
 * Completa los datos de contacto del tercero con los del XML, sin pisar lo que
 * ya estaba cargado a mano.
 */
export async function fillPartnerContact(
  partner: PartnerContactState,
  contact: PartnerContact,
): Promise<void> {
  const data: PartnerContact = {};
  for (const key of ["address", "commune", "city", "phone", "email", "giro"] as const) {
    const value = contact[key];
    if (value && !partner[key]) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;

  await db.partner.update({ where: { id: partner.id }, data });
  Object.assign(partner, data);
}

export type PartnerPurchaseRow = {
  id: string;
  date: Date;
  documentNumber: string | null;
  documentType: DocumentType;
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
  status: PaymentStatus;
  paymentDate: Date | null;
  dueDate: Date | null;
};

export type PartnerOverview = {
  partner: Partner;
  purchaseCount: number;
  purchaseTotal: number;
  pendingTotal: number;
  lastPurchaseAt: Date | null;
  purchases: PartnerPurchaseRow[];
  page: number;
  pageCount: number;
};

/**
 * Ficha del proveedor con su historial de compras: es la pantalla donde se
 * revisa "qué se compró, con qué factura y cuándo".
 */
export async function getPartnerOverview(
  companyId: string,
  id: string,
  page = 1,
): Promise<PartnerOverview | null> {
  const partner = await db.partner.findFirst({ where: { id, companyId } });
  if (!partner) return null;

  const where = { companyId, partnerId: id };
  const purchaseCount = await db.purchase.count({ where });
  const pageCount = Math.max(1, Math.ceil(purchaseCount / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);

  const [groups, purchases, last] = await Promise.all([
    db.purchase.groupBy({
      by: ["status"],
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    db.purchase.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        date: true,
        documentNumber: true,
        documentType: true,
        netAmount: true,
        ivaAmount: true,
        totalAmount: true,
        status: true,
        paymentDate: true,
        dueDate: true,
      },
    }),
    db.purchase.findFirst({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: { date: true },
    }),
  ]);

  const purchaseTotal = groups.reduce((sum, group) => sum + Number(group._sum.totalAmount ?? 0), 0);
  const pendingTotal = Number(
    groups.find((group) => group.status === "PENDING")?._sum.totalAmount ?? 0,
  );

  return {
    partner,
    purchaseCount,
    purchaseTotal,
    pendingTotal,
    lastPurchaseAt: last?.date ?? null,
    purchases,
    page: current,
    pageCount,
  };
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
