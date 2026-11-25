import type { Metadata } from "next";

import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { ContactoSection } from "@/components/landing/contacto-section";

export const metadata: Metadata = {
  title: "Contacto — Yellow ERP",
  description:
    "Escríbenos para saber más de Yellow ERP, el ERP chileno para facturas, compras, ventas y gastos, o para proyectos de diseño web corporativo.",
};

export default function ContactoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <LandingNavbar />
      <main className="relative pt-20">
        <h1 className="sr-only">Contacto</h1>
        <ContactoSection />
      </main>
      <LandingFooter />
    </div>
  );
}
