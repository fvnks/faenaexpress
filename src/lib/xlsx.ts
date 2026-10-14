import ExcelJS from "exceljs";

export type XlsxColumn = {
  header: string;
  width?: number;
  style?: "text" | "currency" | "number" | "date";
};

export type StyledSheetOptions = {
  title: string;
  subtitle?: string;
  columns: XlsxColumn[];
  rows: (string | number | Date | null | undefined)[][];
  totalRow?: (string | number | null | undefined)[];
  accentColor?: string;
};

const NAVY = "1F3864";
const GREEN = "2D6A4F";
const totalFill = "EAF0F8";
const zebraFill = "F4F7FB";

function thinBorder() {
  const color = { argb: "C9D4E3" };
  return {
    top: { style: "thin" as const, color },
    left: { style: "thin" as const, color },
    bottom: { style: "thin" as const, color },
    right: { style: "thin" as const, color },
  };
}

export function createWorkbook(_title?: string): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  void _title;
  workbook.creator = "Facturas";
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}

export function addStyledSheet(workbook: ExcelJS.Workbook, name: string, options: StyledSheetOptions) {
  const accent = options.accentColor ?? GREEN;
  const sheetName = name.slice(0, 31).replace(/[[\]*?:\\/]/g, "");
  const worksheet = workbook.addWorksheet(sheetName);
  const columnCount = options.columns.length;

  worksheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = worksheet.getRow(1).getCell(1);
  titleCell.value = options.title;
  titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  worksheet.getRow(1).height = 30;

  let headerRowNumber = 2;
  if (options.subtitle) {
    worksheet.mergeCells(2, 1, 2, columnCount);
    const subtitleCell = worksheet.getRow(2).getCell(1);
    subtitleCell.value = options.subtitle;
    subtitleCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "404040" } };
    subtitleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    worksheet.getRow(2).height = 15;
    headerRowNumber = 3;
  }

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 24;
  options.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });

  worksheet.columns = options.columns.map((column) => ({
    width: column.width ?? Math.max(15, column.header.length + 5),
  }));

  let rowNumber = headerRowNumber + 1;
  options.rows.forEach((row, index) => {
    const worksheetRow = worksheet.getRow(rowNumber);
    row.forEach((value, columnIndex) => {
      const cell = worksheetRow.getCell(columnIndex + 1);
      cell.value = value ?? null;
      cell.border = thinBorder();
      const style = options.columns[columnIndex]?.style ?? "text";
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: style === "text" ? "left" : "right",
      };
      if (style === "currency" || style === "number") {
        cell.numFmt = '#,##0';
      }
      if (style === "date") {
        cell.numFmt = "dd/mm/yyyy";
      }
    });

    if (index % 2 === 1) {
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
        worksheetRow.getCell(columnIndex).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: zebraFill },
        };
      }
    }
    rowNumber += 1;
  });

  if (options.totalRow) {
    const totalRow = worksheet.getRow(rowNumber);
    totalRow.height = 20;
    options.totalRow.forEach((value, columnIndex) => {
      const cell = totalRow.getCell(columnIndex + 1);
      cell.value = value ?? null;
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: NAVY } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: totalFill } };
      cell.border = thinBorder();
      const style = options.columns[columnIndex]?.style ?? "text";
      cell.alignment = { vertical: "middle", horizontal: style === "text" ? "left" : "right" };
      if (style === "currency" || style === "number") {
        cell.numFmt = '#,##0';
      }
    });
    rowNumber += 1;
  }

  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  if (options.rows.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber + options.rows.length, column: columnCount },
    };
  }
  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
  };

  return worksheet;
}

export async function xlsxResponse(filename: string, workbook: ExcelJS.Workbook): Promise<Response> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
