import type { DocumentType, PaymentMethod } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { computeIva, computeTotal } from "@/lib/money";
import { normalizeRut } from "@/lib/rut";

export type CellValue = string | number | Date | null;

export type ImportKind = "purchases" | "sales" | "expenses";

export type ImportResult = {
  imported: number;
  errors: { row: number; message: string }[];
};

type ImportContext = { companyId: string; userId: string; ivaRate: number };

// --- Lectura del archivo (Excel .xlsx o CSV) ---------------------------------

function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof rich.text === "string") return rich.text;
    if (Array.isArray(rich.richText)) return rich.richText.map((part) => part.text).join("");
    if (rich.result !== undefined) return normalizeCell(rich.result);
  }
  return String(value);
}

function parseCsv(text: string): CellValue[][] {
  const content = text.replace(/^\uFEFF/, "");
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: CellValue[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const flushField = () => {
    row.push(field);
    field = "";
  };
  const flushRow = () => {
    rows.push(row.map((value) => (value.trim() === "" ? null : value)));
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (quoted) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      flushField();
    } else if (char === "\n") {
      flushField();
      flushRow();
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    flushField();
    flushRow();
  }
  return rows;
}

export async function readTabularFile(file: File): Promise<CellValue[][]> {
  const name = file.name.toLowerCase();
  const array = await file.arrayBuffer();

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(Buffer.from(array).toString("utf8"));
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  // exceljs tipa su propio `Buffer` como `ArrayBuffer`; le pasamos el ArrayBuffer tal cual.
  await workbook.xlsx.load(array);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: CellValue[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const raw = row.values as unknown[];
    const values: CellValue[] = [];
    for (let i = 1; i < raw.length; i += 1) {
      values.push(normalizeCell(raw[i]));
    }
    rows.push(values);
  });
  return rows;
}

// --- Helpers de celdas -------------------------------------------------------

