import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LandingProblema } from "@/components/landing/problema";
import { LandingServicios } from "@/components/landing/servicios";
import { LandingComoFunciona } from "@/components/landing/como-funciona";
import { LandingConfianza } from "@/components/landing/confianza";
import { LandingCTA } from "@/components/landing/cta";
import { LandingFooter } from "@/components/landing/footer";
import { ContactoSection } from "@/components/landing/contacto-section";
import { getCurrentUser } from "@/lib/auth";
import { isSaas } from "@/lib/deployment";

export const metadata: Metadata = {
  title: "Yellow ERP — ERP chileno y diseño web corporativo",
  description:
    "ERP para empresas chilenas: compras, ventas, gastos, banco e IVA. También diseñamos sitios web corporativos. Hecho en Chile, montos en pesos, todo en español.",
};

// La home depende del perfil de despliegue:
//   standalone → la instalación privada: redirige a sesión/login (como siempre).
//   saas       → Yellow ERP: la landing pública presenta el producto.
export default async function Home() {
  if (!isSaas()) {
    const user = await getCurrentUser();
    redirect(user ? "/facturas" : "/login");
  }
  return <Landing />;
}

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <LandingNavbar />
      <LandingHero />
      <LandingProblema />
      <LandingServicios />
      <LandingComoFunciona />
      <LandingConfianza />
      <ContactoSection />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
