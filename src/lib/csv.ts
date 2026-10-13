// Exportación CSV pensada para abrir en Excel (separador «;», BOM UTF-8 y saltos CRLF).
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function csvDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
