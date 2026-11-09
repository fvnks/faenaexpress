import { db } from "@/lib/db";
import { apoderadoActual } from "@/lib/school-portal";

/**
 * Descarga de un documento del expediente del alumno desde el portal del apoderado.
 *
 * Verifica que quien lo pide tenga sesión de apoderado válida y que el
 * documento pertenezca a uno de sus hijos vinculados.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const sesion = await apoderadoActual();
  if (!sesion) {
    return new Response("No autorizado", { status: 401 });
  }

  const { docId } = await params;

  const doc = await db.studentDocument.findFirst({
    where: {
      id: docId,
      student: {
        guardianships: { some: { guardianId: sesion.guardian.id } },
      },
    },
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
