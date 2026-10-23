"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { crearDenunciaPublica, type DenunciaFormState } from "@/app/actions/public-denuncia";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

const TIPOS = [
  { value: "CONDUCTA", label: "Conducta disruptiva" },
  { value: "ACOSO_ESCOLAR", label: "Acoso escolar (entre estudiantes)" },
  { value: "AGRESION", label: "Agresión física o verbal" },
  { value: "MALTRATO_INFANTIL", label: "Sospecha de maltrato infantil" },
  { value: "DISCRIMINACION", label: "Discriminación" },
  { value: "ACOSO_LABORAL", label: "Acoso laboral" },
  { value: "SALUD_MENTAL", label: "Salud mental / riesgo suicida" },
  { value: "OTRO", label: "Otro" },
] as const;

export function DenunciaForm({ schoolId }: { schoolId: string }) {
  const [estado, enviar, pendiente] = useActionState<DenunciaFormState, FormData>(
    crearDenunciaPublica,
    undefined,
  );

  const [tipo, setTipo] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [evidence, setEvidence] = useState("");

  // Para elegir alumnos involucrados (opcional) - se cargarían vía API si se quiere
  // Por simplicidad, usamos un campo de texto para RUTs/nombres
  const [involucrados, setInvolucrados] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("schoolId", schoolId);
    if (involucrados.trim()) {
      // Parsear nombres/RUTs separados por comas
      const nombres = involucrados.split(",").map((n) => n.trim()).filter(Boolean);
      nombres.forEach((n) => fd.append("studentId", n));
    }
    enviar(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="schoolId" value={schoolId} />

      <div className="flex flex-col gap-1">
        <label htmlFor="tipo" className={labelClass}>
          Tipo de situación <span className="text-danger">*</span>
        </label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className={controlClass}
          required
        >
          <option value="">— Selecciona —</option>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="titulo" className={labelClass}>
          Título <span className="text-danger">*</span>
        </label>
        <input
          id="titulo"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Acoso en el patio, agresión en sala de clases..."
          className={controlClass}
          required
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="descripcion" className={labelClass}>
          Descripción detallada <span className="text-danger">*</span>
        </label>
        <textarea
          id="descripcion"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe qué pasó, cuándo, dónde, quiénes estaban presentes, si hay testigos... (mínimo 20 caracteres)"
          className={controlClass + " min-h-[120px] resize-y"}
          required
          minLength={20}
          maxLength={5000}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="involucrados" className={labelClass}>
          Alumnos involucrados (opcional)
        </label>
        <input
          id="involucrados"
          type="text"
          value={involucrados}
          onChange={(e) => setInvolucrados(e.target.value)}
          placeholder="Nombres o RUTs separados por comas (ej: Juan Pérez, 12.345.678-9)"
          className={controlClass}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          Si no sabes los nombres exactos, déjalo en blanco. El equipo de convivencia lo investigará.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="evidencia" className={labelClass}>
          Evidencia o detalles adicionales (opcional)
        </label>
        <textarea
          id="evidencia"
          name="evidence"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Capturas de pantalla, fotos, testigos, conversaciones... (no subas archivos aquí, solo texto)"
          className={controlClass + " min-h-[80px] resize-y"}
          maxLength={2000}
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="entendido"
          required
          className="mt-1 rounded-control border-border"
        />
        <label htmlFor="entendido" className="text-xs text-muted-foreground">
          Entiendo que esta denuncia es anónima y que el colegio tiene la obligación legal de
          investigarla en un plazo máximo de 2 meses (Ley 21.809).
        </label>
      </div>

      <SubmitButton
        className="w-full rounded-control border border-primary bg-transparent px-4 py-2.5 text-sm font-semibold text-primary"
        pendingLabel="Enviando denuncia..."
        disabled={pendiente}
      >
        Enviar denuncia confidencial
      </SubmitButton>

      {estado?.error ? (
        <div className="p-3 rounded-control bg-danger/10 border border-danger/30 text-sm text-danger">
          {estado.error}
        </div>
      ) : null}

      {estado?.ok ? (
        <div className="p-3 rounded-control bg-success/10 border border-success/30 text-sm text-success">
          Denuncia enviada correctamente. El equipo de convivencia la revisará.
          <br />
          <span className="text-xs">Código de seguimiento: {estado.caseId?.slice(0, 8).toUpperCase()}</span>
        </div>
      ) : null}
    </form>
  );
}