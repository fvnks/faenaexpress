"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { toggleSubjectPromotion, type GradesFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";

/**
 * Una asignatura del plan de estudios.
 *
 * Además de existir, se ve: sin esta lista, crear una asignatura no pasaba
 * por ningún lado y parecía que el botón no hacía nada.
 *
 * El botón de "incide en el promedio" (Art. 7 del Decreto 67/2018) está acá
 * porque es el único lugar donde se decide: Religión, Consejo de Curso y
 * Orientación no entran al promedio final.
 */
export function SubjectRow({
  subjectId,
  code,
  name,
  incide,
}: {
  subjectId: string;
  code: string;
  name: string;
  incide: boolean;
}) {
  const [state, action] = useActionState<GradesFormState, FormData>(
    toggleSubjectPromotion,
    undefined,
  );

  useEffect(() => {
    if (!state?.ok) return;
    toast.success(incide ? "Ya no incide en el promedio" : "Ahora incide en el promedio");
  }, [state, incide]);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {code} · {incide ? "incide en el promedio" : "no incide en el promedio"}
        </p>
      </div>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="subjectId" value={subjectId} />
        {/* La acción lee "on" como "true": si ahora incide, no se manda el campo
            y queda en false; si no incide, se manda y queda en true. */}
        {incide ? null : <input type="hidden" name="countsForPromotion" value="on" />}
        <SubmitButton
          className="rounded-control border border-border bg-transparent px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
          pendingLabel="Guardando..."
        >
          {incide ? "Quitar del promedio" : "Hacer que incida"}
        </SubmitButton>
      </form>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
    </li>
  );
}
