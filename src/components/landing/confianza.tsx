"use client";

import Card from "@/components/astryx/card";
import { Grid } from "@/components/astryx/layout";
import { Heading, Text } from "@/components/astryx/typography";

export function LandingConfianza() {
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

  return (
    <section id="confianza" className="bg-background scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24 lg:py-36">
        <Grid cols="1" gap="10">
          <div className="lg:col-span-1">
            <Heading level={2} className="text-center max-w-2xl mx-auto mb-4">
              Empresa chilena, reglas claras
            </Heading>
            <Text as="p" className="text-center max-w-2xl mx-auto">
              Sin sorpresas, sin letras pequeñas, sin datos escondidos.
            </Text>
          </div>

          <Grid cols="1 lg:3" gap="8">
            {puntos.map((p) => (
              <Card key={p.titulo}>
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

        <div className="mt-20 lg:mt-28 border-t border-border pt-16 flex items-center justify-between gap-8">
          <div>
            <Text as="p" className="text-sm font-medium text-foreground">
              ¿Tienes preguntas?
            </Text>
            <Text as="p" className="mt-1 text-sm text-muted-foreground">
              Escríbenos a contacto@yellow-erp.cl
            </Text>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Text as="span">Hecho en Chile</Text>
            <Text as="span" className="text-muted-foreground">·</Text>
            <Text as="span">© 2026 Yellow ERP</Text>
          </div>
        </div>
      </div>
    </section>
  );
}
