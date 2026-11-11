import Link from "next/link";

import { Stack, Grid } from "@/components/astryx/layout";
import { Text } from "@/components/astryx/typography";

export function LandingFooter() {
  const productoLinks = [
    { href: "/facturas/compras", label: "Compras" },
    { href: "/facturas/ventas", label: "Ventas" },
    { href: "/facturas/gastos", label: "Gastos" },
    { href: "/facturas/reportes", label: "Reportes" },
    { href: "/facturas/catalogos", label: "Catálogos" },
  ];

  const empresaLinks = [
    { href: "/contacto", label: "Contacto" },
    { href: "/privacidad", label: "Privacidad" },
    { href: "/terminos", label: "Términos" },
  ];

  return (
    <footer className="bg-surface border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="mb-16 lg:mb-20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-black text-lg font-bold"
            >
              Y
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Yellow ERP
            </span>
          </div>
          <Text as="p" className="text-sm max-w-xs lg:max-w-none">
            ERP para empresas chilenas · montos en CLP · IVA 19 % · todo en español
          </Text>
        </div>

        <Grid cols="1" gap="12" className="mb-16 lg:mb-20 lg:grid-cols-4">
          <div>
            <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Producto
            </Text>
            <Stack space="4">
              {productoLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </div>

          <div>
            <Text as="p" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Empresa
            </Text>
            <Stack space="4">
              {empresaLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </div>
        </Grid>

        <div className="border-t border-border pt-12 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-[12px] font-bold"
            >
              Y
            </span>
            Yellow ERP
          </div>

          <div className="flex items-center gap-8 text-xs text-muted-foreground">
            <Text as="span">Hecho en Chile</Text>
            <Text as="span" className="text-muted-foreground">·</Text>
            <Text as="span">© 2026 Yellow ERP</Text>
          </div>
        </div>
      </div>
    </footer>
  );
}
