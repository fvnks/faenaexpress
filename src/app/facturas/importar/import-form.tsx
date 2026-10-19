"use client";

import { useActionState } from "react";

import { importFile, type ImportState } from "@/app/actions/import";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(importFile, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className={`${fieldClass} max-w-md`}>
        <label htmlFor="import-kind" className={labelClass}>
          ¿Qué quieres importar?
        </label>
        <SelectDropdown
          id="import-kind"
          name="kind"
          value="purchases"
          allowEmpty={false}
          options={[
            { value: "purchases", label: "Compras" },
            { value: "sales", label: "Ventas" },
            { value: "expenses", label: "Gastos" },
          ]}
        />
      </div>

      <div className={`${fieldClass} max-w-md`}>
        <label htmlFor="import-file" className={labelClass}>
          Archivo Excel (.xlsx) o CSV
        </label>
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".xlsx,.csv,text/csv"
          required
          className={controlClass}
        />
        <span className="text-xs text-muted-foreground">
          La primera fila debe tener los encabezados. Descarga una plantilla más abajo.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Importando…">
          Importar
        </SubmitButton>
        {state?.status === "error" ? <span className="text-sm text-danger">{state.message}</span> : null}
      </div>

      {state?.status === "done" ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className={state.imported > 0 ? "text-success" : "text-danger"}>
            {state.imported > 0
              ? `Se importaron ${state.imported} registro(s).`
              : "No se importó ningún registro."}
          </p>
          {state.errors.length > 0 ? (
            <details className="rounded-control border border-border bg-surface px-3 py-2">
              <summary className="cursor-pointer text-danger">
                {state.errors.length} fila(s) con problemas
              </summary>
              <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
                {state.errors.map((error) => (
                  <li key={`${error.row}-${error.message}`}>
                    {error.row > 0 ? `Fila ${error.row}: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
