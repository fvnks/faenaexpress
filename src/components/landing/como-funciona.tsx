"use client";

import Card from "@/components/astryx/card";
import { Grid } from "@/components/astryx/layout";
import { Heading, Text } from "@/components/astryx/typography";

export function LandingComoFunciona() {
  const pasos = [
    {
      numero: "01",
      titulo: "Registra tus documentos",
      descripcion:
        "Ingresa facturas de compra y venta, boletas y notas con su RUT, folio, neto, IVA y total. Cada documento queda registrado con su estado de pago o cobro.",
    },
    {
      numero: "02",
      titulo: "Concilia el banco",
      descripcion:
        "Importa los movimientos bancarios y empáralos con tus compras por pagar y ventas por cobrar. Lo que no calza queda en una bandeja para revisar.",
    },
    {
      numero: "03",
      titulo: "Saber quién pagó qué",
      descripcion:
        "Cada gasto registra a su pagador y si ya se le reembolsó. Al final del mes sabes exactamente cuánto gastó cada área y cuánto te deben o debes.",
    },
  ];

  return (
    <section id="como-funciona" className="bg-surface scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24 lg:py-36">
        <Grid cols="1" gap="10">
          <div className="lg:col-span-1">
            <Heading level={2} className="text-center max-w-2xl mx-auto mb-4">
              Cómo funciona
            </Heading>
            <Text as="p" className="text-center max-w-2xl mx-auto">
              Tres pasos para tener los libros al día sin sorpresas de fin de mes.
            </Text>
          </div>

          <Grid cols="1 lg:3" gap="8">
            {pasos.map((paso) => (
              <Card key={paso.numero}>
                <Card.Header className="pb-4">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {paso.numero}
                    </div>
                    <div>
                      <Heading level={3} className="text-lg mb-0">
                        {paso.titulo}
                      </Heading>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <Text as="p">{paso.descripcion}</Text>
                </Card.Content>
              </Card>
            ))}
          </Grid>
        </Grid>
      </div>
    </section>
  );
}
