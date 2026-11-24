"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/landing/section-header";

/**
 * Sección de confianza: lo que realmente somos y cómo trabajamos.
 * Sin logos de clientes inventados, sin testimonios fabricados.
 */

const puntos = [
  {
    titulo: "Tus datos son tuyos",
    descripcion:
      "Exporta todo lo de tu empresa a CSV cuando quieras, sin pedir permiso ni esperar a nadie. Cada empresa vive aislada: nadie ve los datos de otra, salvo que des el permiso explícito.",
  },
  {
    titulo: "Hecho en Chile",
    descripcion:
      "Montos en pesos, IVA al 19 %, todo en español. Diseñado para la realidad de las empresas chilenas, no traducido de otro mercado.",
  },
  {
    titulo: "Libros que cuadran",
    descripcion:
      "Los totales de ventas y compras cuadran con el resumen de IVA. Siempre sabes quién pagó cada gasto y cuánto te deben o debes.",
  },
];

export function LandingConfianza() {
  return (
    <section
      id="confianza"
      className="catalog-grid border-t border-border bg-surface/50 section"
      aria-labelledby="confianza-heading"
    >
      <div className="mx-auto max-w-5xl px-6 py-24 lg:py-32 lg:px-8">
        <SectionHeader
          index="04"
          label="Confianza"
          title="Empresa chilena, reglas claras"
          description="Sin sorpresas, sin letras pequeñas, sin datos escondidos."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {puntos.map((p, index) => (
            <article key={p.titulo} className="card-accent relative overflow-hidden rounded-card border border-border bg-surface p-6 transition-colors duration-150 hover:border-primary/60 hover:bg-surface-elevated">
              <span className="absolute right-4 top-3 font-mono text-xs text-subtle">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-foreground">{p.titulo}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {p.descripcion}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 lg:mt-28 border-t border-border pt-12 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium text-foreground">¿Tienes preguntas?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Escríbenos a <Link href="mailto:contacto@yellow-erp.cl" className="text-primary hover:underline underline-offset-2">contacto@yellow-erp.cl</Link>
            </p>
          </div>
          <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-end gap-4 text-sm text-muted-foreground">
            <span>Hecho en Chile</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 Yellow ERP</span>
          </div>
        </div>
      </div>
    </section>
  );
}