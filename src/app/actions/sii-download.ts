"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { PartnerType } from "@/generated/prisma/client";
import { canWrite, requireContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { parseDteXml } from "@/lib/dte";
import { setFlash } from "@/lib/flash";
import { ensurePartnerRole } from "@/lib/partners";
import { formatRut, normalizeRut } from "@/lib/rut";
import { exploreSiiPortal, downloadReceivedDtes } from "@/lib/sii/download-dtes";

/**
 * Explora el portal del SII para descubrir dónde están los DTE recibidos.
 * Solo para desarrollo: muestra el mapa de URLs del portal.
 */
export async function exploreSiiPortalAction(): Promise<void> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    await setFlash("error", "No tienes permiso para gestionar el SII.");
    revalidatePath("/facturas/compras");
    return;
  }

  const result = await exploreSiiPortal(ctx.company.id);

  if (result.error) {
    await setFlash("error", "Exploración del SII", result.error);
  } else {
    // Log de hallazgos para depuración (el admin lo ve en consola del servidor).
    for (const f of result.findings) {
      console.log(`\n[sii-portal] ${f.url} (${f.status}) — "${f.title}"`);
      for (const link of f.links) {
        console.log(`  → ${link}`);
      }
    }
    await setFlash(
      "success",
      "Exploración del SII completada",
      `Se probaron ${result.findings.length} URLs. Revisa la consola del servidor para el mapa del portal.`,
    );
  }
  revalidatePath("/facturas/compras");
}

/**
 * Descarga los XML DTE recibidos del SII para un período y los adjunta
 * a las compras existentes (matching por folio).
 */
export async function downloadSiiXmlForPurchases(formData: FormData): Promise<void> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    await setFlash("error", "No tienes permiso para gestionar el SII.");
    redirect("/facturas/compras");
  }

  const periodo = String(formData.get("periodo") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    await setFlash("error", "Período inválido", "Usa el formato AAAA-MM.");
    redirect("/facturas/compras");
  }

  const result = await downloadReceivedDtes(ctx.company.id, periodo);

  if (result.error) {
    await setFlash("error", "Descarga de XMLs del SII", result.error);
    redirect("/facturas/compras");
  }

  if (result.dtes.length === 0) {
    await setFlash("success", "Sin XMLs nuevos", `No se encontraron XMLs para ${periodo}.`);
    redirect("/facturas/compras");
  }

  // Matching por folio contra compras existentes sin XML.
  let updated = 0;
  let created = 0;
  const errores: string[] = [];

  // Índice de proveedores por RUT normalizado: la búsqueda por `contains` sobre
  // el RUT formateado no encontraba nada.
  const partners = await db.partner.findMany({
    where: { companyId: ctx.company.id },
    select: { id: true, rut: true, type: true },
  });
  const partnerPorRut = new Map<string, { id: string; type: PartnerType }>();
  for (const partner of partners) {
    if (partner.rut) partnerPorRut.set(normalizeRut(partner.rut), { id: partner.id, type: partner.type });
  }

  for (const dte of result.dtes) {
    try {
      const existing = await db.purchase.findFirst({
        where: {
          companyId: ctx.company.id,
          documentNumber: dte.folio,
          xmlContent: null,
        },
      });

      if (existing) {
        await db.purchase.update({
          where: { id: existing.id },
          data: { xmlContent: dte.xml },
        });
        updated += 1;
        continue;
      }

      // Si no existe la compra, la creamos con el XML. El proveedor se asigna
      // por RUT y, si no está, se crea con los datos del propio XML.
      const parsed = parseDteXml(dte.xml);
      const doc = parsed.documentos.find((d) => d.folio === dte.folio) ?? parsed.documentos[0] ?? null;

      const rutNormalizado = normalizeRut(dte.rutEmisor);
      let partner = rutNormalizado ? partnerPorRut.get(rutNormalizado) : undefined;
      if (!partner) {
        const creado = await db.partner.create({
          data: {
            companyId: ctx.company.id,
            type: "SUPPLIER",
            name: doc?.razonSocialEmisor || `Proveedor ${dte.rutEmisor}`,
            rut: rutNormalizado ? formatRut(rutNormalizado) : dte.rutEmisor,
            giro: doc?.giroEmisor ?? null,
            address: doc?.direccionEmisor ?? null,
            commune: doc?.comunaEmisor ?? null,
            city: doc?.ciudadEmisor ?? null,
            phone: doc?.telefonoEmisor ?? null,
            email: doc?.emailEmisor ?? null,
          },
        });
        partner = { id: creado.id, type: "SUPPLIER" };
        if (rutNormalizado) partnerPorRut.set(rutNormalizado, partner);
      } else {
        await ensurePartnerRole(partner, "SUPPLIER");
      }

      await db.purchase.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          partnerId: partner.id,
          documentType: dte.tipoDTE === 56 ? "DEBIT_NOTE" : "INVOICE",
          documentNumber: dte.folio,
          date: doc?.fecha ? new Date(`${doc.fecha}T00:00:00.000Z`) : new Date(),
          description: doc?.descripcion ?? `DTE descargado del SII (${dte.tipoDTE}/${dte.folio})`,
          xmlContent: dte.xml,
          netAmount: doc?.neto ?? 0,
          ivaAmount: doc?.iva ?? 0,
          exento: doc?.exento ?? 0,
          ivaRecargo: doc?.ivaRecargo ?? 0,
          totalAmount: doc?.total ?? 0,
          tasaIVA: doc?.tasaIVA ?? null,
          formaPago: doc?.formaPago ?? null,
          status: "PENDING",
        },
      });
      created += 1;
    } catch {
      errores.push(`Folio ${dte.folio}: error al guardar.`);
    }
  }

  if (updated > 0 || created > 0) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Purchase",
      entityId: "sii-xml-download",
      summary: `Descargó ${updated + created} XML del SII (${updated} actualizados, ${created} creados) para ${periodo}.`,
    });
    revalidatePath("/facturas/compras");
    revalidatePath("/facturas");
  }

  await setFlash(
    updated + created > 0 ? "success" : "error",
    `${updated} compras actualizadas · ${created} creadas`,
    errores.length > 0 ? `Errores: ${errores.slice(0, 3).join("; ")}` : `Período ${periodo}`,
  );
  redirect("/facturas/compras");
}
