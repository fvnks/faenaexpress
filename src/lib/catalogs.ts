import { db } from "@/lib/db";

// Listas activas para los formularios (compras, ventas, gastos).
export async function listAreas(companyId: string) {
  return db.area.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listCategories(companyId: string) {
  return db.category.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listSalespeople(companyId: string) {
  return db.salesperson.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listPayers(companyId: string) {
  return db.payer.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listWorkers(companyId: string) {
  return db.worker.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Listas completas para la pantalla de administración de catálogos.
export async function listAreasAdmin(companyId: string) {
  return db.area.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function listCategoriesAdmin(companyId: string) {
  return db.category.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function listSalespeopleAdmin(companyId: string) {
  return db.salesperson.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function listPayersAdmin(companyId: string) {
  return db.payer.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

// Payment methods
export async function listPaymentMethods(companyId: string) {
  return db.paymentMethodCatalog.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listPaymentMethodsAdmin(companyId: string) {
  return db.paymentMethodCatalog.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function listUnits(companyId: string) {
  return db.unit.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function listUnitsAdmin(companyId: string) {
  return db.unit.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function listProductCategories(companyId: string) {
  return db.productCategory.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function listProductCategoriesAdmin(companyId: string) {
  return db.productCategory.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}
