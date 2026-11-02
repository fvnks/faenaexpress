"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { uploadEvidence, type ConvivenciaFormState } from "@/app/actions/school-convivencia";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

/** Subir evidencia (archivo) vinculada a una evaluación o caso de convivencia. */
export default function SubirEvidenciaPage() {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    uploadEvidence,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const [evaluationId, setEvaluationId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("OTRO");
  const [file, setFile] = useState<File | null>(null);

  const TIPOS_DOCUMENTO = [
    { value: "CERTIFICADO_NACIMIENTO", label: "Certificado de nacimiento" },
    { value: "CERTIFICADO_ESTUDIOS", label: "Certificado de estudios" },
    { value: "FICHA_MEDICA", label: "Ficha médica" },
    { value: "CUSTODIA", label: "Custodia" },
    { value: "OTRO", label: "Otro" },
  ];

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Documento subido");
    if (panel.current) panel.current.open = false;
    if (form.current) form.current.reset();
    setTimeout(() => {
      setEvaluationId("");
      setCaseId("");
      setTitle("");
      setDescription("");
      setType("OTRO");
      setFile(null);
    }, 0);
  }, [state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFile(file);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Subir evidencia</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Adjunta un documento como evidencia para una evaluación o caso de
          convivencia.
        </p>
      </div>

      <div className={cardClass + " p-5"}>
        <form ref={form} action={action} className="mt-4 space-y-4">
          <input type="hidden" name="file" />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={controlClass}>
              <label htmlFor="evaluationId" className={labelClass}>
                Evaluación (opcional)
              </label>
              <input
                id="evaluationId"
                name="evaluationId"
                type="text"
                value={evaluationId}
                onChange={(e) => setEvaluationId(e.target.value)}
                className={controlClass}
                placeholder="ID de la evaluación"
              />
            </div>
            <div className={controlClass}>
              <label htmlFor="caseId" className={labelClass}>
                Caso de convivencia (opcional)
              </label>
              <input
                id="caseId"
                name="caseId"
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className={controlClass}
                placeholder="ID del caso"
              />
            </div>
          </div>

          <div className={controlClass}>
            <label htmlFor="title" className={labelClass}>
              Título
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={controlClass}
              placeholder="Ej: Prueba de matemáticas - Juan Pérez"
            />
          </div>

          <div className={controlClass}>
            <label htmlFor="description" className={labelClass}>
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={controlClass}
              placeholder="Descripción opcional del documento"
            />
          </div>

          <div className={controlClass}>
            <label htmlFor="type" className={labelClass}>
              Tipo de documento
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={controlClass}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className={controlClass}>
            <label htmlFor="file" className={labelClass}>
              Archivo
            </label>
            <input
              id="file"
              name="file"
              type="file"
              onChange={handleFileChange}
              className={controlClass}
              required
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {state?.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <SubmitButton
              className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
              pendingLabel="Subiendo..."
              disabled={!file}
            >
              Subir evidencia
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
