import Link from "next/link";

const productLinks = [
  { href: "/facturas/compras", label: "Compras" },
  { href: "/facturas/ventas", label: "Ventas" },
  { href: "/facturas/gastos", label: "Gastos" },
  { href: "/facturas/reportes", label: "Reportes" },
  { href: "/facturas/catalogos", label: "Catálogos" },
  { href: "/facturas/importar", label: "Importar" },
];

const companyLinks = [
  { href: "/contacto", label: "Contacto" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
        {/* Top: eslogan + CTA */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-0 mb-12 lg:mb-16">
          <div className="lg:max-w-[60%]">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black mb-3 block lg:mb-0"
            >
              Y
            </span>
            <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Yellow ERP — el ERP chileno simple
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground max-w-xl">
              El ERP para empresas chilenas. Gestiona compras, ventas, gastos,
              banco, RRHH y más desde una sola plataforma. Montos en pesos, IVA
              al 19 %, todo en español.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:ml-auto">
            <p className="text-sm font-semibold text-foreground uppercase tracking-wider">
              ¿Tienes preguntas?
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary transition-colors"
            >
              Escríbenos
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.25 3.75L3.75 11.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.25 11.25L3.75 3.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Middle: navigation columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Producto
            </p>
            <ul className="space-y-3">
              {productLinks.map((link) => (
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
            <ul className="space-y-3">
              {companyLinks.map((link) => (
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

        {/* Bottom: brand + social + legal */}
        <div className="border-t border-border pt-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
            >
              Y
            </span>
            Yellow ERP
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/yellow-erp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a
                href="https://x.com/yellow_erp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="X / Twitter"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231z"/>
                </svg>
              </a>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link
                href="/privacidad"
                className="hover:text-primary transition-colors"
              >
                Privacidad
              </Link>
              <Link
                href="/terminos"
                className="hover:text-primary transition-colors"
              >
                Términos
              </Link>
              <span>· Hecho en Chile</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
