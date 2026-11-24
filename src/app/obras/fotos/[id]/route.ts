import { requireObraContext } from "@/lib/obra-auth";
import { db } from "@/lib/db";

/** Sirve una foto de cubicación de una obra a la que el usuario tiene acceso. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireObraContext("avance");
  const { id } = await params;

  const foto = await db.fotoCubicacion.findFirst({
    where: { id, cubicacion: { partida: { obraId: ctx.obra.id } } },
    select: { fileName: true, mimeType: true, fileData: true },
  });
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.fileData), {
    headers: {
      "Content-Type": foto.mimeType,
      "Content-Disposition": `inline; filename="${foto.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
