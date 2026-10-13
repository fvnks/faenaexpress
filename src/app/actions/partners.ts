"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
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

// El formulario de terceros se usa en Clientes y en Proveedores; vuelve a la
// sección desde la que se envió (con un destino por defecto seguro).
const allowedRedirects = new Set(["/dashboard/clientes", "/dashboard/proveedores"]);

function destination(formData: FormData): string {
  const value = formData.get("redirectTo");
  return typeof value === "string" && allowedRedirects.has(value) ? value : "/dashboard/proveedores";
}

// El destino permitido decide la sección y, con ella, qué roles pueden escribir.
function sectionFor(formData: FormData): Section {
  return destination(formData) === "/dashboard/clientes" ? "clientes" : "proveedores";
}

function revalidatePartners(id?: string) {
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/proveedores");
  if (id) {
    revalidatePath(`/dashboard/clientes/${id}`);
    revalidatePath(`/dashboard/proveedores/${id}`);
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
    active: formData.get("active"),
  };
}

async function checkRut(
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

  const partner = await db.partner.create({ data: { ...parsed.data, companyId: ctx.company.id } });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Partner",
    entityId: partner.id,
    summary: `Creó el ${partnerNoun(partner.type)} «${partner.name}».`,
  });

  await setFlash("success", `${partnerNoun(partner.type) === "Cliente" ? "Cliente" : "Proveedor"} guardado`, partner.name);
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

  const before = await db.partner.findFirst({ where: { id, companyId: ctx.company.id } });
  await db.partner.update({ where: { id, companyId: ctx.company.id }, data: parsed.data });

  if (before) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Partner",
      entityId: id,
      summary: `Editó el ${partnerNoun(parsed.data.type)} «${parsed.data.name}».`,
      changes: diffChanges(before, parsed.data),
    });
  }

  await setFlash("success", `${partnerNoun(parsed.data.type) === "Cliente" ? "Cliente" : "Proveedor"} actualizado`, parsed.data.name);
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
    resultsMapped = all.map(p => ({ id: p.id, name: p.name, rut: p.rut ?? "" }));
  } else {
    const searched = await searchPartners(ctx.company.id, q, kind === "customers" ? "customers" : "suppliers");
    resultsMapped = searched.map(p => ({ id: p.id, name: p.name, rut: p.rut ?? "" }));
  }
  return { results: resultsMapped };
}
