import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { isSaas } from "@/lib/deployment";

// La home depende del perfil de despliegue:
//   standalone → la instalación privada: redirige a sesión/login (como siempre).
//   saas       → Yellow ERP: la landing pública presenta el producto.
export const metadata: Metadata = {
  title: "Yellow ERP — el ERP chileno simple",
  description:
    "Registra compras, ventas y gastos en minutos. Concilia el banco, revisa el IVA y sé siempre quién pagó qué. Montos en pesos, en español.",
};

export default async function Home() {
  // La instalación privada no cambia: sin sesión, al login.
  if (!isSaas()) {
    const user = await getCurrentUser();
    redirect(user ? "/dashboard" : "/login");
  }
  return <Landing />;
}

// ---------------------------------------------------------------------------
// Landing de Yellow ERP.
//
// Dirección visual (resuelta con el dueño, 19-10-2026):
//   Audiencia: dueño de pyme chilena. Tono cercano y directo.
//   ENERGY 2 (cálido pero profesional) · RHYTHM 2 (secciones variadas) · MOTION 1
//   (solo hover). Visual: narrativa tipográfica grande y un mockup estilizado del
//   panel hecho con CSS, no una captura. Acento amarillo solo en la marca y en un
//   detalle del mockup (dosis 1-2).
// ---------------------------------------------------------------------------

