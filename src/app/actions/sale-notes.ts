"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import type { NoteKind } from "@/lib/sale-notes";

/** A qué pantalla de notas vuelve el usuario después de la acción. */
function destinoDe(kind: NoteKind) {
  return kind === "CREDIT_NOTE" ? "/facturas/ventas/nota-credito" : "/facturas/ventas/nota-debito";
}

/**
 * Relaciona una nota de crédito/débito con el documento que ajusta: una
 * factura (o boleta) o una guía de despacho, siempre del mismo cliente.
 *
 * La validación va dentro de la acción (no en la UI): un Server Action es
 * alcanzable por POST directo.
 */
export async function linkNoteToDocument(formData: FormData) {
  const schema = z.object({
    id: z.string().min(1),
    tipo: z.enum(["venta", "guia"]),
    targetId: z.string().min(1),
  });
  const parsed = schema.safeParse({
    id: String(formData.get("id") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    targetId: String(formData.get("targetId") ?? ""),
  });

  if (!parsed.success) {
    await setFlash("error", "No se pudo relacionar la nota.", "Faltan datos del documento.");
    redirect("/facturas/ventas/nota-credito");
  }

  const ctx = await requireContext("ventas");

  const nota = await db.sale.findFirst({
    where: {
      id: parsed.data.id,
      companyId: ctx.company.id,
      documentType: { in: ["CREDIT_NOTE", "DEBIT_NOTE"] },
    },
    select: { id: true, partnerId: true, documentType: true },
  });

  if (!nota) {
    await setFlash("error", "No se encontró la nota.", "Puede que se haya borrado.");
    redirect("/facturas/ventas/nota-credito");
  }

  const destinoFinal = destinoDe(nota.documentType as NoteKind);

  if (parsed.data.tipo === "venta") {
    const venta = await db.sale.findFirst({
      where: {
        id: parsed.data.targetId,
        companyId: ctx.company.id,
        partnerId: nota.partnerId,
        documentType: { in: ["INVOICE", "RECEIPT"] },
      },
      select: { id: true },
    });
    if (!venta) {
      await setFlash("error", "La factura no es de ese cliente.", "Elige una factura del mismo cliente.");
      redirect(destinoFinal);
    }
    await db.sale.update({
      where: { id: nota.id },
      data: { relatedSaleId: venta.id, relatedGuideId: null },
    });
  } else {
    const guia = await db.dispatchGuide.findFirst({
      where: { id: parsed.data.targetId, companyId: ctx.company.id, partnerId: nota.partnerId },
      select: { id: true },
    });
    if (!guia) {
      await setFlash("error", "La guía no es de ese cliente.", "Elige una guía del mismo cliente.");
      redirect(destinoFinal);
    }
    await db.sale.update({
      where: { id: nota.id },
      data: { relatedGuideId: guia.id, relatedSaleId: null },
    });
  }

  await setFlash("success", "Nota relacionada.", "Ya queda vinculada al documento que ajusta.");
  revalidatePath(destinoFinal);
  revalidatePath("/facturas/ventas/[id]", "page");
  redirect(destinoFinal);
}

/** Quita el vínculo de una nota con el documento que ajusta. */
export async function unlinkNote(formData: FormData) {
  const schema = z.object({ id: z.string().min(1) });
  const parsed = schema.safeParse({ id: String(formData.get("id") ?? "") });

  if (!parsed.success) {
    await setFlash("error", "No se pudo quitar la relación.", "Falta el id de la nota.");
    redirect("/facturas/ventas/nota-credito");
  }

  const ctx = await requireContext("ventas");

  const nota = await db.sale.findFirst({
    where: {
      id: parsed.data.id,
      companyId: ctx.company.id,
      documentType: { in: ["CREDIT_NOTE", "DEBIT_NOTE"] },
    },
    select: { id: true, documentType: true },
  });

  if (!nota) {
    await setFlash("error", "No se encontró la nota.", "Puede que se haya borrado.");
    redirect("/facturas/ventas/nota-credito");
  }

  const destinoFinal = destinoDe(nota.documentType as NoteKind);

  await db.sale.update({
    where: { id: nota.id },
    data: { relatedSaleId: null, relatedGuideId: null },
  });

  await setFlash("success", "Relación quitada.", "La nota queda sin documento relacionado.");
  revalidatePath(destinoFinal);
  revalidatePath("/facturas/ventas/[id]", "page");
  redirect(destinoFinal);
}
