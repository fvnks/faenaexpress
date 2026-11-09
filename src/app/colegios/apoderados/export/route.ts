import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { db } from "@/lib/db";

/**
 * Exporta la lista de apoderados del colegio a CSV.
 *
 * Incluye: nombre, RUT, correo, teléfono, tipo de apoderado, alumnos vinculados,
 * código de acceso vigente, cuándo se emitió el código y último acceso al portal.
 *
 * Todo está filtrado por el colegio del contexto: solo los apoderados de este
 * colegio se exportan, nunca los de otro.
 */
export async function GET() {
  const ctx = await requireSchoolContext("apoderados");
  if (!schoolCanWrite(ctx, "apoderados")) {
    return new Response("Tu rol no puede exportar apoderados.", { status: 403 });
  }

  const apoderados = await db.guardian.findMany({
    where: { schoolId: ctx.school.id },
    orderBy: { name: "asc" },
    include: {
      guardianships: {
        orderBy: { createdAt: "asc" },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  // Construir el CSV línea por línea.
  const filas: string[] = [];

  // Encabezado
  filas.push(
    "Nombre,RUT,Correo,Teléfono,Tipo,Alumnos vinculados,Código de acceso,Código emitido,Último acceso"
  );

  for (const apoderado of apoderados) {
    const tipos = [
      ...new Set(apoderado.guardianships.map((g) => g.type)),
    ].join(" / ");
    const alumnos = apoderado.guardianships
      .map((g) => `${g.student.firstName} ${g.student.lastName}`)
      .join("; ");
    const codigo = apoderado.accessCode ?? "";
    const fechaEmision = apoderado.accessCodeCreatedAt
      ? new Date(apoderado.accessCodeCreatedAt).toISOString().slice(0, 10)
      : "";
    const ultimoAcceso = apoderado.lastAccessAt
      ? new Date(apoderado.lastAccessAt).toISOString().slice(0, 10)
      : "";

    // Escapar comillas y comas para CSV válido.
    const escapar = (valor: string) => {
      const comillas = valor.includes('"');
      const comas = valor.includes(",");
      const saltos = valor.includes("\n") || valor.includes("\r");
      if (comillas || comas || saltos) {
        return `"${valor.replace(/"/g, '""')}"`;
      }
      return valor;
    };

    filas.push(
      [
        escapar(apoderado.name),
        escapar(apoderado.rut ?? ""),
        escapar(apoderado.email ?? ""),
        escapar(apoderado.phone ?? ""),
        escapar(tipos),
        escapar(alumnos),
        escapar(codigo),
        escapar(fechaEmision),
        escapar(ultimoAcceso),
      ].join(",")
    );
  }

  const slug = ctx.school.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const csv = filas.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="apoderados-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
