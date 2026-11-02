import React from "react";

import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { createStaffMeeting, listStaffMeetings } from "@/app/actions/school-appointments";
import { serverAction } from "@/lib/server-action";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

const TIPOS_REUNION = [
  { value: "CURSO", label: "Reunión de curso" },
  { value: "DEPARTAMENTO", label: "Reunión de departamento" },
  { value: "CLAUSTRO", label: "Claustro" },
  { value: "HOMOTRIA", label: "Homotría / nivel" },
  { value: "APODERADOS", label: "Reunión con apoderados" },
] as const;

type TipoReunion = (typeof TIPOS_REUNION)[number]["value"];

/** Reuniones de staff del colegio: crear y listar. */
export default async function ReunionesPage() {
  const ctx = await requireSchoolContext("reuniones");

  const { reuniones, error } = await listStaffMeetings();
  const cursos = await db.course.findMany({
    where: { schoolId: ctx.school.id, active: true },
    orderBy: [{ year: "asc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  if (error) {
    return (
      <div className={cardClass + " p-6"}>
        <h1 className="text-lg font-bold">Reuniones de equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const crear = serverAction(createStaffMeeting);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Reuniones de equipo</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Reuniones de curso, departamento, claustro y homotría con su acta
            y acuerdos.
          </p>
        </div>
        <NuevaReunionForm cursos={cursos} action={crear} />
      </div>

      {/* Filtros */}
      <div className={cardClass + " p-3 flex flex-wrap items-end gap-2 border-b border-border"}>
        <label htmlFor="filtro-tipo" className={labelClass}>
          Tipo
        </label>
        <select
          id="filtro-tipo"
          className={controlClass + " w-auto"}
          defaultValue=""
        >
          <option value="">Todos los tipos</option>
          {TIPOS_REUNION.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {reuniones.length === 0 ? (
        <div className={cardClass + " p-6 text-center"}>
          <p className="text-sm text-muted-foreground">
            No hay reuniones creadas todavía.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {reuniones.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium border border-border bg-surface text-muted-foreground"
                    >
                      {r.type === "CURSO"
                        ? "Curso"
                        : r.type === "DEPARTAMENTO"
                          ? "Departamento"
                          : r.type === "CLAUSTRO"
                            ? "Claustro"
                            : r.type === "HOMOTRIA"
                              ? "Homotría"
                              : "Apoderados"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.startsAt.toLocaleString("es-CL", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {r.endsAt ? ` - ${r.endsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    {r.place ? ` · ${r.place}` : ""}
                    {r.courseName ? ` · ${r.courseName}` : ""}
                  </p>
                  {r.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Creada por {r.createdByName ?? "—"} ·
                    {r.asistentes} asistente{r.asistentes !== 1 ? "s" : ""} ·
                    {r.acuerdos} acuerdo{r.acuerdos !== 1 ? "s" : ""}
                  </p>
                </div>
                <a
                  href={`/colegios/reuniones/${r.id}`}
                  className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Ver acta
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Formulario para crear una nueva reunión de staff. */
function NuevaReunionForm({
  cursos,
  action,
}: {
  cursos: Array<{ id: string; name: string; year: number }>;
  action: (formData: FormData) => Promise<void>;
}) {
  const [tipo, setTipo] = React.useState<TipoReunion>("CURSO");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [place, setPlace] = React.useState("");

  return (
    <form action={action} className={cardClass + " p-4 space-y-3"}>
      <input
        type="hidden"
        name="type"
        defaultValue="CURSO"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="reunion-tipo" className={labelClass}>
            Tipo
          </label>
          <select
            id="reunion-tipo"
            name="type"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoReunion)}
            className={controlClass}
          >
            {TIPOS_REUNION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reunion-title" className={labelClass}>
            Título
          </label>
          <input
            id="reunion-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={controlClass}
            required
            placeholder="Ej: Reunión de departamento de Matemáticas"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reunion-description" className={labelClass}>
          Descripción
        </label>
        <textarea
          id="reunion-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={controlClass + " min-h-[80px] resize-y"}
          placeholder="Objetivo de la reunión..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="reunion-course" className={labelClass}>
            Curso (opcional)
          </label>
          <select
            id="reunion-course"
            name="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className={controlClass}
          >
            <option value="">— Sin curso específico —</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.year}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="reunion-starts" className={labelClass}>
              Inicio
            </label>
            <input
              id="reunion-starts"
              name="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={controlClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reunion-ends" className={labelClass}>
              Fin (opcional)
            </label>
            <input
              id="reunion-ends"
              name="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={controlClass}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reunion-place" className={labelClass}>
          Lugar (opcional)
        </label>
        <input
          id="reunion-place"
          name="place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className={controlClass}
          placeholder="Sala de profesores, oficina, virtual..."
        />
      </div>

      <SubmitButton
        className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
        pendingLabel="Creando..."
      >
        Crear reunión
      </SubmitButton>
    </form>
  );
}
