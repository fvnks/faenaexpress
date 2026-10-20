"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { saveGrades, type GradesFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";
import { promedioPonderado } from "@/lib/school-grading-math";

type Alumno = {
  id: string;
  nombre: string;
  nota: string;
  estado: string;
};

type OtraEvaluacion = {
  id: string;
  nombre: string;
  weight: number;
  /** Las notas ya guardadas de cada alumno en esa evaluación. */
  notas: Record<string, number>;
};

const ESTADOS = [
  { value: "PENDIENTE", label: "Sin nota" },
  { value: "GRADED", label: "Calificada" },
  { value: "EXENTO", label: "Exento" },
] as const;

/**
 * Hoja de notas de una evaluación.
 *
 * Es la pantalla del docente: escribe la nota de cada alumno y guarda. El
 * promedio de la asignatura se calcula mientras escribe, con la misma
 * matemática que usa el servidor (`school-grading-math`): lo que se ve en
 * pantalla es lo que va a quedar en el acta.
 */
export function GradeSheet({
  evaluationId,
  alumnos,
  contexto,
  weight,
  puedeEditar,
}: {
  evaluationId: string;
  alumnos: Alumno[];
  /** Las otras evaluaciones de la misma asignatura y período, con sus notas. */
  contexto: OtraEvaluacion[];
  /** La ponderación de esta evaluación dentro de la asignatura (%). */
  weight: number;
  puedeEditar: boolean;
}) {
  const [state, action, pending] = useActionState<GradesFormState, FormData>(
    saveGrades,
    undefined,
  );
  const [notas, setNotas] = useState<Record<string, string>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.id, a.nota])),
  );
  const [estados, setEstados] = useState<Record<string, string>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.id, a.estado])),
  );

  useEffect(() => {
    if (state?.ok) toast.success("Notas guardadas");
  }, [state]);

  /** El promedio de la asignatura con lo que hay en pantalla ahora. */
  function promedioAlVivo(alumnoId: string): number | null {
    const items: { nota: number; peso: number }[] = [];
    for (const otra of contexto) {
      const nota = otra.notas[alumnoId];
      if (nota !== undefined) items.push({ nota, peso: otra.weight });
    }
    const propia = notas[alumnoId]?.trim();
    if (propia && estados[alumnoId] === "GRADED") {
      const valor = Number(propia.replace(",", "."));
      if (Number.isFinite(valor)) items.push({ nota: valor, peso: weight });
    }
    return promedioPonderado(items);
  }

  if (alumnos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay alumnos matriculados en este curso.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="evaluationId" value={evaluationId} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-2 py-2 font-medium text-muted-foreground">
                Alumno
              </th>
              <th scope="col" className="w-28 px-2 py-2 font-medium text-muted-foreground">
                Nota
              </th>
              <th scope="col" className="w-40 px-2 py-2 font-medium text-muted-foreground">
                Estado
              </th>
              <th scope="col" className="w-24 px-2 py-2 text-right font-medium text-muted-foreground">
                Promedio
              </th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno) => {
              const promedio = promedioAlVivo(alumno.id);
              return (
                <tr key={alumno.id} className="border-b border-border/60">
                  <th scope="row" className="px-2 py-2 text-left font-normal">
                    {alumno.nombre}
                    <input type="hidden" name="studentId" value={alumno.id} />
                  </th>
                  <td className="px-2 py-2">
                    <label className="sr-only" htmlFor={`nota-${alumno.id}`}>
                      Nota de {alumno.nombre}
                    </label>
                    <input
                      id={`nota-${alumno.id}`}
                      name="nota"
                      type="text"
                      inputMode="decimal"
                      placeholder="—"
                      defaultValue={alumno.nota}
                      disabled={!puedeEditar || estados[alumno.id] === "EXENTO"}
                      onChange={(e) => setNotas((s) => ({ ...s, [alumno.id]: e.target.value }))}
                      className="tabular w-20 rounded-control border border-border bg-surface px-2 py-1 text-sm text-foreground disabled:opacity-60"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <label className="sr-only" htmlFor={`estado-${alumno.id}`}>
                      Estado de la nota de {alumno.nombre}
                    </label>
                    <select
                      id={`estado-${alumno.id}`}
                      name="estado"
                      value={estados[alumno.id]}
                      disabled={!puedeEditar}
                      onChange={(e) => setEstados((s) => ({ ...s, [alumno.id]: e.target.value }))}
                      className="rounded-control border border-border bg-surface px-2 py-1 text-sm text-foreground disabled:opacity-60"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="tabular px-2 py-2 text-right">
                    {promedio === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={
                          promedio < 4 ? "font-semibold text-danger" : "font-medium text-foreground"
                        }
                      >
                        {promedio.toFixed(1)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      {puedeEditar ? (
        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Guardar notas
        </SubmitButton>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tu rol puede ver las notas, pero no registrarlas.
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}
