export function LandingProblemSection() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-[1fr_1.4fr] sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              La papeleta de fin de mes
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                El día que hay que declarar IVA, la información anda regada por todas
                partes: facturas en el escritorio, un Excel que nadie más entiende y el
                estado del banco en otra pestaña.
              </p>
              <p>
                Copiar cada folio a mano cansa, las notas de crédito se quedan pegadas en
                una carpeta y a fin de mes nadie recuerda quién pagó el gas o el camino a
                la faena.
              </p>
              <p className="font-medium text-foreground">
                Yellow ERP nació para una empresa real con ese mismo problema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
