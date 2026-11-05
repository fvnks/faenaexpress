import ExcelJS from "exceljs";

// Campos configurables de la plantilla de factura, compartidos entre la UI,
// la descarga en Excel y la importación. Es la única fuente de verdad para los
// flags que el PDF respeta (ver `src/lib/pdf/vendor/.../invoice-*.tsx`).
//
// El orden de los campos define el orden en que aparecen los bloques del PDF;
// la visibilidad (true/false) decide si se imprimen.

export const CAMPOS_PLANTILLA: Array<{
  campo: string;
  etiqueta: string;
  porDefecto: boolean;
}> = [
  { campo: "mostrarEmpresa", etiqueta: "Nombre de la empresa", porDefecto: true },
  { campo: "mostrarRUT", etiqueta: "RUT del emisor", porDefecto: true },
  { campo: "mostrarDireccion", etiqueta: "Dirección y giro", porDefecto: true },
  { campo: "mostrarTelefono", etiqueta: "Teléfono", porDefecto: true },
  { campo: "mostrarCorreo", etiqueta: "Correo y sitio web", porDefecto: true },
  { campo: "mostrarReceptor", etiqueta: "Receptor", porDefecto: true },
  { campo: "mostrarRUTReceptor", etiqueta: "RUT del receptor", porDefecto: true },
  { campo: "mostrarDireccionReceptor", etiqueta: "Dirección del receptor", porDefecto: true },
  { campo: "mostrarFechaEmision", etiqueta: "Fecha de emisión", porDefecto: true },
  { campo: "mostrarFechaVencimiento", etiqueta: "Fecha de vencimiento", porDefecto: true },
  { campo: "mostrarFolio", etiqueta: "Folio", porDefecto: true },
  { campo: "mostrarTipoDocumento", etiqueta: "Tipo de documento", porDefecto: true },
  { campo: "mostrarItems", etiqueta: "Ítems (detalle)", porDefecto: true },
  { campo: "mostrarTotales", etiqueta: "Totales y timbre", porDefecto: true },
  { campo: "mostrarRetencion", etiqueta: "Retención", porDefecto: true },
  { campo: "mostrarExento", etiqueta: "Exento", porDefecto: true },
  { campo: "mostrarRecargo", etiqueta: "Recargo IVA", porDefecto: true },
  { campo: "mostrarFormaPago", etiqueta: "Forma de pago", porDefecto: true },
  { campo: "mostrarPagado", etiqueta: "Pagado", porDefecto: true },
  { campo: "mostrarPendiente", etiqueta: "Pendiente de pago", porDefecto: true },
  { campo: "mostrarImporteLetras", etiqueta: "Importe en letras", porDefecto: true },
  // Documentos de referencia de la venta/compra: OC (801) y guía de despacho (52).
  { campo: "mostrarReferencias", etiqueta: "Documentos de referencia (OC, guía)", porDefecto: true },
  // Vendedor responsable de la venta (ventas).
  { campo: "mostrarVendedor", etiqueta: "Vendedor", porDefecto: true },
  // N° de Orden de Servicio (HES) asociado al documento (servicios).
  { campo: "mostrarHES", etiqueta: "N° de Orden de Servicio (HES)", porDefecto: true },
  // Nuevos campos del DTE
  { campo: "mostrarCdgVendedor", etiqueta: "Código de vendedor (emisor)", porDefecto: false },
  { campo: "mostrarTipoDespacho", etiqueta: "Tipo de despacho", porDefecto: false },
  { campo: "mostrarIndServicio", etiqueta: "Indicador de servicio", porDefecto: false },
  { campo: "mostrarTpoTranVenta", etiqueta: "Tipo de transacción de venta", porDefecto: false },
  { campo: "mostrarCdgIntRecep", etiqueta: "Código interno receptor", porDefecto: false },
  { campo: "mostrarDirPostal", etiqueta: "Dirección postal receptor", porDefecto: false },
  { campo: "mostrarCmnaPostal", etiqueta: "Comuna postal receptor", porDefecto: false },
  { campo: "mostrarCiudadPostal", etiqueta: "Ciudad postal receptor", porDefecto: false },
  { campo: "mostrarUnidadItem", etiqueta: "Unidad de medida (ítems)", porDefecto: false },
  { campo: "mostrarCodigoItem", etiqueta: "Código de item (ítems)", porDefecto: false },
];

/** Todos los campos conocidos de la plantilla. */
export const CAMPOS_PLANTILLA_KEYS: string[] = CAMPOS_PLANTILLA.map((c) => c.campo);

/** ¿Es un campo conocido de la plantilla? */
export function esCampoPlantillaValido(campo: string): boolean {
  return CAMPOS_PLANTILLA.some((c) => c.campo === campo);
}

/** Configuración con todos los campos visibles (por defecto o explícito). */
export function configuracionPorDefecto(): Record<string, boolean> {
  const config: Record<string, boolean> = {};
  for (const c of CAMPOS_PLANTILLA) config[c.campo] = c.porDefecto;
  return config;
}

/** Layout de placeholders en la hoja "Diseño" del Excel.
 * Cada entrada: campo -> { sheet, row, col, page?, style? }
 * Row/col son 1-based (como en Excel). */
export type PlaceholderLayout = Record<string, {
  sheet: string;
  row: number;
  col: number;
  page?: number;
  style?: {
    bold?: boolean;
    color?: string;      // hex "#FF0000"
    fontSize?: number;   // puntos
    align?: "left" | "center" | "right";
  };
}>;

/** Parsea la hoja "Diseño" buscando placeholders {{campo}} en las celdas.
 * Devuelve mapa campo -> { sheet, row, col, style }.
 * Extrae formato de la celda: negrita, color, tamaño fuente, alineación. */
export function parsearLayoutDisenio(workbook: ExcelJS.Workbook): PlaceholderLayout {
  const layout: PlaceholderLayout = {};
  const sheet = workbook.getWorksheet("Diseño");
  if (!sheet) return layout;

  const placeholderRegex = /\{\{(\w+)\}\}/g;
  
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const valor = cell.value;
      if (typeof valor === "string") {
        let match;
        while ((match = placeholderRegex.exec(valor)) !== null) {
          const campo = match[1];
          if (esCampoPlantillaValido(campo)) {
            // Extraer estilo de la celda
            const font = cell.font || {};
            const alignment = cell.alignment || {};
            
            const style: PlaceholderLayout[string]["style"] = {};
            if (font.bold) style.bold = true;
            if (font.color && font.color.argb) {
              const argb = font.color.argb;
              // ARGB -> #RRGGBB (ignorar alpha si es 8 chars)
              style.color = argb.length === 8 ? "#" + argb.slice(2) : "#" + argb;
            }
            if (font.size) style.fontSize = font.size;
            if (alignment.horizontal) {
              const align = alignment.horizontal;
              if (["left", "center", "right"].includes(align)) {
                style.align = align as "left" | "center" | "right";
              }
            }
            
            layout[campo] = {
              sheet: "Diseño",
              row: rowNumber,
              col: colNumber,
              style: Object.keys(style).length > 0 ? style : undefined,
            };
          }
        }
      }
    });
  });
  return layout;
}
