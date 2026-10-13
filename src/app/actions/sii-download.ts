"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canWrite, requireContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { exploreSiiPortal, downloadReceivedDtes } from "@/lib/sii/download-dtes";

/**
 * Explora el portal del SII para descubrir dónde están los DTE recibidos.
 * Solo para desarrollo: muestra el mapa de URLs del portal.
 */
export async function exploreSiiPortalAction(): Promise<void> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    await setFlash("error", "No tienes permiso para gestionar el SII.");
    revalidatePath("/dashboard/compras");
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
  revalidatePath("/dashboard/compras");
}

/**
 * Descarga los XML DTE recibidos del SII para un período y los adjunta
 * a las compras existentes (matching por folio).
 */
export async function downloadSiiXmlForPurchases(formData: FormData): Promise<void> {
  const ctx = await requireContext("importar");
  if (!canWrite(ctx, "importar")) {
    await setFlash("error", "No tienes permiso para gestionar el SII.");
    redirect("/dashboard/compras");
  }

  const periodo = String(formData.get("periodo") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    await setFlash("error", "Período inválido", "Usa el formato AAAA-MM.");
    redirect("/dashboard/compras");
  }

  const result = await downloadReceivedDtes(ctx.company.id, periodo);

  if (result.error) {
    await setFlash("error", "Descarga de XMLs del SII", result.error);
    redirect("/dashboard/compras");
  }

  if (result.dtes.length === 0) {
    await setFlash("success", "Sin XMLs nuevos", `No se encontraron XMLs para ${periodo}.`);
    redirect("/dashboard/compras");
  }

  // Matching por folio contra compras existentes sin XML.
  let updated = 0;
  let created = 0;
  const errores: string[] = [];

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
      } else {
        // Si no existe la compra, la creamos con el XML.
        // El proveedor se busca por RUT emisor.
        const rutNormalizado = dte.rutEmisor.replace(/[.\-\s]/g, "");
        const partner = await db.partner.findFirst({
          where: { companyId: ctx.company.id, rut: { contains: rutNormalizado.slice(0, 8) } },
        });

        if (partner) {
          await db.purchase.create({
            data: {
              companyId: ctx.company.id,
              createdById: ctx.user.id,
              partnerId: partner.id,
              documentType: dte.tipoDTE === 56 ? "DEBIT_NOTE" : "INVOICE",
              documentNumber: dte.folio,
              date: new Date(),
              description: `DTE descargado del SII (${dte.tipoDTE}/${dte.folio})`,
              xmlContent: dte.xml,
              netAmount: 0,
              ivaAmount: 0,
              totalAmount: 0,
              status: "PENDING",
            },
          });
          created += 1;
        } else {
          errores.push(`Folio ${dte.folio}: proveedor RUT ${dte.rutEmisor} no encontrado.`);
        }
      }
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
    revalidatePath("/dashboard/compras");
    revalidatePath("/dashboard");
  }

  await setFlash(
    updated + created > 0 ? "success" : "error",
    `${updated} compras actualizadas · ${created} creadas`,
    errores.length > 0 ? `Errores: ${errores.slice(0, 3).join("; ")}` : `Período ${periodo}`,
  );
  redirect("/dashboard/compras");
}
