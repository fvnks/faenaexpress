"use client";

import Card from "@/components/astryx/card";
import { Grid } from "@/components/astryx/layout";
import { Heading, Text } from "@/components/astryx/typography";

export function LandingProblema() {
  const problemas = [
    {
      id: "libros",
      titulo: "Los libros no cuadran",
      descripcion:
        "El día de declarar IVA, la información anda regada: facturas en el escritorio, un Excel que nadie más entiende y el estado del banco en otra pestaña. Copiar cada folio a mano cansa y al final del mes nadie recuerda quién pagó qué.",
    },
    {
      id: "gastos",
      titulo: "Gastos sin responsable",
      descripcion:
        "Cada gasto debería decir quién lo pagó y si ya se le reembolsó. Sin eso, el dinero se pierde entre recibos sueltos y mensajes de WhatsApp que nadie archiva.",
    },
    {
      id: "visibilidad",
      titulo: "Sin visibilidad real",
      descripcion:
        "No sabes cuánto debes, cuánto te deben o cuánto gastó cada área hasta que es demasiado tarde para corregirlo. Las sorpresas de fin de mes son costosas.",
    },
  ];

  return (
    <section id="problema" className="bg-surface scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24 lg:py-36">
        <Grid cols="1" gap="10">
          <div className="lg:col-span-1">
            <Heading level={2} className="text-center max-w-2xl mx-auto mb-4">
              Fin de mes sin sorpresas
            </Heading>
            <Text as="p" className="text-center max-w-2xl mx-auto">
              Yellow ERP nació para resolver problemas que las empresas reales
              enfrentan cada mes.
            </Text>
          </div>

          <Grid cols="1 lg:3" gap="8">
            {problemas.map((p) => (
              <Card key={p.id}>
                <Card.Header className="pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent mb-6 shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-accent"
                    >
                      {p.id === "libros" ? (
                        <>
                          <path d="M9 11H3v2h6v-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : p.id === "gastos" ? (
                        <>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 8 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 6v6m4 6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </svg>
                  </div>
                </Card.Header>
                <Card.Content>
                  <Heading level={3} className="text-lg mb-2">
                    {p.titulo}
                  </Heading>
                  <Text as="p">{p.descripcion}</Text>
                </Card.Content>
              </Card>
            ))}
          </Grid>
        </Grid>
      </div>
    </section>
  );
}
