import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Blog — Yellow ERP",
  description:
    "Notas breves sobre contabilidad, documentos tributarios y organización interna para empresas chilenas.",
};

const notas = [
  {
    fecha: "25-11-2026",
    titulo: "Por qué los gastos indirectos también necesitan centro de costo",
    texto:
      "La gasolina, la luz y el arriendo no se facturan a un cliente, pero sí explican parte del resultado. Asignarlos a un centro de costo permite ver cuánto cuesta realmente cada área y evitar que esos gastos queden sin dueño.",
  },
  {
    fecha: "24-11-2026",
    titulo: "Facturas, boletas y notas de crédito: cómo no contarlas dos veces",
    texto:
      "El folio no identifica un documento: dos proveedores pueden tener el mismo número. Explicamos por qué el SII se coteja por emisor, tipo y folio, y cómo evitar duplicados al sincronizar.",
  },
  {
    fecha: "20-11-2026",
    titulo: "Quién pagó cada gasto (y por qué importa)",
    texto:
      "Registrar el pagador y el reembolso separa el gasto de la empresa de la plata que puso una persona. Es la base para conciliar la banca sin confundir reembolsos con ingresos.",
  },
];

export default function BlogPage() {
  return (
    <LegalPage
      index="Recursos"
      label="Blog"
      title="Blog"
      description="Apuntes prácticos sobre los problemas que resolvemos todos los días en una empresa chilena: documentos, impuestos y orden interno."
    >
      <LegalSection title="Últimas notas">
        <p>
          Publicamos textos cortos, sin promociones ni correos automáticos. Si quieres que tratemos un tema, escríbenos a{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>
          .
        </p>
        <ul className="space-y-4">
          {notas.map((nota) => (
            <li key={nota.titulo} className="rounded-card border border-border bg-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{nota.fecha}</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">{nota.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{nota.texto}</p>
            </li>
          ))}
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
