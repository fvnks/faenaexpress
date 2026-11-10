import Link from "next/link";

/**
 * Footer profesional: marca, enlaces organizados por categoría, contacto
 * y legal. Sin columnas vacías ni relleno template.
 */
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
        {/* Marca + descripción corta */}
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
          <p className="text-sm text-muted-foreground max-w-xs lg:max-w-none">
            ERP para empresas chilenas · montos en CLP · IVA 19 % · todo en español
          </p>
        </div>

        {/* Enlaces organizados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-16 lg:mb-20">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Producto
            </p>
            <ul className="space-y-4">
              {productoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Empresa
            </p>
            <ul className="space-y-4">
              {empresaLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Línea inferior con marca y legal */}
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
            <span>Hecho en Chile</span>
            <span>·</span>
            <span>© 2026 Yellow ERP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
