import Link from "next/link";

/**
 * Footer simple: marca, enlaces esenciales y contacto. Sin 4 columnas template.
 */
export function LandingFooter() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-0">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-black text-[13px] font-bold"
            >
              Y
            </span>
            Yellow ERP
          </div>

          <nav className="flex flex-wrap gap-8 lg:gap-12 text-sm mt-6 lg:mt-0">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Entrar al ERP
            </Link>
            <Link
              href="/contacto"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Diseño web
            </Link>
            <Link
              href="/privacidad"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Términos
            </Link>
          </nav>
        </div>

        <div className="mt-16 lg:mt-20 border-t border-border pt-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <p className="text-xs text-muted-foreground">
            Hecho en Chile · montos en CLP · IVA 19 %
          </p>
          <p className="text-xs text-muted-foreground">
            © 2026 Yellow ERP
          </p>
        </div>
      </div>
    </footer>
  );
}
