"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { areaSchema, categorySchema, payerSchema, salespersonSchema, paymentMethodCatalogSchema, unitSchema, productCategorySchema, warehouseSchema } from "@/lib/validation";

export type CatalogFormState = { error?: string; ok?: boolean } | undefined;

function readActive(formData: FormData) {
  return formData.get("active") ?? "on";
}

export async function createArea(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = areaSchema.safeParse({ name: formData.get("name"), active: readActive(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.area.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash) {
    return { error: "Ya existe un área con ese nombre." };
  }

  await db.area.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Area",
    summary: `Creó el área «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updateArea(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = areaSchema.safeParse({ name: formData.get("name"), active: formData.get("active") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.area.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash && clash.id !== id) return { error: "Ya existe un área con ese nombre." };

  await db.area.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Area",
    entityId: id,
    summary: `Editó el área «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function createCategory(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    active: readActive(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const clash = await db.category.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash) {
    return { error: "Ya existe una categoría con ese nombre." };
  }

  await db.category.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Category",
    summary: `Creó la categoría «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const clash = await db.category.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash && clash.id !== id) return { error: "Ya existe una categoría con ese nombre." };

  await db.category.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Category",
    entityId: id,
    summary: `Editó la categoría «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function createSalesperson(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = salespersonSchema.safeParse({ name: formData.get("name"), active: readActive(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.salesperson.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash) {
    return { error: "Ya existe un vendedor con ese nombre." };
  }

  await db.salesperson.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Salesperson",
    summary: `Creó el vendedor «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updateSalesperson(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = salespersonSchema.safeParse({
    name: formData.get("name"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.salesperson.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash && clash.id !== id) return { error: "Ya existe un vendedor con ese nombre." };

  await db.salesperson.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Salesperson",
    entityId: id,
    summary: `Editó el vendedor «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function createPayer(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = payerSchema.safeParse({ name: formData.get("name"), active: readActive(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.payer.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash) {
    return { error: "Ya existe un pagador con ese nombre." };
  }

  await db.payer.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Payer",
    summary: `Creó el pagador «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updatePayer(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = payerSchema.safeParse({
    name: formData.get("name"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.payer.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash && clash.id !== id) return { error: "Ya existe un pagador con ese nombre." };

  await db.payer.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Payer",
    entityId: id,
    summary: `Editó el pagador «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function createPaymentMethod(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = paymentMethodCatalogSchema.safeParse({
    name: formData.get("name"),
    active: readActive(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.paymentMethodCatalog.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash) {
    return { error: "Ya existe un medio de pago con ese nombre." };
  }

  await db.paymentMethodCatalog.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PaymentMethodCatalog",
    summary: `Creó el medio de pago «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updatePaymentMethod(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };

  const parsed = paymentMethodCatalogSchema.safeParse({
    name: formData.get("name"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const clash = await db.paymentMethodCatalog.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clash && clash.id !== id) return { error: "Ya existe un medio de pago con ese nombre." };

  await db.paymentMethodCatalog.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "PaymentMethodCatalog",
    entityId: id,
    summary: `Editó el medio de pago «${parsed.data.name}».`,
  });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function createUnit(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };
  const parsed = unitSchema.safeParse({ name: formData.get("name"), active: readActive(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };
  const clash = await db.unit.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (clash) return { error: "Ya existe una unidad con ese nombre." };
  await db.unit.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, { action: "CREATE", entityType: "Unit", summary: `Creó la unidad «${parsed.data.name}».` });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updateUnit(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };
  const parsed = unitSchema.safeParse({ name: formData.get("name"), active: formData.get("active") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };
  const clash = await db.unit.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (clash && clash.id !== id) return { error: "Ya existe una unidad con ese nombre." };
  await db.unit.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, { action: "UPDATE", entityType: "Unit", entityId: id, summary: `Editó la unidad «${parsed.data.name}».` });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function createProductCategory(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };
  const parsed = productCategorySchema.safeParse({ name: formData.get("name"), active: readActive(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };
  const clash = await db.productCategory.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (clash) return { error: "Ya existe una categoría de producto con ese nombre." };
  await db.productCategory.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, { action: "CREATE", entityType: "ProductCategory", summary: `Creó la categoría de producto «${parsed.data.name}».` });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updateProductCategory(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };
  const parsed = productCategorySchema.safeParse({ name: formData.get("name"), active: formData.get("active") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };
  const clash = await db.productCategory.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (clash && clash.id !== id) return { error: "Ya existe una categoría de producto con ese nombre." };
  await db.productCategory.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, { action: "UPDATE", entityType: "ProductCategory", entityId: id, summary: `Editó la categoría de producto «${parsed.data.name}».` });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

// --- Bodegas ---------------------------------------------------------------
// La bodega por defecto no se puede desactivar ni renombrar: es el destino
// implícito de todo producto nuevo.

export async function createWarehouse(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };
  const parsed = warehouseSchema.safeParse({ name: formData.get("name"), active: readActive(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };
  const clash = await db.warehouse.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (clash) return { error: "Ya existe una bodega con ese nombre." };
  await db.warehouse.create({ data: { ...parsed.data, companyId: ctx.company.id } });
  await recordAudit(ctx, { action: "CREATE", entityType: "Warehouse", summary: `Creó la bodega «${parsed.data.name}».` });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}

export async function updateWarehouse(
  id: string,
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "catalogos")) return { error: "No tienes permiso para editar catálogos." };
  const parsed = warehouseSchema.safeParse({ name: formData.get("name"), active: formData.get("active") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  const current = await db.warehouse.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!current) return { error: "Bodega no encontrada." };
  if (current.isDefault && !parsed.data.active) {
    return { error: "La bodega principal no se puede desactivar." };
  }

  const clash = await db.warehouse.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (clash && clash.id !== id) return { error: "Ya existe una bodega con ese nombre." };
  await db.warehouse.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });
  await recordAudit(ctx, { action: "UPDATE", entityType: "Warehouse", entityId: id, summary: `Editó la bodega «${parsed.data.name}».` });
  revalidatePath("/dashboard/catalogos");
  return { ok: true };
}
