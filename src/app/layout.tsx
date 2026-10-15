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
  title: "Facturas",
  description: "Registro de compras, ventas y gastos.",
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
