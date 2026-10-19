import JSZip from "jszip";

import { requireContext, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv, csvDate } from "@/lib/csv";

// Exporta TODOS los datos de la empresa activa en un ZIP con un CSV por tabla.
// Sirve para portabilidad (ley 21.719), respaldo puntual y como antídoto contra el
// lock-in: el cliente se puede llevar todo lo suyo cuando quiera.
//
// Solo ADMIN de la empresa activa. No exporta credenciales cifradas (viven en
// Company) ni passwordHash (viven en User): esas tablas no van.
export async function GET() {
  const ctx = await requireContext();
  if (!isAdmin(ctx)) {
    return new Response("Solo un administrador puede exportar los datos.", { status: 403 });
  }
  const companyId = ctx.company.id;

  // Un CSV por tabla: cabeceras desde las keys del primer registro, filas serializadas.
  const objectsToCsv = (objects: Record<string, unknown>[]): string => {
    if (objects.length === 0) return toCsv([], []);
    const headers = Object.keys(objects[0]);
    const rows = objects.map((o) => headers.map((h) => serialize(o[h])));
    return toCsv(headers, rows);
  };
  const serialize = (value: unknown): string | number => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    return value as string | number;
  };

  const zip = new JSZip();

  const tablas: { nombre: string; datos: () => Promise<Record<string, unknown>[]> }[] = [
    { nombre: "compras", datos: () => db.purchase.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "ventas", datos: () => db.sale.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "gastos", datos: () => db.expense.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "terceros", datos: () => db.partner.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "categorias", datos: () => db.category.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "areas", datos: () => db.area.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "vendedores", datos: () => db.salesperson.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "pagadores", datos: () => db.payer.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "trabajadores", datos: () => db.worker.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "remuneraciones", datos: () => db.remuneration.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "ausencias", datos: () => db.absence.findMany({ where: { companyId }, orderBy: { startDate: "asc" } }) },
    { nombre: "productos", datos: () => db.product.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "categorias-de-producto", datos: () => db.productCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "unidades", datos: () => db.unit.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "bodegas", datos: () => db.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" } }) },
    { nombre: "movimientos-de-inventario", datos: () => db.stockMovement.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "conteos-de-inventario", datos: () => db.stockCount.findMany({ where: { companyId }, orderBy: { date: "desc" } }) },
    { nombre: "lotes", datos: () => db.productLot.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }) },
    { nombre: "guias-de-despacho", datos: () => db.dispatchGuide.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "comisiones", datos: () => db.commissionEntry.findMany({ where: { companyId }, orderBy: { period: "asc" } }) },
    { nombre: "cuentas-bancarias", datos: () => db.bankAccount.findMany({ where: { companyId }, orderBy: { label: "asc" } }) },
    { nombre: "movimientos-bancarios", datos: () => db.bankMovement.findMany({ where: { companyId }, orderBy: { date: "asc" } }) },
    { nombre: "conciliaciones", datos: () => db.reconciliation.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }) },
    { nombre: "auditoria", datos: () => db.auditLog.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }) },
  ];

  let total = 0;
  for (const tabla of tablas) {
    const datos = await tabla.datos();
    zip.file(`${tabla.nombre}.csv`, objectsToCsv(datos));
    total += datos.length;
  }

  const hoy = csvDate(new Date());
  zip.file(
    "LEEME.txt",
    [
      `Exportación de datos de ${ctx.company.name}`,
      `Generada el ${new Date().toLocaleString("es-CL")}`,
      "",
      `Contiene ${tablas.length} tablas y ${total} registros en formato CSV`,
      "(separador «;», codificación UTF-8 con BOM, saltos CRLF: abre directo en Excel).",
      "",
      "No incluye credenciales cifradas del SII/Defontana ni contraseñas de usuarios.",
      "Contexto fiscal: Chile, montos en CLP, IVA según la configuración de la empresa.",
    ].join("\r\n"),
  );

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([buffer], { type: "application/zip" });
  const slug = ctx.company.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new Response(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="datos-${slug}-${hoy}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
