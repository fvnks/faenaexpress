import Link from "next/link";

export function LandingCtaSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Tus datos son tuyos
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        Exporta todo lo de tu empresa a CSV cuando quieras, sin pedir permiso ni esperar a
        nadie. Y cada empresa vive aislada: nadie ve los datos de otra, salvo que le des el
        permiso explícito.
      </p>
      <Link
        href="/login"
        className="btn-liquid btn-liquid-primary mt-8 inline-block rounded-[10px] border px-8 py-3 text-base font-semibold"
      >
        Entrar a mi cuenta
      </Link>
    </section>
  );
}
