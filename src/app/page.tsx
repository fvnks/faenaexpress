import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HeroSection } from "@/components/landing/hero-section";
import { LandingProblemSection } from "@/components/landing/problem-section";
import { LandingFeaturesSection } from "@/components/landing/features-section";
import { LandingPlatformSection } from "@/components/landing/platform-section";
import { LandingCtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";
import { getCurrentUser } from "@/lib/auth";
import { isSaas } from "@/lib/deployment";

// La home depende del perfil de despliegue:
//   standalone → la instalación privada: redirige a sesión/login (como siempre).
//   saas       → Yellow ERP: la landing pública presenta el producto.
export const metadata: Metadata = {
  title: "Yellow ERP — el ERP chileno simple",
  description:
    "Registra compras, ventas y gastos en minutos. Concilia el banco, revisa el IVA y sé siempre quién pagó qué. Montos en pesos, en español.",
};

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
      <HeroSection />
      <LandingProblemSection />
      <LandingFeaturesSection />
      <LandingPlatformSection />
      <LandingCtaSection />
      <LandingFooter />
    </div>
  );
}
