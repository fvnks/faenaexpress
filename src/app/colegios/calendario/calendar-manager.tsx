"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventFormState,
} from "@/app/actions/school-calendar";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

const TIPOS: { value: string; label: string; color: string }[] = [
  { value: "HOLIDAY", label: "Feriado", color: "bg-red-100 text-red-800" },
  { value: "VACATION", label: "Vacaciones", color: "bg-blue-100 text-blue-800" },
  { value: "NON_INSTRUCTIONAL", label: "No lectivo", color: "bg-amber-100 text-amber-800" },
  { value: "EARLY_DISMISSAL", label: "Salida anticipada", color: "bg-purple-100 text-purple-800" },
  { value: "MAKEUP_DAY", label: "Recuperación", color: "bg-green-100 text-green-800" },
  { value: "OTHER", label: "Otro", color: "bg-gray-100 text-gray-800" },
];

type Evento = {
  id: string;
  date: string;
  type: string;
  name: string;
  description: string | null;
  isNonInstructional: boolean;
};

export function CalendarManager({
  schoolId,
  eventos,
  puedeEditar,
}: {
  schoolId: string;
  eventos: Evento[];
  puedeEditar: boolean;
}) {
  const [crear, formActionCrear, pendienteCrear] = useActionState<CalendarEventFormState, FormData>(
    createCalendarEvent,
    undefined,
  );
  const [editar, formActionEditar, pendienteEditar] = useActionState<CalendarEventFormState, FormData>(
    updateCalendarEvent,
    undefined,
  );
  const [eliminar, formActionEliminar, pendienteEliminar] = useActionState<CalendarEventFormState, FormData>(
    deleteCalendarEvent,
    undefined,
  );

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    type: "HOLIDAY",
    name: "",
    description: "",
    isNonInstructional: true,
  });

  useEffect(() => {
    if (crear?.ok) {
      toast.success("Evento creado");
      setFormData({ date: "", type: "HOLIDAY", name: "", description: "", isNonInstructional: true });
    }
    if (crear?.error) toast.error(crear.error);
  }, [crear]);

  useEffect(() => {
    if (editar?.ok) {
      toast.success("Evento actualizado");
      setEditandoId(null);
    }
    if (editar?.error) toast.error(editar.error);
  }, [editar]);

  useEffect(() => {
    if (eliminar?.ok) toast.success("Evento eliminado");
    if (eliminar?.error) toast.error(eliminar.error);
  }, [eliminar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const iniciarEdicion = (ev: Evento) => {
    setEditandoId(ev.id);
    setFormData({
      date: ev.date.slice(0, 10),
      type: ev.type,
      name: ev.name,
      description: ev.description ?? "",
      isNonInstructional: ev.isNonInstructional,
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormData({ date: "", type: "HOLIDAY", name: "", description: "", isNonInstructional: true });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Formulario crear/editar */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">{editandoId ? "Editar evento" : "Nuevo evento"}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Los días no lectivos (feriados, vacaciones, consejos de curso) no cuentan para el 85%
          de asistencia. Se exportan al EDE para la fiscalización.
        </p>

        <form action={editandoId ? formActionEditar : formActionCrear} className="mt-4 flex flex-col gap-3">
          {editandoId && <input type="hidden" name="id" value={editandoId} />}
          <input type="hidden" name="schoolId" value={schoolId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="fecha" className={labelClass}>
                Fecha
              </label>
              <input
                id="fecha"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                className={controlClass}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tipo" className={labelClass}>
                Tipo
              </label>
              <select
                id="tipo"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={controlClass}
                required
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="nombre"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Feriado Nacional, Vacaciones de Invierno, Consejo de Curso..."
              className={controlClass}
              required
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="descripcion" className={labelClass}>
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detalle adicional..."
              className={controlClass + " min-h-[60px] resize-y"}
              maxLength={500}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="noLectivo"
              name="isNonInstructional"
              type="checkbox"
              checked={formData.isNonInstructional}
              onChange={handleChange}
              className="rounded-control border-border"
            />
            <label htmlFor="noLectivo" className="text-sm">
              Día no lectivo (no cuenta para el 85% de asistencia)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton
              className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
              pendingLabel={editandoId ? "Actualizando..." : "Creando..."}
            >
              {editandoId ? "Actualizar" : "Crear evento"}
            </SubmitButton>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="rounded-control border border-border px-4 py-2 text-sm hover:bg-background"
              >
                Cancelar
              </button>
            )}
            {(crear?.error || editar?.error) && (
              <p className="text-xs text-danger">{crear?.error || editar?.error}</p>
            )}
          </div>
        </form>
      </section>

      {/* Lista de eventos */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Eventos registrados ({eventos.length})</h2>

        {eventos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No hay eventos. Agrega feriados, vacaciones y días no lectivos del año escolar.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {eventos.map((ev) => {
              const tipo = TIPOS.find((t) => t.value === ev.type) ?? TIPOS[TIPOS.length - 1];
              return (
                <li key={ev.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipo.color}`}
                      >
                        {tipo.label}
                      </span>
                      <span className="text-sm font-medium">{ev.name}</span>
                      {ev.isNonInstructional && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-muted-foreground bg-muted">
                          No lectivo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(ev.date).toLocaleDateString("es-CL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {ev.description ? ` · ${ev.description}` : ""}
                    </p>
                  </div>

                  {puedeEditar ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(ev)}
                        className="rounded-control border border-border px-2.5 py-1 text-xs hover:bg-background"
                      >
                        Editar
                      </button>
                      <form action={formActionEliminar}>
                        <input type="hidden" name="id" value={ev.id} />
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <button
                          type="submit"
                          className="rounded-control border border-danger/50 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                          disabled={pendienteEliminar}
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}