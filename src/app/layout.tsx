import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { DateFieldsNormalizer } from "@/components/date-fields-normalizer";
import { ThemeInitializer } from "@/components/theme-initializer";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  // El nombre de la plataforma, no el de un módulo: la raíz la comparten
  // Facturas, Colegios y la puerta de entrada.
  title: "Yellow ERP",
  description: "Sistemas de gestión para tu empresa y tu colegio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={plex.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeInitializer />
        <DateFieldsNormalizer />
        {children}
      </body>
    </html>
  );
}
