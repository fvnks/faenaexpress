import { redirect } from "next/navigation";
import Link from "next/link";

import {
  updateStaffMeetingMinutes,
  addStaffMeetingAttendee,
  addStaffMeetingAttendees,
  createMeetingAgreement,
  markAgreementDone,
} from "@/app/actions/school-appointments";
import { serverAction } from "@/lib/server-action";
import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

type ReunionDetalle = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  place: string | null;
  minutes: string | null;
  createdByName: string | null;
  courseName: string | null;
  asistentes: Array<{
    id: string;
    personId: string | null;
    personName: string;
    personRole: string;
    attended: boolean;
    notes: string | null;
    teacherName: string | null;
  }>;
  acuerdos: Array<{
    id: string;
    content: string;
    responsible: string | null;
    dueDate: Date | null;
    done: boolean;
  }>;
};

type DocenteOpcion = {
  id: string;
  name: string;
};

/** Detalle de una reunión de staff: acta, asistentes y acuerdos. */
export default async function ReunionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSchoolContext("comunicacion");

  const reunion = await db.staffMeeting.findFirst({
    where: { id, schoolId: ctx.school.id },
    include: {
      creator: { select: { name: true } },
      course: { select: { name: true } },
      attendees: {
        orderBy: { personRole: "asc" },
        include: { teacher: { select: { name: true } } },
      },
      agreements: { orderBy: { done: "asc" } },
    },
  });
  if (!reunion) redirect("/colegios/reuniones");

  // Docentes del colegio para el multi-select de asistentes.
  const docentes: DocenteOpcion[] = await db.teacher.findMany({
    where: { schoolId: ctx.school.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // IDs de docentes ya agregados como asistentes (para no duplicar).
  const asistentesIds = new Set(
    reunion.attendees
      .filter((a) => a.personId)
      .map((a) => a.personId),
  );

  const detalle: ReunionDetalle = {
    id: reunion.id,
    type: reunion.type,
    title: reunion.title,
    description: reunion.description,
    startsAt: reunion.startsAt,
    endsAt: reunion.endsAt,
    place: reunion.place,
    minutes: reunion.minutes,
    createdByName: reunion.creator?.name ?? "—",
    courseName: reunion.course?.name ?? null,
    asistentes: reunion.attendees.map((a) => ({
      id: a.id,
      personId: a.personId ?? null,
      personName: a.personName,
      personRole: a.personRole,
      attended: a.attended,
      notes: a.notes,
      teacherName: a.teacher?.name ?? null,
    })),
    acuerdos: reunion.agreements.map((a) => ({
      id: a.id,
      content: a.content,
      responsible: a.responsible,
      dueDate: a.dueDate,
      done: a.done,
    })),
  };

  const guardarActa = serverAction(updateStaffMeetingMinutes);
  const agregarAsistente = serverAction(addStaffMeetingAttendee);
  const agregarAsistentes = serverAction(addStaffMeetingAttendees);
  const agregarAcuerdo = serverAction(createMeetingAgreement);
  const toggleAcuerdo = serverAction(markAgreementDone);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">{detalle.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {detalle.type === "CURSO"
              ? "Reunión de curso"
              : detalle.type === "DEPARTAMENTO"
                ? "Reunión de departamento"
                : detalle.type === "CLAUSTRO"
                  ? "Claustro"
                  : detalle.type === "HOMOTRIA"
                    ? "Homotría / nivel"
                    : "Reunión con apoderados"}
            {detalle.courseName ? ` · ${detalle.courseName}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {detalle.startsAt.toLocaleString("es-CL", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {detalle.endsAt ? ` - ${detalle.endsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : ""}
            {detalle.place ? ` · ${detalle.place}` : ""}
            {detalle.description ? ` · ${detalle.description}` : ""}
          </p>
        </div>
        <Link
          href="/colegios/reuniones"
          className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
        >
          ← Volver a reuniones
        </Link>
      </div>

      {/* Acta */}
      <section className={cardClass + " p-4"}>
        <h2 className="font-semibold">Acta de la reunión</h2>
        <form action={guardarActa} className="mt-2 space-y-2">
          <input type="hidden" name="meetingId" value={detalle.id} />
          <textarea
            name="minutes"
            defaultValue={detalle.minutes ?? ""}
            className={controlClass + " min-h-[120px] resize-y"}
            placeholder="Escribe el acta: acuerdos, responsables, fechas y decisiones tomadas."
          />
          <SubmitButton
            className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Guardar acta
          </SubmitButton>
        </form>
        {detalle.minutes ? (
          <p className="mt-2 text-sm text-muted-foreground">{detalle.minutes}</p>
        ) : null}
      </section>

      {/* Asistentes */}
      <section className={cardClass + " p-4"}>
        <h2 className="font-semibold flex items-center gap-2">
          Asistentes
          <span className="ml-2 text-xs font-normal text-muted-foreground border border-border bg-surface px-2 py-0.5">
            {detalle.asistentes.length}
          </span>
        </h2>

        {/* Agregar varios asistentes a la vez */}
        <form action={agregarAsistentes} className="mt-3 space-y-3 p-3 rounded-control border border-border bg-surface">
          <input type="hidden" name="meetingId" value={detalle.id} />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agregar varios docentes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {docentes.map((d) => {
              const yaAgregado = asistentesIds.has(d.id);
              return (
                <div key={d.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="attendees"
                    value={JSON.stringify({
                      personId: d.id,
                      personName: "",
                      personRole: "TEACHER",
                    })}
                    checked={yaAgregado}
                    disabled={yaAgregado}
                    className="w-4 h-4 text-accent"
                  />
                  <label className="text-sm cursor-pointer select-none">
                    {d.name}
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <SubmitButton
              disabled={docentes.every((d) => asistentesIds.has(d.id))}
              className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-xs font-semibold text-primary"
              pendingLabel="Agregando…"
            >
              Agregar seleccionados
            </SubmitButton>
          </div>
        </form>

        {/* Agregar uno individual */}
        <form action={agregarAsistente} className="mt-3 space-y-2">
          <input type="hidden" name="meetingId" value={detalle.id} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="attendee-docente" className={labelClass}>
                Docente (opcional)
              </label>
              <select
                id="attendee-docente"
                name="personId"
                className={controlClass}
              >
                <option value="">— Sin docente vinculado —</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="attendee-nombre" className={labelClass}>
                Nombre (si no es docente)
              </label>
              <input
                id="attendee-nombre"
                name="personName"
                className={controlClass}
                placeholder="Nombre completo"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="attendee-rol" className={labelClass}>
                Rol
              </label>
              <select
                id="attendee-rol"
                name="personRole"
                className={controlClass}
                required
              >
                <option value="DIRECTOR">Dirección</option>
                <option value="UTP">Jefatura de estudios</option>
                <option value="TEACHER">Docente</option>
                <option value="STAFF">Funcionario</option>
                <option value="VIEWER">Solo lectura</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}> </label>
              <SubmitButton
                className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
                pendingLabel="Agregando…"
              >
                Agregar
              </SubmitButton>
            </div>
          </div>
        </form>

        {detalle.asistentes.length > 0 ? (
          <ul className="mt-2 divide-y divide-border">
            {detalle.asistentes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm">
                  {a.teacherName ?? a.personName ?? a.personId ?? "Sin nombre"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.personRole}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    a.attended ? "bg-success-soft text-success" : "bg-background text-muted-foreground"
                  }`}
                >
                  {a.attended ? "Asistió" : "No asistió"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay asistentes registrados todavía.
          </p>
        )}
      </section>

      {/* Acuerdos */}
      <section className={cardClass + " p-4"}>
        <h2 className="font-semibold flex items-center gap-2">
          Acuerdos
          <span className="ml-2 text-xs font-normal text-muted-foreground border border-border bg-surface px-2 py-0.5">
            {detalle.acuerdos.length}
          </span>
        </h2>
        <form action={agregarAcuerdo} className="mt-2 space-y-2">
          <input type="hidden" name="meetingId" value={detalle.id} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="agreement-content" className={labelClass}>
                Acuerdo
              </label>
              <input
                id="agreement-content"
                name="content"
                className={controlClass}
                required
                placeholder="Ej: Revisar plan de mejoras antes del viernes"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="agreement-responsible" className={labelClass}>
                Responsable
              </label>
              <input
                id="agreement-responsible"
                name="responsible"
                className={controlClass}
                placeholder="Quién se hace cargo"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="agreement-due" className={labelClass}>
                Vencimiento
              </label>
              <input
                id="agreement-due"
                name="dueDate"
                type="date"
                className={controlClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}> </label>
              <SubmitButton
                className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
                pendingLabel="Guardando…"
              >
                Agregar acuerdo
              </SubmitButton>
            </div>
          </div>
        </form>
        {detalle.acuerdos.length > 0 ? (
          <ul className="mt-2 divide-y divide-border">
            {detalle.acuerdos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{a.content}</p>
                  {a.responsible ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Responsable: {a.responsible}
                    </p>
                  ) : null}
                  {a.dueDate ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Vence: {a.dueDate.toLocaleDateString("es-CL")}
                    </p>
                  ) : null}
                </div>
                <form action={toggleAcuerdo} className="flex items-center gap-2">
                  <input type="hidden" name="agreementId" value={a.id} />
                  <input
                    type="hidden"
                    name="done"
                    value={a.done ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className={`text-xs font-medium underline underline-offset-2 ${
                      a.done
                        ? "text-muted-foreground"
                        : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {a.done ? "Deshacer" : "Marcar hecho"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay acuerdos registrados todavía.
          </p>
        )}
      </section>
    </div>
  );
}
