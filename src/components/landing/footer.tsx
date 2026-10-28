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
              Registra compras, ventas y gastos en minutos. Concilia el banco,
              revisa el IVA y sé siempre quién pagó qué. Montos en pesos, IVA
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
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-current"
                >
                  <path
                    d="M16 8a6 6 0 0 1 6 6v3h-4v-3a2 2 0 0 0-2-2 2 2 0 0 0-2 2v3h-4v-3a6 6 0 0 1 6-6z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    width="4"
                    height="12"
                    x="4"
                    y="4"
                    stroke="currentColor"
                    strokeWidth="2"
                    rx="1"
                    ry="1"
                  />
                </svg>
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="X / Twitter"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-current"
                >
                  <path
                    d="M18 2v4a6 6 0 0 1-6 6c-2 0-3.809-.781-5.144-2.006a8 8 0 0 0-2.88-2.88C4.781 10.19 4 8.391 4 6.2v-4h4a2 2 0 0 1 2 2v1.168a6 6 0 0 1 1.396 4.232c-.688.231-1.438.388-2.234.475v-.944a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.588A8 8 0 0 0 10.618 19c.587-.087 1.157-.237 1.698-.463a4 4 0 0 1 1.45-1.447c.226-.541.376-1.111.463-1.7h2.214c-.211.589-.36 1.218-.463 1.7a4 4 0 0 1 1.45 1.447c.541.226 1.111.376 1.698.463A8 8 0 0 0 20 14v-4a6 6 0 0 1-6-6z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
