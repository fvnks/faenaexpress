import { requireSchoolContext } from "@/lib/school-auth";
import { db } from "@/lib/db";

// Descarga de un documento del expediente del alumno.
//
// El archivo está en la base; acá se comprueba que quien lo pide tenga
//.session del colegio y que el documento sea de ese alumno.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const ctx = await requireSchoolContext("estudiantes");
  const { id, docId } = await params;

  const doc = await db.studentDocument.findFirst({
    where: { id: docId, studentId: id, schoolId: ctx.school.id },
    select: { fileName: true, mimeType: true, fileData: true },
  });
  if (!doc) {
    return new Response("No encontrado", { status: 404 });
  }

  const body = Buffer.from(doc.fileData);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
