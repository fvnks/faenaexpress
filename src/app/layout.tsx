import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppearanceInitializer } from "@/components/appearance-initializer";
import { DateFieldsNormalizer } from "@/components/date-fields-normalizer";

// Se aplica ANTES de pintar: modo automático por hora (07:00–19:00 claro,
// resto oscuro) y paleta guardada. `data-mode` conserva la preferencia del
// usuario para que el picker sepa si está en automático o en un modo fijo.
const appearanceScript = `(function(){try{var r=document.documentElement,l=localStorage;var m=l.getItem('theme')||'auto';var p=l.getItem('palette')||'cobre';if(['auto','light','dark','high-contrast'].indexOf(m)<0)m='auto';if(['cobre','arena','bosque','acero','vino'].indexOf(p)<0)p='cobre';r.setAttribute('data-mode',m);r.setAttribute('data-palette',p);var x=m;if(m==='auto'){var h=new Date().getHours();x=(h>=7&&h<19)?'light':'dark';}r.classList.remove('light','dark','high-contrast');if(x==='dark'||x==='high-contrast'){r.classList.add(x);}}catch(e){}})();`;

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yellow ERP",
  description: "Sistemas de gestión para tu empresa y tu colegio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <AppearanceInitializer />
        <DateFieldsNormalizer />
        {children}
      </body>
    </html>
  );
}