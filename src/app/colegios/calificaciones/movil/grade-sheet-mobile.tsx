"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { saveGrades, type GradesFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";

type Alumno = {
  id: string;
  nombre: string;
  valor: number | null;
  estado: string;
};


export function GradeSheetMobile({
  evaluationId,
  evaluationName,
  weight,
  alumnos,
}: {
  evaluationId: string;
  evaluationName: string;
  weight: number;
  alumnos: Alumno[];
}) {
  const [state, action] = useActionState<GradesFormState, FormData>(
    saveGrades,
    undefined,
  );
  const form = useRef<HTMLFormElement>(null);

  // Estado local: estudiante -> { valor, estado }
  const [notas, setNotas] = useState<Map<string, { valor: number | null; estado: string }>>(() =>
    new Map(
      alumnos.map((a) => [
        a.id,
        { valor: a.valor, estado: a.valor == null ? "PENDIENTE" : "GRADED" },
      ]),
    ),
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Notas guardadas");
      if (form.current) form.current.reset();
    }
  }, [state]);

  const setValor = (studentId: string, valor: number | null) => {
    setNotas((prev) => {
      const next = new Map(prev);
      next.set(studentId, {
        valor,
        estado: valor == null ? "PENDIENTE" : "GRADED",
      });
      return next;
    });
  };

  const parseNota = (texto: string): number | null => {
    const limpio = texto.trim().replace(",", ".");
    if (limpio === "") return null;
    const n = parseFloat(limpio);
    if (Number.isNaN(n) || n < 1 || n > 7) return null;
    return Math.round(n * 10) / 10; // un decimal
  };

  const pegarDesdeExcel = (texto: string) => {
    // Separa por líneas, luego por tab o coma. Cada línea = un alumno en orden.
    const lineas = texto.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
    const ids = Array.from(notas.keys());
    for (let i = 0; i < Math.min(lineas.length, ids.length); i++) {
      const celdas = lineas[i].split(/[\t,]/).filter((c) => c.trim() !== "");
      const valor = parseNota(celdas[0]);
      if (valor !== null) {
        setValor(ids[i], valor);
      }
    }
  };

  const hayCambios = Array.from(notas.values()).some(
    (n) => n.valor != null || n.estado === "GRADED",
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">
          {evaluationName}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ponderación: {weight}%
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => {
            const input = document.createElement("textarea");
            input.style.position = "fixed";
            input.style.opacity = "0";
            document.body.appendChild(input);
            input.value = Array.from(notas.entries())
              .map(([id, n]) => {
                const alumno = alumnos.find((a) => a.id === id);
                return `${alumno?.nombre ?? ""}\t${n.valor ?? ""}`;
              })
              .join("\n");
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            toast.success("Copiado al portapapeles");
          }}
          className="flex-1 rounded-control border border-success bg-success-soft px-3 py-2 text-xs font-semibold text-success"
        >
          Copiar notas
        </button>
        <button
          onClick={() => {
            const texto = prompt(
              "Pega las notas del Excel (una por línea, separadas por tab o coma). Ejemplo:\nJuan Pérez\t5.5\nMaría García\t4,0",
            );
            if (texto) pegarDesdeExcel(texto);
          }}
          className="flex-1 rounded-control border border-primary bg-transparent px-3 py-2 text-xs font-semibold text-primary"
        >
          Pegar desde Excel
        </button>
      </div>

      <form ref={form} action={action} className="space-y-1">
        <input type="hidden" name="evaluationId" value={evaluationId} />
        {alumnos.map((a) => {
          const actual = notas.get(a.id);
          const valorTexto = actual?.valor ?? "";
          return (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 p-2 rounded-control border border-border bg-surface"
            >
              <span className="text-sm font-medium truncate">{a.nombre}</span>
              <div className="flex gap-1">
                <input
                  name="nota"
                  type="text"
                  inputMode="decimal"
                  placeholder="–"
                  value={valorTexto}
                  onChange={(e) => setValor(a.id, parseNota(e.target.value))}
                  className="w-16 rounded-control border px-1.5 py-1.5 text-xs text-center text-foreground"
                />
                {actual?.estado === "GRADED" ? (
                  <span className="text-xs text-muted-foreground">guardada</span>
                ) : null}
              </div>
            </div>
          );
        })}
        {hayCambios ? (
          <SubmitButton
            className="w-full rounded-control border border-primary bg-transparent px-4 py-3 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Guardar notas
          </SubmitButton>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay cambios para guardar.
          </p>
        )}
        {state?.error ? (
          <p className="mt-2 text-sm text-danger">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
