import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";
import { CalendarManager } from "@/app/colegios/calendario/calendar-manager";

/**
 * Gestión del calendario escolar: feriados, vacaciones, días no lectivos.
 *
 * La Circular N°30 exige que el registro esté al día durante todo el año,
 * no el día de la visita. El MINEDUC valida que el archivo EDE incluya
 * cada día del año escolar con su tipo (feriado, vacaciones, no lectivo).
 */
export default async function CalendarioPage() {
  const ctx = await requireSchoolContext("administracion");
  const puedeEditar = schoolCanWrite(ctx, "administracion");

  const eventos = await db.schoolCalendarEvent.findMany({
    where: { schoolId: ctx.school.id },
    orderBy: { date: "asc" },
  });

  const eventosUI = eventos.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    type: e.type,
    name: e.name,
    description: e.description,
    isNonInstructional: e.isNonInstructional,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendario escolar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Feriados, vacaciones y días no lectivos. Estos días se exportan al EDE y afectan
          el cómputo del 85% de asistencia (los no lectivos no cuentan).
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <CalendarManager
          schoolId={ctx.school.id}
          eventos={eventosUI}
          puedeEditar={puedeEditar}
        />
      </section>
    </div>
  );
}