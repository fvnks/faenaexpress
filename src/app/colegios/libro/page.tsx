import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { db } from "@/lib/db";
import { cardClass } from "@/lib/ui";

// La pantalla de exportación: de aquí baja el colegio el archivo que entrega al
// MINEDUC. La norma exige que el software tenga «una sección que permita
// descargar la información de los libros de clases digitales de su
// establecimiento».
export default async function LibroPage() {
  const ctx = await requireSchoolContext("libro");
  const schoolId = ctx.school.id;

  const [sesiones, alumnos, ultimoRegistro] = await Promise.all([
    db.classSession.count({ where: { schoolId } }),
    db.student.count({ where: { schoolId } }),
    db.classSession.findFirst({
      where: { schoolId },
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true, recordedById: true },
    }),
  ]);

  const puedeExportar = schoolCanWrite(ctx, "libro");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Libro de clases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El registro del colegio en el formato que pide la Circular N°30. Lo descargas y lo
          entregas al MINEDUC cuando te fiscalicen.
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Lo que hay registrado</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          <li>
            <p className="text-xs text-muted-foreground">Clases dictadas</p>
            <p className="tabular mt-1 text-2xl font-semibold">{sesiones}</p>
          </li>
          <li>
            <p className="text-xs text-muted-foreground">Alumnos</p>
            <p className="tabular mt-1 text-2xl font-semibold">{alumnos}</p>
          </li>
          <li>
            <p className="text-xs text-muted-foreground">Último registro</p>
            <p className="mt-1 text-sm font-medium">
              {ultimoRegistro
                ? ultimoRegistro.recordedAt.toLocaleString("es-CL")
                : "sin registro"}
            </p>
          </li>
        </ul>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Descargar</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          El archivo viene en el formato que el contenedor del MINEDUC procesa. Después de
          descargarlo, se valida con los comandos que están en la documentación.
        </p>
        <div className="mt-4">
          {puedeExportar ? (
            <a
              href="/colegios/libro/export"
              className="inline-block rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
            >
              Descargar libro de clases (zip)
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tu rol puede ver el libro, pero no descargarlo.
            </p>
          )}
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Qué falta para la fiscalización</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="text-foreground">Calificaciones y actas</span> (vienen en la C3) y
            Assessments con sus ponderaciones.
          </li>
          <li>
            <span className="text-foreground">Registro de convivencia</span> (C6): anotaciones
            positivas, negativas y observaciones, con su trazabilidad.
          </li>
          <li>
            <span className="text-foreground">Libro PIE</span>: Planes de apoyo de los NEEP/NEET.
          </li>
          <li>
            <span className="text-foreground">Firma con el verificador de identidad</span>: el
            docente valida cada registro con su código dinámico y queda en{" "}
            <code>firmaRatificador</code>.
          </li>
          <li>
            <span className="text-foreground">Calendario escolar</span>: la Circular N°30 exige que
            el registro esté al día durante todo el año, no el día de la visita.
          </li>
        </ul>
      </section>
    </div>
  );
}
