import { db } from "@/lib/db";
import { requireObraContext } from "@/lib/obra-auth";

/** Descarga el archivo de un documento de la obra; el aislamiento es por obra. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireObraContext("documentos");
  const { id } = await params;

  const doc = await db.documentoObra.findFirst({
    where: { id, obraId: ctx.obra.id },
    select: { fileName: true, mimeType: true, fileData: true },
  });
  if (!doc?.fileData || !doc.fileName) return new Response("Sin archivo", { status: 404 });

  const nombre = doc.fileName.replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
