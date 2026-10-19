"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { importRows, readTabularFile, type ImportKind } from "@/lib/import";

export type ImportState =
  | { status: "error"; message: string }
  | { status: "done"; imported: number; errors: { row: number; message: string }[] }
  | undefined;

const kinds: ImportKind[] = ["purchases", "sales", "expenses"];

const entityTypeFor: Record<ImportKind, string> = {
  purchases: "Purchase",
  sales: "Sale",
  expenses: "Expense",
};

const labelFor: Record<ImportKind, string> = {
  purchases: "compras",
  sales: "ventas",
  expenses: "gastos",
};

export async function importFile(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "importar")) {
    return { status: "error", message: "No tienes permiso para importar datos." };
  }

  const kind = kinds.find((value) => value === formData.get("kind"));
  if (!kind) {
    return { status: "error", message: "Selecciona qué quieres importar." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Adjunta un archivo .xlsx o .csv." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { status: "error", message: "El archivo no puede superar los 5 MB." };
  }

  let rows;
  try {
    rows = await readTabularFile(file);
  } catch {
    return { status: "error", message: "No se pudo leer el archivo. ¿Es un .xlsx o .csv válido?" };
  }

  const result = await importRows(kind, {
    companyId: ctx.company.id,
    userId: ctx.user.id,
    ivaRate: ctx.company.ivaRate,
  }, rows);

  if (result.imported === 0) {
    return {
      status: "done",
      imported: 0,
      errors:
        result.errors.length > 0
          ? result.errors
          : [{ row: 0, message: "No se encontraron filas para importar." }],
    };
  }

  await recordAudit(ctx, {
    action: "IMPORT",
    entityType: entityTypeFor[kind],
    summary: `Importó ${result.imported} registro(s) de ${labelFor[kind]} desde «${file.name}»${
      result.errors.length > 0 ? ` (${result.errors.length} fila(s) con problemas).` : "."
    }`,
  });

  revalidatePath(`/facturas/${kind === "purchases" ? "compras" : kind}`);
  revalidatePath("/facturas");
  revalidatePath("/facturas/auditoria");

  return { status: "done", imported: result.imported, errors: result.errors };
}