function Marca() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
      >
        Y
      </span>
      Yellow ERP
    </span>
  );
}

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header: solo marca y entrar; la landing no tiene menú para despejar el hero. */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Marca />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="btn-liquid btn-liquid-secondary rounded-[10px] border px-4 py-1.5 text-sm font-medium"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: narrativa tipográfica grande + mockup estilizado. */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24">
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
          Deja de perseguir facturas en Excel.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Registra compras, ventas y gastos en minutos, concilia el banco sin abrir cinco
          pestañas y ten siempre claro quién pagó cada gasto. Montos en pesos, IVA al 19%,
          todo en español.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="btn-liquid btn-liquid-primary rounded-[10px] border px-6 py-3 text-base font-semibold"
          >
            Entrar a mi cuenta
          </Link>
          <Link
            href="#que-hace"
            className="btn-liquid btn-liquid-secondary rounded-[10px] border px-6 py-3 text-base font-medium"
          >
            Ver de qué se trata
          </Link>
        </div>

        <div className="mt-16">
          <MockupPanel />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Representación del panel. Los datos son de ejemplo.
          </p>
        </div>
      </section>

      {/* El problema: una narrativa, no tres tarjetas iguales. */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-10 sm:grid-cols-[1fr_1.4fr] sm:items-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              La papeleta de fin de mes
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                El día que hay que declarar IVA, la información anda regada por todas
                partes: facturas en el escritorio, un Excel que nadie más entiende y el
                estado del banco en otra pestaña.
              </p>
              <p>
                Copiar cada folio a mano cansa, las notas de crédito se quedan pegadas
                en una carpeta y a fin de mes nadie recuerda quién pagó el gas o el
                camino a la faena.
              </p>
              <p className="font-medium text-foreground">
                Yellow ERP nació para una empresa real con ese mismo problema.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Qué hace hoy: jerarquía real, la conciliación lleva el peso. */}
      <section id="que-hace" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Qué hace el módulo Facturas hoy
        </h2>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Todo esto funciona ya en producción con datos reales.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Destacado: lo más diferenciador. */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lo que más cambia tu semana
            </p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">
              Conciliación bancaria en el mismo lugar
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Baja los movimientos del banco, los revisa contra tus compras por pagar
              y ventas por cobrar, y te muestra las parejas alineadas para aceptarlas
              con un clic. Si algo no calza, queda anotado en una bandeja para revisar
              con calma.
            </p>
          </div>

          {/* El resto: lista, no tarjetas clonadas. */}
          <ul className="space-y-4">
            {[
              ["Compras y ventas", "Facturas, boletas y notas con IVA, vencimiento y medio de pago."],
              ["Gastos con responsable", "Cada gasto dice quién lo pagó y si ya se le reembolsó."],
              ["XML del SII", "Importa el sobre del SII y completa la factura en un paso."],
              ["Reportes", "Flujo de caja, IVA mensual, libro de compras y ventas."],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="border-l-2 border-border pl-4">
                <p className="font-medium text-foreground">{titulo}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Plataforma: módulos reales y honestidad sobre lo que viene. */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Facturas es el primer módulo
          </h2>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Yellow ERP se arma de a poco, con módulos que funcionan antes de anunciarlos.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Facturas", "Compras, ventas, gastos, banco, inventario y comisiones.", true],
              ["Remuneraciones", "Trabajadores, pagos y ausencias del módulo RRHH.", true],
              ["Más módulos", "En camino, cuando estén listos y no antes.", false],
            ].map(([nombre, texto, listo]) => (
              <div
                key={String(nombre)}
                className={
                  "rounded-2xl border p-5 " +
                  (listo ? "border-border bg-background" : "border-dashed border-border bg-transparent")
                }
              >
                <p className="font-semibold text-foreground">{String(nombre)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{String(texto)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre: datos duros y el paso siguiente. */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tus datos son tuyos
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Exporta todo lo de tu empresa a CSV cuando quieras, sin pedir permiso ni
          esperar a nadie. Y cada empresa vive aislada: nadie ve los datos de otra,
          salvo que le des el permiso explícito.
        </p>
        <Link
          href="/login"
          className="btn-liquid btn-liquid-primary mt-8 inline-block rounded-[10px] border px-8 py-3 text-base font-semibold"
        >
          Entrar a mi cuenta
        </Link>
      </section>

      {/* Footer: mínimo, sin columnas de relleno. */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <Marca />
          <p className="text-sm text-muted-foreground">
            yellow-erp.cl · Hecho en Chile
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Mockup estilizado del panel: una representación en CSS con datos de ejemplo,
 * no una captura. La fila "conciliada" lleva el único acento amarillo de la
 * página, para contar el flujo central del producto sin una palabra.
 */
function MockupPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Barra lateral mínima */}
      <div className="flex border-b border-border bg-background">
        <div className="flex w-24 shrink-0 flex-col gap-1.5 border-r border-border p-3">
          <span className="h-2.5 w-14 rounded-full bg-primary-soft" aria-hidden="true" />
          <span className="h-2 w-10 rounded-full bg-border" aria-hidden="true" />
          <span className="h-2 w-12 rounded-full bg-border" aria-hidden="true" />
          <span className="h-2 w-9 rounded-full bg-border" aria-hidden="true" />
        </div>
        <div className="flex-1 p-3">
          <span className="block h-2.5 w-24 rounded-full bg-border" aria-hidden="true" />
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          ["Por cobrar", "$2.480.000"],
          ["Por pagar", "$890.000"],
          ["Por conciliar", "12 movimientos"],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {etiqueta}
            </p>
            <p className="tabular mt-1 text-sm font-semibold text-foreground">{valor}</p>
          </div>
        ))}
      </div>

      {/* Tabla de compras de ejemplo */}
      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border bg-background px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex-1">Documento</span>
            <span className="hidden flex-1 sm:block">Proveedor</span>
            <span className="w-24 text-right">Monto</span>
            <span className="w-20 text-right">Estado</span>
          </div>
          {[
            ["Factura 872263", "Comercial del Sur", "$446.375", "Pagada"],
            ["Factura 1031", "Insumos Andes", "$119.000", "Pendiente"],
            ["Factura 5502", "Transportes Río", "$238.000", "Pagada"],
          ].map(([doc, prov, monto, estado]) => (
            <div
              key={String(doc)}
              className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs last:border-b-0"
            >
              <span className="flex-1 truncate font-medium text-foreground">{String(doc)}</span>
              <span className="hidden flex-1 truncate text-muted-foreground sm:block">{String(prov)}</span>
              <span className="tabular w-24 text-right text-foreground">{String(monto)}</span>
              <span className="w-20 text-right">
                <span
                  className={
                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium " +
                    (estado === "Pagada"
                      ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-400/20 dark:text-yellow-300"
                      : "bg-border text-muted-foreground")
                  }
                >
                  {String(estado)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
