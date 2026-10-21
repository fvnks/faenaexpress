import Link from "next/link";

import { ProtocolForm } from "@/app/colegios/convivencia/protocolos/protocol-form";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { protocolosDelColegio } from "@/lib/school-convivencia";
import { cardClass } from "@/lib/ui";

const ETIQUETA_TIPO = {
  CONVIVENCIA: "Convivencia general",
  MALTRATO: "Maltrato infantil",
  ACOSO: "Acoso escolar",
  ACOSO_LABORAL: "Acoso laboral",
  DISCRIMINACION: "Discriminación",
} as const;

/**
 * Los protocolos del colegio: las etapas con su plazo.
 *
 * La ley 21.809 pide que el reglamento interno tenga procedimientos de
 * investigación CON plazos definidos. Acá el colegio escribe los suyos y el
 * sistema los usa al abrir un caso.
 */
export default async function ProtocolosPage() {
  const ctx = await requireSchoolContext("convivencia");
  const puedeEditar = schoolCanWrite(ctx, "convivencia");
  const protocolos = await protocolosDelColegio(ctx.school.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/colegios/convivencia"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Convivencia
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Protocolos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las etapas de cada protocolo y su plazo. La ley 21.809 pide que el reglamento interno
          tenga procedimientos de investigación con plazos definidos: estos son los de tu colegio.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <ProtocolForm />
        </section>
      ) : null}

      {protocolos.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Todavía no hay protocolos registrados.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-4">
          {protocolos.map((p) => (
            <li key={p.id} className={cardClass + " p-5"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{p.name}</p>
                <span className="text-xs text-muted-foreground">
                  {ETIQUETA_TIPO[p.kind as keyof typeof ETIQUETA_TIPO] ?? p.kind} · versión{" "}
                  {p.version} {p.active ? "" : "· inactivo"}
                </span>
              </div>

              <ol className="mt-3 divide-y divide-border">
                {p.pasos.map((paso, i) => (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-3 py-2">
                    <span className="text-sm">
                      <span className="tabular mr-2 text-muted-foreground">{i + 1}.</span>
                      {paso.nombre}
                      {paso.responsable ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {paso.responsable}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {paso.plazoDias > 0 ? `${paso.plazoDias} días` : "sin plazo"}
                    </span>
                  </li>
                ))}
              </ol>

              {puedeEditar ? (
                <div className="mt-3">
                  <ProtocolForm
                    protocolId={p.id}
                    name={p.name}
                    kind={p.kind}
                    steps={p.pasos
                      .map((paso) => `${paso.nombre} | ${paso.plazoDias} | ${paso.responsable}`)
                      .join("\n")}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
