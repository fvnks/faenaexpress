"use client";

import Link from "next/link";

import { Button } from "@/components/astryx/button";
import Card from "@/components/astryx/card";
import { Stack } from "@/components/astryx/layout";
import { Text, Heading } from "@/components/astryx/typography";

export function LandingCTA() {
  return (
    <section className="bg-primary scroll-mt-24 border-t border-primary/20">
      <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />

        <Card className="border-0 bg-transparent shadow-none p-0">
          <Card.Content className="p-0">
            <Stack space="6">
              <Heading level={2} className="text-center text-primary-foreground">
                ¿Listo para ordenar tus cuentas?
              </Heading>
              <Text as="p" className="text-center text-primary-foreground/90 max-w-lg mx-auto">
                Entra al ERP y empieza a registrar compras, ventas y gastos hoy
                mismo. O escríbenos si necesitas diseño web corporativo.
              </Text>
              <Stack space="4" direction="row" className="justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                  href="/login"
                >
                  Entrar a mi cuenta
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  href="/contacto"
                >
                  Diseño web corporativo
                </Button>
              </Stack>
            </Stack>
          </Card.Content>
        </Card>
      </div>
    </section>
  );
}
