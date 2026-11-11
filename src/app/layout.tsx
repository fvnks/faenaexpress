import type { Metadata } from "next";
import "./globals.css";
import { DateFieldsNormalizer } from "@/components/date-fields-normalizer";
import { ThemeInitializer } from "@/components/theme-initializer";

export const metadata: Metadata = {
  // El nombre de la plataforma, no el de un módulo: la raíz la comparten
  // Facturas, Colegios y la puerta de entrada.
  title: "Yellow ERP",
  description: "Sistemas de gestión para tu empresa y tu colegio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className="font-sans" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeInitializer />
        <DateFieldsNormalizer />
        {children}
      </body>
    </html>
  );
}
