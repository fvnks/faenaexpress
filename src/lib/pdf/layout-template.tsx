/**
 * Template Option A: Layout personalizado desde Excel (coordenadas absolutas).
 * 
 * Wrapper que usa LayoutBasedInvoiceRenderer dentro de una estructura
 * Document/Page válida para react-pdf.
 */

import { Document, Page, StyleSheet, View, Font } from "@react-pdf/renderer";
import path from "node:path";
import type { InvoiceData } from "./vendor/easy-invoice-pdf/schema";
import { LayoutBasedInvoiceRenderer } from "./layout-renderer";

const FUENTES_DIR = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "OpenSans",
  fonts: [
    { src: path.join(FUENTES_DIR, "open-sans-regular.ttf") },
    { src: path.join(FUENTES_DIR, "open-sans-700.ttf"), fontWeight: 700 },
  ],
});

export const PDF_LAYOUT_TEMPLATE_STYLES = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    fontFamily: "OpenSans",
    fontWeight: 400,
    padding: 0,
  },
});

interface LayoutTemplateProps {
  invoiceData: InvoiceData;
  layout: Record<string, { row: number; col: number }>;
}

/** Template completo Option A con Document/Page */
export function LayoutInvoiceTemplate({ invoiceData, layout }: LayoutTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={PDF_LAYOUT_TEMPLATE_STYLES.page}>
        <View style={{ position: "relative", width: "100%", height: "100%" }}>
          <LayoutBasedInvoiceRenderer
            invoiceData={invoiceData}
            layout={layout}
            styles={{}}
          />
        </View>
      </Page>
    </Document>
  );
}