"use server";

import { Prisma, type ObraStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { getActiveMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

/** Imputa un documento de Facturas a la obra para que alimente el costo real.
 *  CostoObra.sourceType + sourceId es UNIQUE: el mismo documento no puede
 *  contarse dos veces aunque se impute desde dos pestañas. */
async function imputar(
  sourceType: "PURCHASE" | "EXPENSE",
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext(sourceType === "PURCHASE" ? "compras" : "gastos");
  if (!obraCanWrite(ctx, sourceType === "PURCHASE" ? "compras" : "gastos")) {
    return { error: "Tu rol no permite imputar documentos a la obra." };
  }

  const active = await getActiveMembership();
  if (!active) return { error: "No tienes empresa activa para buscar el documento." };
  const companyId = active.company.id;
  const sourceId = String(formData.get("sourceId") ?? "");
  const partidaId = String(formData.get("partidaId") ?? "");
  if (!sourceId) return { error: "Selecciona un documento." };

  const documento =
    sourceType === "PURCHASE"
      ? await db.purchase.findFirst({
          where: { id: sourceId, companyId },
          select: {
            id: true, totalAmount: true, date: true, documentNumber: true,
            partner: { select: { name: true } },
          },
        })
      : await db.expense.findFirst({
          where: { id: sourceId, companyId },
          select: { id: true, totalAmount: true, date: true, description: true },
        });
  if (!documento) return { error: "El documento no existe o no pertenece a tu empresa." };

  if (partidaId) {
    const partida = await db.partida.findFirst({
      where: { id: partidaId, obraId: ctx.obra.id, estado: "VIGENTE" },
      select: { id: true },
    });
    if (!partida) return { error: "La partida no existe o está anulada." };
  }

  const descripcion =
    sourceType === "PURCHASE"
      ? `Compra ${(documento as { documentNumber: string | null }).documentNumber ?? ""} · ${(documento as { partner: { name: string } }).partner.name}`.trim()
      : `Gasto · ${(documento as { description: string }).description}`.slice(0, 300);

  try {
    await db.costoObra.create({
      data: {
        obraId: ctx.obra.id,
        partidaId: partidaId || null,
        sourceType,
        sourceId,
        descripcion: descripcion.slice(0, 300),
        monto: documento.totalAmount,
        fecha: documento.date,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ese documento ya está imputado en otra obra." };
    }
    throw error;
  }

  const rutas = ["/obras/compras", "/obras/gastos", "/obras/presupuesto", "/obras/reportes", "/obras/documentos"];
  for (const ruta of rutas) revalidatePath(ruta);
  return { ok: true, message: "Documento imputado al costo real de la obra." };
}

export async function imputarCompra(_prev: ObraActionState, formData: FormData) {
  return imputar("PURCHASE", formData);
}

export async function imputarGasto(_prev: ObraActionState, formData: FormData) {
  return imputar("EXPENSE", formData);
}

/** Desvincular un documento: el costo deja de contar, el documento sigue en Facturas. */
export async function desimputarCosto(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("compras");
  if (!obraCanWrite(ctx, "compras")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.costoObra.deleteMany({ where: { id, obraId: ctx.obra.id } });
  for (const ruta of ["/obras/compras", "/obras/gastos", "/obras/presupuesto", "/obras/reportes", "/obras/documentos"]) {
    revalidatePath(ruta);
  }
}

/** Editar los datos de la obra. Solo dirección de obra. */
export async function actualizarObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("administracion");
  if (!obraCanWrite(ctx, "administracion")) return { error: "Solo la dirección puede editar la obra." };

  const nombre = String(formData.get("name") ?? "").trim();
  if (nombre.length < 2) return { error: "El nombre de la obra es obligatorio." };
  const fecha = (campo: string) => {
    const valor = String(formData.get(campo) ?? "").trim();
    return valor ? new Date(`${valor}T12:00:00.000Z`) : null;
  };
  const status = String(formData.get("status") ?? "PLANIFICADA");
  const estados: ObraStatus[] = ["PLANIFICADA", "EN_CURSO", "SUSPENDIDA", "TERMINADA"];
  if (!estados.includes(status as ObraStatus)) return { error: "Estado de obra no válido." };
  const inicio = fecha("fechaInicio");
  const termino = fecha("fechaTermino");
  if (inicio && termino && termino < inicio) {
    return { error: "La fecha de término no puede ser anterior al inicio." };
  }

  await db.obra.update({
    where: { id: ctx.obra.id },
    data: {
      name: nombre.slice(0, 160),
      code: String(formData.get("code") ?? "").trim().slice(0, 40) || null,
      mandante: String(formData.get("mandante") ?? "").trim().slice(0, 160) || null,
      rutMandante: String(formData.get("rutMandante") ?? "").trim().slice(0, 20) || null,
      direccion: String(formData.get("direccion") ?? "").trim().slice(0, 250) || null,
      comuna: String(formData.get("comuna") ?? "").trim().slice(0, 80) || null,
      fechaInicio: inicio,
      fechaTermino: termino,
      status: status as ObraStatus,
    },
  });

  revalidatePath("/obras");
  revalidatePath("/obras/administracion");
  return { ok: true, message: "Datos de la obra actualizados." };
}
