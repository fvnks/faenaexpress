import { FormularioObra } from "./formulario";
import { mandantesVisibles } from "@/lib/obra-mandantes";
import { requireObraContext, obraCanWrite } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";

export default async function ObraAdministracionPage() {
  const ctx = await requireObraContext("administracion");
  const editable = obraCanWrite(ctx, "administracion");
  const { obra } = ctx;
  const mandantes = await mandantesVisibles(ctx.user);

  const datos = {
    name: obra.name,
    code: obra.code,
    mandante: obra.mandante,
    mandanteId: obra.mandanteId,
    rutMandante: obra.rutMandante,
    direccion: obra.direccion,
    comuna: obra.comuna,
    fechaInicio: obra.fechaInicio ? obra.fechaInicio.toISOString().slice(0, 10) : "",
    fechaTermino: obra.fechaTermino ? obra.fechaTermino.toISOString().slice(0, 10) : "",
    status: obra.status,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 13 — Administración</p>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de {obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos de la obra, plazo y estado. Solo la dirección de obra puede editarlos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Código interno", value: obra.code ?? "—" },
          { label: "Mandante", value: obra.mandante ?? "—" },
          { label: "Comuna", value: obra.comuna ?? "—" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 truncate text-lg font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Datos generales</h2>
        <div className="mt-4">
          {editable ? (
            <FormularioObra
              datos={datos}
              mandantes={mandantes.map((m) => ({ id: m.id, name: m.name }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground"> Tu rol es de solo lectura en esta sección.</p>
          )}
        </div>
      </section>
    </div>
  );
}
