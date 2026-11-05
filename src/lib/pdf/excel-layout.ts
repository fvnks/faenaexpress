/**
 * Utilidades para convertir coordenadas Excel (row, col) a puntos PDF.
 * 
 * Excel: fila 1-based, columna 1-based (A=1, B=2...)
 * PDF (react-pdf): origen top-left, puntos (1pt = 1/72 inch)
 * 
 * A4 = 595.28 x 841.89 puntos (210mm x 297mm)
 * Margen típico: 40pt (≈14mm) cada lado
 * Área imprimible: ~515pt ancho x 760pt alto
 * 
 * Conversión aproximada:
 * - Ancho columna Excel estándar (8.43 caracteres) ≈ 64pt
 * - Alto fila Excel estándar (15pt) ≈ 15pt
 * - Pero el usuario puede ajustar ancho/alto en Excel
 */

export interface ExcelCoord {
  row: number;  // 1-based
  col: number;  // 1-based (A=1)
  sheet?: string;
  style?: {
    bold?: boolean;
    color?: string;
    fontSize?: number;
    align?: "left" | "center" | "right";
  };
}

export interface PdfPosition {
  x: number;    // puntos desde izquierda
  y: number;    // puntos desde arriba
  page: number; // 1-based
}

/** Configuración de conversión Excel→PDF */
export interface ExcelToPdfConfig {
  /** Margen izquierdo en puntos */
  marginLeft: number;
  /** Margen superior en puntos */
  marginTop: number;
  /** Ancho de columna Excel por defecto (caracteres) */
  defaultColWidth: number;
  /** Alto de fila Excel por defecto (puntos) */
  defaultRowHeight: number;
  /** Factor de escala horizontal (ajuste fino) */
  scaleX: number;
  /** Factor de escala vertical (ajuste fino) */
  scaleY: number;
  /** Ancho de página A4 en puntos */
  pageWidth: number;
  /** Alto de página A4 en puntos */
  pageHeight: number;
}

/** Configuración por defecto para A4 con márgenes estándar */
export const DEFAULT_EXCEL_TO_PDF_CONFIG: ExcelToPdfConfig = {
  marginLeft: 40,
  marginTop: 40,
  defaultColWidth: 8.43,    // ancho estándar Excel en caracteres
  defaultRowHeight: 15,     // alto estándar Excel en puntos
  scaleX: 4.0,              // ~1 char ≈ 4pt (ajustado: 8.43 chars * 4 ≈ 34pt por columna; ~17 columnas en 515pt)
  scaleY: 1.0,              // 1 row ≈ 15pt
  pageWidth: 595.28,
  pageHeight: 841.89,
};

/**
 * Convierte coordenadas Excel (row, col) a posición PDF (x, y, page).
 * 
 * Nota: Esta es una aproximación. El usuario debe ajustar en Excel
 * y ver el resultado en PDF para afinar posiciones.
 */
export function excelToPdfPosition(
  coord: ExcelCoord,
  config: Partial<ExcelToPdfConfig> = {}
): PdfPosition {
  const cfg = { ...DEFAULT_EXCEL_TO_PDF_CONFIG, ...config };
  
  // Columna: margen izquierdo + (col-1) * ancho_estimado_columna
  // Usamos scaleX para convertir "unidades de columna" a puntos
  const colWidthPt = cfg.defaultColWidth * cfg.scaleX;
  const x = cfg.marginLeft + (coord.col - 1) * colWidthPt;
  
  // Fila: margen superior + (row-1) * alto_estimado_fila
  const rowHeightPt = cfg.defaultRowHeight * cfg.scaleY;
  const y = cfg.marginTop + (coord.row - 1) * rowHeightPt;
  
  // Página: por ahora todo en página 1, pero se puede extender
  // Si y > pageHeight - marginBottom, pasar a página siguiente
  const page = Math.max(1, Math.floor(y / cfg.pageHeight) + 1);
  const yInPage = y % cfg.pageHeight;
  
  return { x, y: yInPage, page };
}

/**
 * Convierte un layout completo (mapa campo -> ExcelCoord) a posiciones PDF.
 */
export function layoutToPdfPositions(
  layout: Record<string, ExcelCoord>,
  config?: Partial<ExcelToPdfConfig>
): Record<string, PdfPosition> {
  const result: Record<string, PdfPosition> = {};
  for (const [campo, coord] of Object.entries(layout)) {
    result[campo] = excelToPdfPosition(coord, config);
  }
  return result;
}

/**
 * Ajuste fino interactivo: dado un campo y su posición deseada en PDF (mm),
 * calcula la coordenada Excel aproximada.
 */
export function pdfToExcelCoord(
  xMm: number,
  yMm: number,
  config: Partial<ExcelToPdfConfig> = {}
): ExcelCoord {
  const cfg = { ...DEFAULT_EXCEL_TO_PDF_CONFIG, ...config };
  const xPt = xMm * 72 / 25.4;  // mm a puntos
  const yPt = yMm * 72 / 25.4;
  
  const colWidthPt = cfg.defaultColWidth * cfg.scaleX;
  const rowHeightPt = cfg.defaultRowHeight * cfg.scaleY;
  
  const col = Math.max(1, Math.round((xPt - cfg.marginLeft) / colWidthPt) + 1);
  const row = Math.max(1, Math.round((yPt - cfg.marginTop) / rowHeightPt) + 1);
  
  return { row, col };
}