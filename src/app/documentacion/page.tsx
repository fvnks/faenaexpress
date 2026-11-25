import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Documentación — Yellow ERP",
  description:
    "Guía rápida de los módulos de Yellow ERP: compras, ventas, gastos, inventario, colegios, punto de venta y obras.",
};

const guias = [
  {
    titulo: "Compras y ventas",
    texto: "Registra facturas, boletas y notas de crédito; controla el estado de pago y reparte cada documento entre centros de costo.",
  },
  {
    titulo: "Gastos y centros de costo",
    texto: "Anota quién pagó cada gasto y cuándo se reembolsó. La categoría define el centro por defecto, así que la gasolina cae sola en Vehículos.",
  },
  {
    titulo: "Banco e inventario",
    texto: "Concilia movimientos bancarios, sugiere reposición por stock bajo y controla lotes con FEFO cuando el producto es trazable.",
  },
  {
    titulo: "Colegios, Punto de Venta y Obras",
    texto: "Cada módulo resuelve su propio ámbito: colegio, caja u obra. Un mismo usuario puede trabajar en varios según sus permisos.",
  },
];

export default function DocumentacionPage() {
  return (
    <LegalPage
      index="Recursos"
      label="Documentación"
      title="Documentación"
      description="Una guía breve para entender dónde se registra cada cosa. Si necesitas ayuda con tu cuenta, escríbenos y te acompañamos en la primera configuración."
    >
      <LegalSection id="primeros-pasos" title="Primeros pasos">
        <p>
          Entra con tu cuenta, elige el módulo en el que quieres trabajar y revisa la empresa o el colegio activo en el encabezado. Si tienes más de un módulo contratado, el selector inicial te muestra cuántas tareas pendientes hay en cada uno.
        </p>
      </LegalSection>

      <LegalSection id="modulos" title="Qué se registra en cada módulo">
        <ul className="space-y-4">
          {guias.map((guia) => (
            <li key={guia.titulo} className="rounded-card border border-border bg-surface p-5">
              <h3 className="text-base font-semibold text-foreground">{guia.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guia.texto}</p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="ayuda" title="Ayuda y permisos">
        <p>
          Los roles deciden qué se puede hacer y el alcance decide dónde: una persona puede ser administrador de una empresa y solo lectura en otra. Si no ves un módulo, revisa que tu organización lo tenga habilitado y que tengas acceso a su ámbito. Para ayuda, escribe a{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
