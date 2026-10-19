import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const ctx = await requireContext("rrhh");
  const { id, docId } = await params;

  const doc = await db.workerDocument.findFirst({
    where: { id: docId, workerId: id, companyId: ctx.company.id },
    select: { fileName: true, mimeType: true, fileData: true },
  });
  if (!doc) {
    return new Response("No encontrado", { status: 404 });
  }

  const body = Buffer.from(doc.fileData);
  return new Response(body, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
