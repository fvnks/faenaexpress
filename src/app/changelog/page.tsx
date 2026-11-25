import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Changelog — Yellow ERP",
  description:
    "Cambios recientes de Yellow ERP: centros de costo, búsqueda en desplegables y mejoras visibles de la interfaz.",
};

const cambios = [
  {
    fecha: "25-11-2026",
    titulo: "Gastos con centro de costo automático",
    texto: "La categoría define el centro por defecto. Los gastos sin regla caen al centro «Sin asignar» y aparecen en el reporte y en el CSV.",
  },
  {
    fecha: "25-11-2026",
    titulo: "Buscar escribiendo en los desplegables",
    texto: "Categorías, áreas, centros y filtros se filtran con texto; Enter elige la primera coincidencia sin enviar el formulario.",
  },
  {
    fecha: "25-11-2026",
    titulo: "Menú móvil de la landing",
    texto: "El menú del sitio vuelve a desplegarse en pantallas pequeñas y el favicon dejó de dar 404.",
  },
];

export default function ChangelogPage() {
  return (
    <LegalPage
      index="Recursos"
      label="Changelog"
      title="Changelog"
      description="Registro de los cambios que afectan a quienes usan el servicio todos los días. Publicamos solo mejoras visibles: no incluimos detalles de cuentas, permisos ni información de clientes."
    >
      <LegalSection title="Noviembre 2026">
        <ul className="space-y-4">
          {cambios.map((cambio) => (
            <li key={cambio.titulo} className="rounded-card border border-border bg-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{cambio.fecha}</p>
              <h3 className="mt-2 text-base font-semibold text-foreground">{cambio.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cambio.texto}</p>
            </li>
          ))}
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
