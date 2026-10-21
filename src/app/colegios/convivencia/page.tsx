import Link from "next/link";

import { ReportCaseForm } from "@/app/colegios/convivencia/convivencia-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { accionesPendientes, casosConEstado } from "@/lib/school-convivencia";
import { cardClass } from "@/lib/ui";

/**
 * Convivencia escolar (Ley 21.809).
 *
 * La pantalla que la dirección mira todas las mañanas: los casos abiertos con
 * su plazo de investigación (que lo pone la ley, no el colegio) y las etapas
 * que están vencidas.
 */
export default async function ConvivenciaPage() {
  const ctx = await requireSchoolContext("convivencia");
  const schoolId = ctx.school.id;
  const puedeGestionar = schoolCanWrite(ctx, "convivencia");

  const [casos, pendientes, alumnos] = await Promise.all([
    casosConEstado(schoolId),
    accionesPendientes(schoolId),
    db.student.findMany({
      where: { schoolId, status: "ACTIVE" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const abiertos = casos.filter(
    (c) => c.status !== "CERRADO" && c.status !== "RESUELTO",
  );
  const vencidos = abiertos.filter((c) => c.urgencia === "vencido");
  const urgentes = abiertos.filter((c) => c.urgencia === "urgente");
  const etapasVencidas = pendientes.filter((p) => p.vencido);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Convivencia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los casos y su seguimiento. La ley 21.809 fija que la investigación de un caso de alumno
          no puede pasar de 2 meses: el sistema lleva ese plazo y avisa cuando se vence.
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Casos abiertos</p>
            <p className="tabular mt-1 text-2xl font-semibold">{abiertos.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Con el plazo vencido</p>
            <p
              className={
                "tabular mt-1 text-2xl font-semibold " +
                (vencidos.length > 0 ? "text-danger" : "")
              }
            >
              {vencidos.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Por vencer (15 días)</p>
            <p
              className={
                "tabular mt-1 text-2xl font-semibold " +
                (urgentes.length > 0 ? "text-accent" : "")
              }
            >
              {urgentes.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Etapas vencidas</p>
            <p
              className={
                "tabular mt-1 text-2xl font-semibold " +
                (etapasVencidas.length > 0 ? "text-accent" : "")
              }
            >
              {etapasVencidas.length}
            </p>
          </div>
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Reportar</h2>
        <div className="mt-3">
          <ReportCaseForm
            alumnos={alumnos.map((a) => ({
              id: a.id,
              nombre: `${a.firstName} ${a.lastName}`,
            }))}
            puedeGestionar={puedeGestionar}
          />
        </div>
      </section>

      {pendientes.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Etapas por hacer</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Las etapas con plazo, ordenadas por lo más urgente.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {pendientes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.tipo}
                    {a.alumnos.length > 0 ? ` · ${a.alumnos.join(", ")}` : ""}
                  </p>
                </div>
                <span className="text-xs">
                  {a.diasRestantes === null ? (
                    <span className="text-muted-foreground">sin plazo</span>
                  ) : a.vencido ? (
                    <span className="font-semibold text-danger">
                      vencida hace {Math.abs(a.diasRestantes)} días
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {a.diasRestantes} días
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Casos</h2>
        {casos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No hay casos registrados.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {casos.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/colegios/convivencia/casos/${c.id}`}
                    className="text-sm font-medium hover:text-primary hover:underline"
                  >
                    {c.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {c.tipo} · {c.estado}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.alumnos.length > 0 ? c.alumnos.map((a) => a.nombre).join(", ") : "sin alumnos"}
                  {" · "}
                  {c.severity === "GRAVE"
                    ? "grave"
                    : c.severity === "MEDIA"
                      ? "media"
                      : "leve"}
                </p>
                <p className="mt-1 text-xs">
                  {c.urgencia === "vencido" ? (
                    <span className="font-semibold text-danger">
                      La investigación venció hace {Math.abs(c.diasRestantes)} días
                    </span>
                  ) : c.urgencia === "urgente" ? (
                    <span className="font-semibold text-accent">
                      Quedan {c.diasRestantes} días para investigar
                    </span>
                  ) : c.urgencia === "proximo" ? (
                    <span className="text-muted-foreground">
                      Quedan {c.diasRestantes} días para investigar
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {c.accionesPendientes > 0
                        ? `${c.accionesPendientes} etapas pendientes`
                        : "sin etapas pendientes"}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/colegios/convivencia/protocolos"
          className="text-primary underline-offset-2 hover:underline"
        >
          Protocolos y etapas
        </Link>
        <Link
          href="/colegios/convivencia/plan"
          className="text-primary underline-offset-2 hover:underline"
        >
          Plan de Gestión de la Convivencia
        </Link>
      </nav>
    </div>
  );
}
