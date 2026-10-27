"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext, type AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import type { Section } from "@/lib/permissions";
import { workerRutExists } from "@/lib/rrhh";
import { partnerSchema } from "@/lib/validation";
import { searchPartners, listPartners } from "@/lib/partners";

export type PartnerFormState = { error?: string } | undefined;

function partnerNoun(type: string): string {
  return type === "CUSTOMER" ? "cliente" : type === "SUPPLIER" ? "proveedor" : "tercero";
}

// El aviso encabeza con el tipo: «Cliente actualizado», no «Proveedor».
function partnerNounTitle(type: string): string {
  const noun = partnerNoun(type);
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

// El formulario de terceros se usa en Clientes y en Proveedores; vuelve a la
// sección desde la que se envió (con un destino por defecto seguro).
const allowedRedirects = new Set(["/facturas/clientes", "/facturas/proveedores"]);

function destination(formData: FormData): string {
  const value = formData.get("redirectTo");
  return typeof value === "string" && allowedRedirects.has(value) ? value : "/facturas/proveedores";
}

// El destino permitido decide la sección y, con ella, qué roles pueden escribir.
function sectionFor(formData: FormData): Section {
  return destination(formData) === "/facturas/clientes" ? "clientes" : "proveedores";
}

function revalidatePartners(id?: string) {
  revalidatePath("/facturas/clientes");
  revalidatePath("/facturas/proveedores");
  if (id) {
    revalidatePath(`/facturas/clientes/${id}`);
    revalidatePath(`/facturas/proveedores/${id}`);
  }
}

function readForm(formData: FormData) {
  return {
    type: formData.get("type"),
    name: formData.get("name"),
    rut: formData.get("rut"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    salespersonId: formData.get("salespersonId"),
    active: formData.get("active"),
  };
}

async function checkSalesperson(
  companyId: string,
  salespersonId: string | undefined,
): Promise<string | undefined> {
  if (!salespersonId) return undefined;
  const salesperson = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId },
    select: { id: true },
  });
  if (!salesperson) return "El vendedor seleccionado no existe.";
  return undefined;
}

// El vendedor del cliente es el que le corresponde a sus facturas: al guardarlo
// se completa en las que quedaron sin vendedor. Nunca pisa una asignación ya
// hecha (puede ser una venta puntual de otro vendedor).
async function applySalespersonToSales(
  ctx: AuthContext,
  partnerId: string,
  salespersonId: string | null,
  partnerName: string,
): Promise<{ count: number; salespersonName: string } | null> {
  if (!salespersonId) return null;

  const salesperson = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId: ctx.company.id },
    select: { name: true },
  });
  if (!salesperson) return null;

  const result = await db.sale.updateMany({
    where: { companyId: ctx.company.id, partnerId, salespersonId: null },
    data: { salespersonId },
  });
  if (result.count === 0) return null;

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: "bulk",
    summary: `Asignó vendedor ${salesperson.name} a ${result.count} ${result.count === 1 ? "factura" : "facturas"} de «${partnerName}».`,
  });
  revalidatePath("/facturas/ventas");
  revalidatePath("/facturas");

  return { count: result.count, salespersonName: salesperson.name };
}

export async function checkRut(
  companyId: string,
  rut: string | undefined,
  ignoreId?: string,
): Promise<string | undefined> {
  if (!rut) return undefined;
  const existing = await db.partner.findFirst({ where: { companyId, rut } });
  if (existing && existing.id !== ignoreId) {
    return "Ya existe un tercero con ese RUT.";
  }
  // Un trabajador no se registra como cliente o proveedor: su RUT no debe
  // entrar a los libros de compra/venta.
  if (await workerRutExists(companyId, rut)) {
    return "Ese RUT pertenece a un trabajador de RRHH. Los trabajadores no se registran como clientes o proveedores.";
  }
  return undefined;
}

export async function createPartner(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, sectionFor(formData))) {
    return { error: "No tienes permiso para crear terceros." };
  }

  const parsed = partnerSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const rutError = await checkRut(ctx.company.id, parsed.data.rut);
  if (rutError) return { error: rutError };
  const salespersonError = await checkSalesperson(ctx.company.id, parsed.data.salespersonId);
  if (salespersonError) return { error: salespersonError };

  const partner = await db.partner.create({
    data: { ...parsed.data, salespersonId: parsed.data.salespersonId ?? null, companyId: ctx.company.id },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Partner",
    entityId: partner.id,
    summary: `Creó el ${partnerNoun(partner.type)} «${partner.name}».`,
  });

  await setFlash("success", `${partnerNounTitle(partner.type)} guardado`, partner.name);
  revalidatePartners();
  redirect(destination(formData));
}

export async function updatePartner(
  id: string,
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, sectionFor(formData))) {
    return { error: "No tienes permiso para editar terceros." };
  }

  const parsed = partnerSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const rutError = await checkRut(ctx.company.id, parsed.data.rut, id);
  if (rutError) return { error: rutError };
  const salespersonError = await checkSalesperson(ctx.company.id, parsed.data.salespersonId);
  if (salespersonError) return { error: salespersonError };

  const before = await db.partner.findFirst({ where: { id, companyId: ctx.company.id } });
  await db.partner.update({
    where: { id, companyId: ctx.company.id },
    data: { ...parsed.data, salespersonId: parsed.data.salespersonId ?? null },
  });

  if (before) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Partner",
      entityId: id,
      summary: `Editó el ${partnerNoun(parsed.data.type)} «${parsed.data.name}».`,
      changes: diffChanges(before, parsed.data),
    });
  }

  // El formulario del cliente trae marcado «aplicar a sus facturas sin vendedor»:
  // el vendedor del cliente vale para todas sus facturas, no solo para las nuevas.
  const applied =
    formData.get("applyToInvoices") !== null
      ? await applySalespersonToSales(ctx, id, parsed.data.salespersonId ?? null, parsed.data.name)
      : null;

  await setFlash(
    "success",
    `${partnerNounTitle(parsed.data.type)} actualizado`,
    applied
      ? `${parsed.data.name} · ${applied.count} ${applied.count === 1 ? "factura" : "facturas"} sin vendedor quedaron con ${applied.salespersonName}`
      : parsed.data.name,
  );
  revalidatePartners(id);
  redirect(destination(formData));
}

// Server Action usada por el AutocompletePartner (client component) para buscar
// clientes/proveedores sin arrastrar el driver de BD al bundle del navegador.
export async function searchPartnersAction(
  _prev: { results: { id: string; name: string; rut: string }[] } | undefined,
  formData: FormData,
): Promise<{ results: { id: string; name: string; rut: string }[] }> {
  const ctx = await requireContext();
  const q = String(formData.get("q") ?? "");
  const kind = String(formData.get("kind") ?? "customers");
    let resultsMapped: { id: string; name: string; rut: string }[];
  if (q.trim() === "") {
    const all = await listPartners(ctx.company.id, kind === "customers" ? "customers" : "suppliers");
    resultsMapped = all.partners.map(p => ({ id: p.id, name: p.name, rut: p.rut ?? "" }));
  } else {
    const searched = await searchPartners(ctx.company.id, q, kind === "customers" ? "customers" : "suppliers");
    resultsMapped = searched.map(p => ({ id: p.id, name: p.name, rut: p.rut ?? "" }));
  }
  return { results: resultsMapped };
}