function normalizeKey(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function findColumn(headers: CellValue[], ...names: string[]): number {
  const wanted = names.map(normalizeKey);
  for (let i = 0; i < headers.length; i += 1) {
    if (wanted.includes(normalizeKey(String(headers[i] ?? "")))) return i;
  }
  return -1;
}

function cellAt(row: CellValue[], index: number): CellValue {
  if (index < 0) return null;
  return row[index] ?? null;
}

function toInt(value: CellValue): number | null {
  if (value === null) return null;
  if (typeof value === "number") return Math.round(value);
  const digits = String(value).replace(/[^\d-]/g, "");
  if (digits === "" || digits === "-") return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: CellValue): string {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toDateValue(value: CellValue): Date | null {
  if (value === null) return null;
  if (value instanceof Date) return toUtcMidnight(value);
  if (typeof value === "number") {
    // Fecha serial de Excel (días desde 1899-12-30).
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(text);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    return new Date(Date.UTC(year, Number(dmy[2]) - 1, Number(dmy[1])));
  }
  return null;
}

function toDocumentType(value: CellValue, fallback: DocumentType = "INVOICE"): DocumentType {
  const map: Record<string, DocumentType> = {
    factura: "INVOICE",
    invoice: "INVOICE",
    boleta: "RECEIPT",
    receipt: "RECEIPT",
    notadecredito: "CREDIT_NOTE",
    creditnote: "CREDIT_NOTE",
    notadedebito: "DEBIT_NOTE",
    debitnote: "DEBIT_NOTE",
    otro: "OTHER",
    other: "OTHER",
  };
  return map[normalizeKey(toText(value))] ?? fallback;
}

function toStatus(value: CellValue, paidWords: string[]): "PENDING" | "PAID" {
  return paidWords.includes(normalizeKey(toText(value))) ? "PAID" : "PENDING";
}

function toMethod(value: CellValue): PaymentMethod {
  const map: Record<string, PaymentMethod> = {
    efectivo: "CASH",
    cash: "CASH",
    transferencia: "TRANSFER",
    transfer: "TRANSFER",
    tarjetadecredito: "CREDIT_CARD",
    creditcard: "CREDIT_CARD",
    tarjetadedebito: "DEBIT_CARD",
    debitcard: "DEBIT_CARD",
    cheque: "CHECK",
    check: "CHECK",
    otro: "OTHER",
    other: "OTHER",
  };
  return map[normalizeKey(toText(value))] ?? "OTHER";
}

function toBool(value: CellValue): boolean {
  return ["si", "yes", "true", "1", "x"].includes(normalizeKey(toText(value)));
}

// --- Resolución de catálogos -------------------------------------------------

type Maps = {
  partnersByRut: Map<string, string>;
  partnersByName: Map<string, string>;
  categories: Map<string, string>;
  areas: Map<string, string>;
  salespeople: Map<string, string>;
  payers: Map<string, string>;
};

function byName<T extends { id: string; name: string }>(rows: T[]): Map<string, string> {
  return new Map(rows.map((row) => [normalizeKey(row.name), row.id]));
}

async function loadMaps(companyId: string): Promise<Maps> {
  const [partners, categories, areas, salespeople, payers] = await Promise.all([
    db.partner.findMany({ where: { companyId }, select: { id: true, name: true, rut: true } }),
    db.category.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.area.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.salesperson.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.payer.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);

  const partnersByRut = new Map<string, string>();
  const partnersByName = new Map<string, string>();
  for (const partner of partners) {
    if (partner.rut) partnersByRut.set(normalizeRut(partner.rut), partner.id);
    partnersByName.set(normalizeKey(partner.name), partner.id);
  }

  return {
    partnersByRut,
    partnersByName,
    categories: byName(categories),
    areas: byName(areas),
    salespeople: byName(salespeople),
    payers: byName(payers),
  };
}

function resolvePartner(maps: Maps, rut: string, name: string): string | null {
  if (rut) {
    const byRut = maps.partnersByRut.get(normalizeRut(rut));
    if (byRut) return byRut;
  }
  if (name) {
    const name_ = maps.partnersByName.get(normalizeKey(name));
    if (name_) return name_;
  }
  return null;
}

function resolveName(map: Map<string, string>, value: string): string | null {
  return value ? (map.get(normalizeKey(value)) ?? null) : null;
}

// --- Importación por tipo ----------------------------------------------------

const PAID_PURCHASE = ["pagada", "pagado", "si", "yes", "true", "1", "pago"];
const PAID_SALE = ["cobrada", "cobrado", "pagada", "pagado", "si", "yes", "true", "1"];

export async function importRows(
  kind: ImportKind,
  ctx: ImportContext,
  rows: CellValue[][],
): Promise<ImportResult> {
  if (rows.length === 0) {
    return { imported: 0, errors: [{ row: 0, message: "El archivo está vacío." }] };
  }

  const [headers, ...data] = rows;
  const maps = await loadMaps(ctx.companyId);
  const errors: ImportResult["errors"] = [];
  let imported = 0;

  if (kind === "purchases" || kind === "sales") {
    const partnerCol = findColumn(headers, "proveedor", "cliente", "tercero", "razonsocial", "nombre");
    const rutCol = findColumn(headers, "rut", "rutproveedor", "rutcliente");
    const docTypeCol = findColumn(headers, "tipodocumento", "tipodedocumento", "tipodoc", "tipo", "documento");
    const docNumberCol = findColumn(
      headers,
      "folio",
      "numerodocumento",
      "numerofactura",
      "numero",
      "nrodocumento",
      "ndocumento",
      "nfactura",
    );
    const refCol = findColumn(headers, "folioreferencia", "referencia", "foliooriginal");
    const dateCol = findColumn(headers, "fecha", "fechaemision");
    const dueCol = findColumn(headers, "vencimiento", "fechavencimiento");
    const categoryCol = findColumn(headers, "categoria");
    const areaCol = findColumn(headers, "area");
    const netCol = findColumn(headers, "neto", "montoneto", "monto");
    const ivaCol = findColumn(headers, "iva", "montoiva");
    const statusCol = findColumn(
      headers,
      "estado",
      "estadopago",
      "estadodepago",
      "pagada",
      "pagado",
      "cobrada",
      "cobrado",
    );
    const methodCol = findColumn(
      headers,
      "formadepago",
      "formapago",
      "metododepago",
      "metodopago",
      "mediopago",
      "tipopago",
      "pagocon",
    );
    const descCol = findColumn(headers, "descripcion", "detalle", "glosa");
    const notesCol = findColumn(headers, "notas", "observaciones");
    const salespersonCol = findColumn(headers, "vendedor", "salesperson");
    const retentionCol = findColumn(headers, "retencion", "montoretencion");

    if (partnerCol < 0 || dateCol < 0 || netCol < 0) {
      return {
        imported: 0,
        errors: [
          {
            row: 1,
            message:
              "Faltan columnas obligatorias. Se necesitan al menos «Proveedor/Cliente», «Fecha» y «Neto».",
          },
        ],
      };
    }

    for (let i = 0; i < data.length; i += 1) {
      const row = data[i];
      const rowNumber = i + 2;
      try {
        const partnerName = toText(cellAt(row, partnerCol));
        const partnerRut = toText(cellAt(row, rutCol));
        const partnerId = resolvePartner(maps, partnerRut, partnerName);
        if (!partnerId) {
          errors.push({
            row: rowNumber,
            message: `No se encontró «${partnerName || partnerRut || "sin nombre"}» entre los terceros.`,
          });
          continue;
        }

        const date = toDateValue(cellAt(row, dateCol));
        if (!date) {
          errors.push({ row: rowNumber, message: "Fecha inválida o vacía." });
          continue;
        }

        const net = toInt(cellAt(row, netCol));
        if (net === null) {
          errors.push({ row: rowNumber, message: "Monto neto inválido o vacío." });
          continue;
        }

        const iva = toInt(cellAt(row, ivaCol)) ?? computeIva(net, ctx.ivaRate);
        const documentType = toDocumentType(cellAt(row, docTypeCol));
        const reference = toText(cellAt(row, refCol));
        if (
          (documentType === "CREDIT_NOTE" || documentType === "DEBIT_NOTE") &&
          reference === ""
        ) {
          errors.push({
            row: rowNumber,
            message: "Las notas de crédito o débito deben indicar el folio de referencia.",
          });
          continue;
        }

        const base = {
          companyId: ctx.companyId,
          createdById: ctx.userId,
          partnerId,
          categoryId: resolveName(maps.categories, toText(cellAt(row, categoryCol))),
          areaId: resolveName(maps.areas, toText(cellAt(row, areaCol))),
          documentType,
          documentNumber: toText(cellAt(row, docNumberCol)) || null,
          referenceDocumentNumber: reference || null,
          date,
          description: toText(cellAt(row, descCol)) || null,
          netAmount: net,
          ivaAmount: iva,
          totalAmount: computeTotal(net, iva),
          notes: toText(cellAt(row, notesCol)) || null,
        };

        if (kind === "purchases") {
          const status = toStatus(cellAt(row, statusCol), PAID_PURCHASE);
          await db.purchase.create({
            data: {
              ...base,
              dueDate: toDateValue(cellAt(row, dueCol)),
              status,
              paymentMethod: status === "PAID" ? toMethod(cellAt(row, methodCol)) : null,
              paymentDate: status === "PAID" ? (toDateValue(cellAt(row, dueCol)) ?? date) : null,
            },
          });
        } else {
          const status = toStatus(cellAt(row, statusCol), PAID_SALE);
          const retention = toInt(cellAt(row, retentionCol)) ?? 0;
          await db.sale.create({
            data: {
              ...base,
              salespersonId: resolveName(maps.salespeople, toText(cellAt(row, salespersonCol))),
              retentionAmount: retention,
              status,
              paymentMethod: null,
              paymentDate: status === "PAID" ? date : null,
            },
          });
        }
        imported += 1;
      } catch {
        errors.push({ row: rowNumber, message: "No se pudo guardar la fila." });
      }
    }
  } else {
    const dateCol = findColumn(headers, "fecha");
    const descCol = findColumn(headers, "descripcion", "detalle", "glosa");
    const categoryCol = findColumn(headers, "categoria");
    const areaCol = findColumn(headers, "area");
    const docNumberCol = findColumn(headers, "folio", "documento", "numerodocumento");
    const methodCol = findColumn(
      headers,
      "formadepago",
      "formapago",
      "metododepago",
      "metodopago",
      "mediodepago",
      "mediopago",
      "tipopago",
    );
    const netCol = findColumn(headers, "neto", "montoneto", "monto");
    const ivaCol = findColumn(headers, "iva", "montoiva");
    const payerCol = findColumn(headers, "pagador", "quienpago", "pagadopor", "pagocon");
    const reimbursedCol = findColumn(headers, "reembolsado", "reembolso");
    const notesCol = findColumn(headers, "notas", "observaciones");

    if (descCol < 0 || dateCol < 0 || netCol < 0 || payerCol < 0) {
      return {
        imported: 0,
        errors: [
          {
            row: 1,
            message:
              "Faltan columnas obligatorias. Se necesitan al menos «Fecha», «Descripción», «Neto» y «Pagador».",
          },
        ],
      };
    }

    for (let i = 0; i < data.length; i += 1) {
      const row = data[i];
      const rowNumber = i + 2;
      try {
        const description = toText(cellAt(row, descCol));
        if (description === "") {
          errors.push({ row: rowNumber, message: "Falta la descripción." });
          continue;
        }

        const date = toDateValue(cellAt(row, dateCol));
        if (!date) {
          errors.push({ row: rowNumber, message: "Fecha inválida o vacía." });
          continue;
        }

        const net = toInt(cellAt(row, netCol));
        if (net === null) {
          errors.push({ row: rowNumber, message: "Monto neto inválido o vacío." });
          continue;
        }

        const payerName = toText(cellAt(row, payerCol));
        const payerId = resolveName(maps.payers, payerName);
        if (!payerId) {
          errors.push({
            row: rowNumber,
            message: `No se encontró el pagador «${payerName || "sin nombre"}».`,
          });
          continue;
        }

        const iva = toInt(cellAt(row, ivaCol)) ?? computeIva(net, ctx.ivaRate);
        const reimbursed = toBool(cellAt(row, reimbursedCol));

        await db.expense.create({
          data: {
            companyId: ctx.companyId,
            createdById: ctx.userId,
            date,
            description,
            categoryId: resolveName(maps.categories, toText(cellAt(row, categoryCol))),
            areaId: resolveName(maps.areas, toText(cellAt(row, areaCol))),
            documentNumber: toText(cellAt(row, docNumberCol)) || null,
            paymentMethod: toMethod(cellAt(row, methodCol)),
            netAmount: net,
            ivaAmount: iva,
            totalAmount: computeTotal(net, iva),
            paidById: payerId,
            reimbursed,
            reimbursedAt: reimbursed ? new Date() : null,
            notes: toText(cellAt(row, notesCol)) || null,
          },
        });
        imported += 1;
      } catch {
        errors.push({ row: rowNumber, message: "No se pudo guardar la fila." });
      }
    }
  }

  return { imported, errors };
}
