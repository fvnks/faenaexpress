import type { Metadata } from "next";

import Link from "next/link";

import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { submitContacto } from "@/app/actions/contacto";

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

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="lg:w-1/4 shrink-0 space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Contacto</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              ¿Tienes preguntas sobre Yellow ERP? Escríbenos y te responderemos a la
              brevedad.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-muted-foreground">✉</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Escríbenos</p>
                  <p className="text-sm text-muted-foreground">
                    contacto@yellow-erp.cl
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 text-muted-foreground">📍</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Oficina</p>
                  <p className="text-sm text-muted-foreground">
                    Santiago, Chile
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">
              Envíanos un mensaje
            </h2>
            <ContactoForm />
          </section>
        </div>
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

function ContactoForm() {
  return (
    <form action={submitContacto} className="space-y-4">
      <div className={fieldClass}>
        <label htmlFor="contacto-nombre" className={labelClass}>
          Nombre
        </label>
        <input
          id="contacto-nombre"
          name="nombre"
          type="text"
          maxLength={100}
          className={controlClass}
          required
          placeholder="Tu nombre"
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="contacto-email" className={labelClass}>
          Correo electrónico
        </label>
        <input
          id="contacto-email"
          name="email"
          type="email"
          maxLength={200}
          className={controlClass}
          required
          placeholder="tú@empresa.cl"
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="contacto-empresa" className={labelClass}>
          Empresa
        </label>
        <input
          id="contacto-empresa"
          name="empresa"
          type="text"
          maxLength={100}
          className={controlClass}
          required
          placeholder="Nombre de tu empresa"
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="contacto-mensaje" className={labelClass}>
          Mensaje
        </label>
        <textarea
          id="contacto-mensaje"
          name="mensaje"
          rows={5}
          maxLength={1000}
          className={controlClass}
          required
          placeholder="Cuéntanos qué necesitas…"
        />
      </div>

      <button type="submit" className={primaryButtonClass}>
        Enviar mensaje
      </button>
    </form>
  );
}
