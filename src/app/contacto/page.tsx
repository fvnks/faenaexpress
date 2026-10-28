import type { Metadata } from "next";

import Link from "next/link";

import { ContactoSection } from "@/components/landing/contacto-section";

export const metadata: Metadata = {
  title: "Contacto — Yellow ERP",
  description: "Escríbenos para saber más de Yellow ERP, el ERP chileno para facturas, compras, ventas y gastos.",
};

export default function ContactoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
            >
              Y
            </span>
            Yellow ERP
          </Link>
          <Link
            href="/login"
            className="btn-liquid btn-liquid-secondary rounded-[10px] border px-4 py-1.5 text-sm font-medium"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="relative">
        <ContactoSection />
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
            >
              Y
            </span>
            Yellow ERP
          </div>
          <p className="text-sm text-muted-foreground">
            yellow-erp.cl · Hecho en Chile
          </p>
        </div>
      </footer>
    </div>
  );
}
